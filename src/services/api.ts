import {
  LogEntry,
  Communication,
  CommunicationStatus,
  Acta,
  CostActa,
  WorkActa,
  ContractItem,
  ControlPoint,
  ProjectTask,
  ContractModification,
  ModificationType,
  ProjectDetails,
  Report,
  Drawing,
  WeeklyReport,
  User,
  AppRole,
  AppSettings,
  PhotoEntry,
  Comment,
  Attachment,
  Commitment,
  Notification,
  ContractorProgressSnapshot,
  ContractorProgressRow,
  ContractorProgressTotals,
} from "../../types";
import { handleApiError, ApiError } from "../utils/error-handling";
import { offlineQueue } from "./offline/queue";
import { offlineDB } from "./offline/db";

const apiUrlFromVite =
  typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_URL
    ? ((import.meta as any).env.VITE_API_URL as string)
    : undefined;

export const API_URL =
  apiUrlFromVite ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:4001/api";

export const API_BASE_URL = API_URL.replace(/\/+$/, "").replace(/\/api$/, "");

let isRefreshing = false;
let failedQueue: { resolve: Function; reject: Function }[] = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

type ParsedErrorResponse = {
  error?: string;
  message?: string;
  details?: any;
  code?: string;
};

const NON_REFRESHABLE_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

const REFRESHABLE_ERROR_CODES = new Set([
  "TOKEN_EXPIRED",
  "INVALID_ACCESS_TOKEN",
  "NO_ACCESS_TOKEN",
  "INVALID_AUTH_HEADER",
  "TOKEN_VERSION_INVALID",
]);

// Helper para determinar el tipo de entidad desde el endpoint
function getEntityTypeFromEndpoint(endpoint: string): 'logEntry' | 'communication' | 'acta' | 'report' | 'comment' | 'attachment' {
  if (endpoint.includes('/log-entries')) return 'logEntry';
  if (endpoint.includes('/communications')) return 'communication';
  if (endpoint.includes('/actas')) return 'acta';
  if (endpoint.includes('/reports')) return 'report';
  if (endpoint.includes('/comments')) return 'comment';
  if (endpoint.includes('/attachments')) return 'attachment';
  return 'logEntry'; // default
}

const parseErrorResponse = async (
  response: Response
): Promise<ParsedErrorResponse> => {
  try {
    const rawBody = await response.text();
    if (!rawBody) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === "object") {
        return parsed as ParsedErrorResponse;
      }
      return { error: rawBody };
    } catch {
      return { error: rawBody };
    }
  } catch (parseError) {
    console.error("Error al leer la respuesta de error:", parseError);
    return {};
  }
};

const shouldAttemptTokenRefresh = (
  endpoint: string,
  errorData: ParsedErrorResponse,
  retryOn401: boolean
) => {
  if (!retryOn401) return false;

  if (NON_REFRESHABLE_ENDPOINTS.some((path) => endpoint.startsWith(path))) {
    return false;
  }

  const code = errorData?.code;
  if (code) {
    return REFRESHABLE_ERROR_CODES.has(code);
  }

  const message = (errorData?.error || errorData?.message || "").toLowerCase();
  return message.includes("token");
};

// Función helper para refrescar el token proactivamente antes de operaciones críticas
async function ensureFreshToken(): Promise<void> {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    return; // No hay token, el refresh normal lo manejará
  }

  try {
    // Decodificar el token para verificar cuánto tiempo le queda
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convertir a milisegundos
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Si el token expira en menos de 5 minutos, refrescarlo proactivamente
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log("Token expirando pronto, refrescando proactivamente...");
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      
      if (refreshResponse.ok) {
        const { accessToken: newAccessToken } = await refreshResponse.json();
        localStorage.setItem("accessToken", newAccessToken);
        console.log("Token refrescado proactivamente");
      }
    }
  } catch (error) {
    // Si hay error al verificar/refrescar, continuar con la petición normal
    // El sistema de refresh automático lo manejará
    console.warn("Error al verificar/refrescar token proactivamente:", error);
  }
}

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  retryOn401 = true
) {
  // Refrescar token proactivamente antes de operaciones críticas (POST, PUT, DELETE)
  const isCriticalOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || '');
  if (isCriticalOperation && !endpoint.includes('/auth/')) {
    await ensureFreshToken();
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers as Record<string, string>);
    }
  }

  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const method =
    typeof options.method === "string"
      ? options.method.toUpperCase()
      : "GET";
  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  
  // Agregar token CSRF para peticiones mutantes
  if (isMutatingMethod && typeof document !== "undefined") {
    // Obtener token CSRF de la cookie
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];
    
    // También intentar obtener del header X-CSRF-Token si está disponible
    const csrfFromHeader = typeof window !== "undefined" 
      ? (window as any).__CSRF_TOKEN__ 
      : null;
    
    const tokenToUse = csrfToken || csrfFromHeader;
    
    if (tokenToUse) {
      headers["X-XSRF-TOKEN"] = decodeURIComponent(tokenToUse);
    }
  }
  if (
    isMutatingMethod &&
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined"
  ) {
    const storedRole = localStorage.getItem("appRole");
    // Permitir que un viewer cambie su contraseña; bloquear el resto de mutaciones
    const allowListForViewer = ["/auth/change-password"];
    const isAllowedForViewer = allowListForViewer.some((path) =>
      endpoint.startsWith(path)
    );

    if (storedRole === "viewer" && !isAllowedForViewer) {
      throw handleApiError({
        statusCode: 403,
        message: "El rol Viewer solo puede consultar información.",
        code: "VIEWER_READ_ONLY",
      });
    }
  }

  const fetchUrl = `${API_URL}${endpoint}`;

  // Detectar si estamos offline
  const isOffline = !navigator.onLine;
  
  // Si está offline y es una petición GET, intentar obtener del cache
  if (isOffline && method === "GET") {
    try {
      const cached = await offlineDB.getCachedData(`api_${endpoint}`);
      if (cached) {
        console.log("[Offline] Returning cached data for:", endpoint);
        return cached;
      }
      // Si no hay cache, lanzar error controlado
      throw handleApiError({
        statusCode: 503,
        message: "Sin conexión y no hay datos en cache para esta petición.",
        code: "OFFLINE_NO_CACHE",
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.warn("[Offline] Error getting cached data:", error);
      throw handleApiError({
        statusCode: 503,
        message: "Sin conexión y error al acceder al cache.",
        code: "OFFLINE_CACHE_ERROR",
      });
    }
  }
  
  // Si está offline y es una operación mutante, encolar
  if (isOffline && isMutatingMethod) {

    // Para operaciones mutantes offline, encolar la operación
    try {
      const entityType = getEntityTypeFromEndpoint(endpoint);
      let requestData = undefined;
      if (options.body) {
        if (options.body instanceof FormData) {
          requestData = options.body;
        } else {
          try {
            requestData = JSON.parse(options.body as string);
          } catch {
            requestData = options.body;
          }
        }
      }
      const operation = await offlineQueue.queueRequest({
        endpoint,
        method,
        data: requestData,
        entityType,
      });

      // Retornar una respuesta simulada con el ID de la operación
      return {
        id: operation.id,
        offline: true,
        message: "Operación encolada para sincronización cuando vuelva la conexión",
        operationId: operation.id,
      };
    } catch (error) {
      console.error("[Offline] Error queueing operation:", error);
      throw handleApiError({
        statusCode: 503,
        message: "Sin conexión. La operación se guardará localmente y se sincronizará cuando vuelva la conexión.",
        code: "OFFLINE_QUEUED",
      });
    }
  }

  try {
    const response = await fetch(fetchUrl, {
      ...options,
      headers,
      credentials: "include",
    });

    // Capturar token CSRF del header de respuesta si está disponible
    const csrfTokenFromResponse = response.headers.get("X-CSRF-Token");
    if (csrfTokenFromResponse && typeof window !== "undefined") {
      (window as any).__CSRF_TOKEN__ = csrfTokenFromResponse;
    }

    if (response.status === 401) {
      const errorData = await parseErrorResponse(response);
      const canRetry = shouldAttemptTokenRefresh(endpoint, errorData, retryOn401);

      if (!canRetry) {
        throw handleApiError({
          statusCode: 401,
          message:
            errorData.error ||
            errorData.message ||
            "Error de autenticación. Por favor, inicie sesión nuevamente.",
          details: errorData.details,
          code: errorData.code,
        });
      }

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshResponse.ok) {
            const { accessToken: newAccessToken } = await refreshResponse.json();
            localStorage.setItem("accessToken", newAccessToken);

            if (!options.headers) options.headers = {};
            (options.headers as any)["Authorization"] = `Bearer ${newAccessToken}`;

            isRefreshing = false;
            processQueue();

            return apiFetch(endpoint, options, false);
          } else {
            const refreshErrorData = await parseErrorResponse(refreshResponse);
            isRefreshing = false;
            processQueue(
              new Error(refreshErrorData.error || refreshErrorData.message)
            );
            window.dispatchEvent(new CustomEvent("auth:logout"));
            throw handleApiError({
              statusCode: refreshResponse.status,
              message:
                refreshErrorData.error ||
                refreshErrorData.message ||
                "Sesión expirada. Por favor, inicie sesión nuevamente.",
              details: refreshErrorData.details,
              code: refreshErrorData.code || "SESSION_EXPIRED",
            });
          }
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError);
          window.dispatchEvent(new CustomEvent("auth:logout"));
          throw handleApiError({
            statusCode: 401,
            message:
              "Error de autenticación. Por favor, inicie sesión nuevamente.",
            code: "AUTH_ERROR",
          });
        }
      } else {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiFetch(endpoint, options, retryOn401))
          .catch((err) => {
            throw err;
          });
      }
    }

    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      throw handleApiError({
        statusCode: response.status,
        message:
          errorData.message ||
          errorData.error ||
          `Error HTTP: ${response.status}`,
        details: errorData.details,
        code: errorData.code,
      });
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    let result: any;
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // Cachear respuestas GET exitosas para uso offline (TTL de 5 minutos)
    if (method === "GET" && response.ok && result) {
      try {
        await offlineDB.cacheData(`api_${endpoint}`, result, 5 * 60 * 1000);
      } catch (error) {
        console.warn("[Offline] Error caching response:", error);
      }
    }

    return result;
  } catch (error) {
    console.error(`Error en la petición ${endpoint}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw handleApiError(error);
  }
}

type LoginResponse = {
  accessToken: string;
  user: User;
};

type RegisterResponse = User & {
  verificationEmailSent?: boolean;
};

type ApiMessageResponse = {
  success?: boolean;
  message?: string;
};

// API Functions for Authentication
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (response.accessToken) {
      localStorage.setItem("accessToken", response.accessToken);
    }

    return response;
  },

  register: async (userData: {
    email: string;
    password: string;
    fullName: string;
    projectRole: string;
    appRole: string;
  }): Promise<RegisterResponse> => {
    const response = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
      credentials: "include",
    });
    return response;
  },

  logout: async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  },

  refreshToken: async () => {
    const response = await apiFetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return response;
  },

  verifyEmail: async (token: string): Promise<ApiMessageResponse> => {
    const response = await apiFetch(`/auth/verify-email/${token}`, {
      method: "POST",
    });
    return response;
  },

  forgotPassword: async (
    email: string,
    baseUrl?: string
  ): Promise<ApiMessageResponse> => {
    const response = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email, baseUrl }),
    });
    return response;
  },

  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<ApiMessageResponse> => {
    const response = await apiFetch(`/auth/reset-password/${token}`, {
      method: "POST",
      body: JSON.stringify({ password: newPassword }),
    });
    return response;
  },

  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<ApiMessageResponse> => {
    const response = await apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: "include",
    });
    return response;
  },

  getProfile: async () => {
    const response = await apiFetch("/auth/me", {
      credentials: "include",
    });
    return response;
  },

  updateProfile: async (profileData: {
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }) => {
    const response = await apiFetch("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
      credentials: "include",
    });
    return response;
  },
};

// API Functions for Users
export const usersApi = {
  getAll: async () => {
    return apiFetch("/public/demo-users");
  },
};

export type CatalogItem = {
  id: string;
  category: string;
  name: string;
  isActive: boolean;
};

export const adminApi = {
  // Catalogs
  getCatalog: async (category: string) => {
    return apiFetch(`/catalogs/${category}`);
  },
  createCatalogItem: async (category: string, name: string) => {
    return apiFetch(`/catalogs`, {
      method: "POST",
      body: JSON.stringify({ category, name }),
    });
  },
  deleteCatalogItem: async (id: string) => {
    return apiFetch(`/catalogs/${id}`, {
      method: "DELETE",
    });
  },
  
  getUsers: async () => {
    return apiFetch("/admin/users");
  },
  inviteUser: async (data: {
    fullName: string;
    email: string;
    appRole: AppRole;
    projectRole?: string;
    entity?: string | null;
  }): Promise<{ user: User; temporaryPassword: string }> => {
    return apiFetch("/admin/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateUser: async (
    id: string,
    data: Partial<{
      fullName: string;
      appRole: AppRole;
      status: "active" | "inactive";
      projectRole: string;
      entity: string | null;
      cargo: string | null;
      canDownload: boolean;
    }>
  ): Promise<User> => {
    return apiFetch(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  getAuditLogs: async () => {
    return apiFetch("/admin/audit-logs");
  },
  getSettings: async () => {
    return apiFetch("/admin/settings");
  },
  updateSettings: async (data: Partial<AppSettings>) => {
    return apiFetch("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  getSecurityEvents: async (filters?: {
    type?: string;
    severity?: string;
    ipAddress?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.severity) params.append("severity", filters.severity);
    if (filters?.ipAddress) params.append("ipAddress", filters.ipAddress);
    if (filters?.userId) params.append("userId", filters.userId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    return apiFetch(`/admin/security/events${queryString ? `?${queryString}` : ""}`);
  },
  getSecurityStats: async () => {
    return apiFetch("/admin/security/stats");
  },
};

// API Functions for Log Entries
export const logEntriesApi = {
  getAll: async (page?: number, limit?: number, sortBy?: string, filters?: { status?: string; type?: string; userId?: string; search?: string }) => {
    let params = '';
    if (page && limit) {
      params = `?page=${page}&limit=${limit}`;
      if (sortBy) params += `&sortBy=${sortBy}`;
      if (filters?.status) params += `&status=${filters.status}`;
      if (filters?.type) params += `&type=${filters.type}`;
      if (filters?.userId) params += `&userId=${filters.userId}`;
      if (filters?.search) params += `&search=${encodeURIComponent(filters.search)}`;
    } else if (sortBy || filters?.status || filters?.type || filters?.userId || filters?.search) {
      params = '?';
      const paramParts = [];
      if (sortBy) paramParts.push(`sortBy=${sortBy}`);
      if (filters?.status) paramParts.push(`status=${filters.status}`);
      if (filters?.type) paramParts.push(`type=${filters.type}`);
      if (filters?.userId) paramParts.push(`userId=${filters.userId}`);
      if (filters?.search) paramParts.push(`search=${encodeURIComponent(filters.search)}`);
      params += paramParts.join('&');
    }
    return apiFetch(`/log-entries${params}`);
  },
  // Endpoint ligero para calendario - solo campos mínimos
  getCalendar: async () => {
    return apiFetch('/log-entries/calendar');
  },
  getById: async (id: string) => {
    return apiFetch(`/log-entries/${id}`);
  },
  create: async (
    data: Omit<
      LogEntry,
      | "id"
      | "folioNumber"
      | "createdAt"
      | "author"
      | "comments"
      | "history"
      | "updatedAt"
      | "attachments"
    > & {
      authorId?: string;
      projectId?: string;
      skipAuthorAsSigner?: boolean;
    },
    files: File[] = []
  ) => {
    const formData = new FormData();

    const appendIfDefined = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      if (typeof value === "boolean") {
        formData.append(key, value ? "true" : "false");
        return;
      }
      formData.append(key, String(value));
    };

    const appendJson = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      formData.append(key, JSON.stringify(value));
    };

    appendIfDefined("title", data.title);
    appendIfDefined("description", data.description);
    appendIfDefined("type", data.type);
    appendIfDefined("subject", data.subject);
    appendIfDefined("location", data.location);
    appendIfDefined("activityStartDate", data.activityStartDate);
    appendIfDefined("activityEndDate", data.activityEndDate);
    appendIfDefined("entryDate", data.entryDate);
    appendIfDefined("activitiesPerformed", (data as any).activitiesPerformed);
    appendIfDefined("materialsUsed", (data as any).materialsUsed);
    appendIfDefined("workforce", (data as any).workforce);
    appendIfDefined("weatherConditions", (data as any).weatherConditions);
    appendIfDefined("additionalObservations", (data as any).additionalObservations);
    appendIfDefined("scheduleDay", (data as any).scheduleDay);
    appendIfDefined("locationDetails", (data as any).locationDetails);
    appendIfDefined("isConfidential", data.isConfidential ?? false);
    appendIfDefined("status", data.status);
    appendIfDefined("authorId", data.authorId);
    appendIfDefined("projectId", data.projectId);
    appendIfDefined("skipAuthorAsSigner", (data as any).skipAuthorAsSigner);

    appendJson("weatherReport", (data as any).weatherReport);
    appendJson("contractorPersonnel", (data as any).contractorPersonnel);
    appendJson("interventoriaPersonnel", (data as any).interventoriaPersonnel);
    appendJson("equipmentResources", (data as any).equipmentResources);
    appendJson("executedActivities", (data as any).executedActivities);
    appendJson("executedQuantities", (data as any).executedQuantities);
    appendJson("scheduledActivities", (data as any).scheduledActivities);
    appendJson("qualityControls", (data as any).qualityControls);
    appendJson("materialsReceived", (data as any).materialsReceived);
    appendJson("safetyNotes", (data as any).safetyNotes);
    appendJson("projectIssues", (data as any).projectIssues);
    appendJson("siteVisits", (data as any).siteVisits);
    appendIfDefined("contractorObservations", (data as any).contractorObservations);
    appendIfDefined("interventoriaObservations", (data as any).interventoriaObservations);
    appendIfDefined("safetyFindings", (data as any).safetyFindings);
    appendIfDefined(
      "safetyContractorResponse",
      (data as any).safetyContractorResponse
    );
    appendIfDefined("environmentFindings", (data as any).environmentFindings);
    appendIfDefined(
      "environmentContractorResponse",
      (data as any).environmentContractorResponse
    );
    appendJson("socialActivities", (data as any).socialActivities);
    appendIfDefined("socialObservations", (data as any).socialObservations);
    appendIfDefined(
      "socialContractorResponse",
      (data as any).socialContractorResponse
    );
    appendIfDefined("socialPhotoSummary", (data as any).socialPhotoSummary);

    const serializeUsers = (users?: Array<Partial<User> | string>) => {
      if (!users || users.length === 0) {
        return undefined;
      }
      return JSON.stringify(
        users.map((user) =>
          typeof user === "string"
            ? { id: user }
            : { id: user.id, fullName: user.fullName }
        )
      );
    };

    const assigneesJson = serializeUsers((data as any).assignees);
    if (assigneesJson) {
      formData.append("assignees", assigneesJson);
    }

    const requiredSignatoriesJson = serializeUsers(
      (data as any).requiredSignatories
    );
    if (requiredSignatoriesJson) {
      formData.append("requiredSignatories", requiredSignatoriesJson);
    }

    const signatures = (data as any).signatures;
    if (Array.isArray(signatures) && signatures.length > 0) {
      formData.append("signatures", JSON.stringify(signatures));
    }

    files.forEach((file) => {
      formData.append("attachments", file);
    });

    return apiFetch("/log-entries", {
      method: "POST",
      body: formData,
    });
  },
  update: async (id: string, data: Partial<LogEntry>) => {
    return apiFetch(`/log-entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  addComment: async (
    entryId: string,
    comment: { content: string; authorId: string },
    files: File[] = []
  ): Promise<Comment> => {
    const formData = new FormData();
    formData.append("content", comment.content);
    formData.append("authorId", comment.authorId);
    
    files.forEach((file) => {
      formData.append("attachments", file);
    });

    return apiFetch(`/log-entries/${entryId}/comments`, {
      method: "POST",
      body: formData,
    });
  },
  delete: async (id: string) => {
    return apiFetch(`/log-entries/${id}`, {
      method: "DELETE",
    });
  },
  addSignature: async (
    entryId: string,
    data: {
      signerId: string;
      password: string;
      consent: boolean;
      consentStatement?: string;
    }
  ) => {
    // Refrescar token proactivamente antes de firmar (operación crítica)
    await ensureFreshToken();
    return apiFetch(`/log-entries/${entryId}/signatures`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  exportPdf: async (entryId: string) => {
    // La exportación de PDF no debe pasar por la cola offline ya que requiere conexión
    // y devuelve un blob/JSON con información del PDF generado
    const accessToken = localStorage.getItem("accessToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // Obtener token CSRF si está disponible
    if (typeof document !== "undefined") {
      const csrfToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

      if (csrfToken) {
        headers["X-XSRF-TOKEN"] = decodeURIComponent(csrfToken);
      }
    }

    const response = await fetch(`${API_URL}/log-entries/${entryId}/export-pdf`, {
      method: "POST",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Error al exportar PDF" }));
      throw handleApiError({
        statusCode: response.status,
        message: errorData.error || errorData.message || "Error al exportar PDF",
        code: errorData.code,
      });
    }

    return response.json();
  },
  regeneratePdf: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/regenerate-pdf`, {
      method: "POST",
    });
  },
  exportZip: async (filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
    authorId?: string;
  }) => {
    const response = await fetch(`${API_URL}/log-entries/export-zip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      },
      credentials: "include",
      body: JSON.stringify(filters || {}),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Error al generar ZIP");
    }
    const blob = await response.blob();
    return blob;
  },
  sendToContractor: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/send-to-contractor`, {
      method: "POST",
    });
  },
  sendToInterventoria: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/send-to-interventoria`, {
      method: "POST",
    });
  },
  // NEW: Per-signatory review workflow
  sendForReview: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/send-for-review`, {
      method: "POST",
    });
  },
  approveReview: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/approve-review`, {
      method: "POST",
    });
  },
  completeContractorReview: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/contractor-review/complete`, {
      method: "POST",
    });
  },
  returnToContractor: async (
    entryId: string,
    payload: { reason?: string } = {}
  ) => {
    return apiFetch(`/log-entries/${entryId}/return-to-contractor`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  approveForSignature: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/approve-for-signature`, {
      method: "POST",
    });
  },
  completeReview: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/reviews/complete`, {
      method: "POST",
    });
  },
};

export const userSignatureApi = {
  get: async () => {
    return apiFetch("/users/me/signature");
  },
  upload: async (file: File, password: string) => {
    const formData = new FormData();
    formData.append("signature", file);
    formData.append("password", password);
    return apiFetch("/users/me/signature", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },
  decrypt: async (password: string) => {
    return apiFetch("/users/me/signature/decrypt", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
  remove: async () => {
    return apiFetch("/users/me/signature", {
      method: "DELETE",
    });
  },
};

export const attachmentsApi = {
  sign: async (
    attachmentId: string,
    data: {
      password: string;
      consentStatement?: string;
      page?: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      baseline?: boolean;
      baselineRatio?: number;
    }
  ) => {
    return apiFetch(`/attachments/${attachmentId}/sign`, {
      method: "POST",
      body: JSON.stringify({
        consent: true,
        password: data.password,
        ...data,
      }),
    });
  },
};

// API Functions for Communications
export const communicationsApi = {
  getAll: async () => {
    return apiFetch("/communications");
  },
  getById: async (id: string) => {
    return apiFetch(`/communications/${id}`);
  },
  create: async (
    data: Omit<
      Communication,
      "id" | "uploader" | "attachments" | "status" | "statusHistory" | "assignee" | "assignedAt"
    > & {
      uploaderId: string;
      attachments?: Attachment[];
      assigneeId?: string | null;
    }
  ) => {
    return apiFetch("/communications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateStatus: async (id: string, status: CommunicationStatus) => {
    return apiFetch(`/communications/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
  assign: async (id: string, assigneeId: string | null) => {
    return apiFetch(`/communications/${id}/assignment`, {
      method: "PUT",
      body: JSON.stringify({ assigneeId }),
    });
  },
};

// API Functions for Actas
export const actasApi = {
  getAll: async () => {
    return apiFetch("/actas");
  },
  getById: async (id: string) => {
    return apiFetch(`/actas/${id}`);
  },
  create: async (data: Omit<Acta, "id">) => {
    return apiFetch("/actas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<Acta>) => {
    return apiFetch(`/actas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  updateCommitment: async (
    actaId: string,
    commitmentId: string,
    data: Partial<Commitment>
  ) => {
    return apiFetch(`/actas/${actaId}/commitments/${commitmentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  sendCommitmentReminder: async (actaId: string, commitmentId: string) => {
    return apiFetch(`/actas/${actaId}/commitments/${commitmentId}/reminder`, {
      method: "POST",
    });
  },
  addSignature: async (
    actaId: string,
    data: {
      signerId: string;
      password: string;
      consent: boolean;
      consentStatement?: string;
    }
  ) => {
    // Refrescar token proactivamente antes de firmar (operación crítica)
    await ensureFreshToken();
    return apiFetch(`/actas/${actaId}/signatures`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// API Functions for Cost Actas
export const costActasApi = {
  getAll: async () => {
    return apiFetch("/cost-actas");
  },
  getById: async (id: string) => {
    return apiFetch(`/cost-actas/${id}`);
  },
  create: async (data: Omit<CostActa, "id" | "observations">) => {
    return apiFetch("/cost-actas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<CostActa>) => {
    return apiFetch(`/cost-actas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  addObservation: async (
    actaId: string,
    data: { text: string; authorId: string }
  ) => {
    return apiFetch(`/cost-actas/${actaId}/observations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  addAttachment: async (actaId: string, attachmentId: string) => {
    return apiFetch(`/cost-actas/${actaId}/attachments`, {
      method: "POST",
      body: JSON.stringify({ attachmentId }),
    });
  },
};

// API Functions for Work Actas
export const workActasApi = {
  getAll: async () => {
    return apiFetch("/work-actas");
  },
  getById: async (id: string) => {
    return apiFetch(`/work-actas/${id}`);
  },
  create: async (data: Omit<WorkActa, "id">) => {
    return apiFetch("/work-actas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<WorkActa>) => {
    return apiFetch(`/work-actas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// API Functions for Contract Items
export const contractItemsApi = {
  getAll: async () => {
    return apiFetch("/contract-items");
  },
  updateExecutedQuantity: async (itemId: string, executedQuantity: number, pkId: string) => {
    return apiFetch(`/contract-items/${itemId}/executed-quantity`, {
      method: "PATCH",
      body: JSON.stringify({ executedQuantity, pkId }),
    });
  },
};

// API Functions for Control Points
export const controlPointsApi = {
  getAll: async () => {
    return apiFetch("/control-points");
  },
  create: async (data: Omit<ControlPoint, "id" | "photos">) => {
    return apiFetch("/control-points", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  addPhoto: async (
    pointId: string,
    data: Omit<PhotoEntry, "id" | "author" | "date">
  ) => {
    return apiFetch(`/control-points/${pointId}/photos`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  reorderPhotos: async (pointId: string, photoIds: string[]) => {
    return apiFetch(`/control-points/${pointId}/photos/reorder`, {
      method: "PUT",
      body: JSON.stringify({ photoIds }),
    });
  },
  update: async (id: string, data: { name: string; description?: string; location?: string }) => {
    return apiFetch(`/control-points/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiFetch(`/control-points/${id}`, {
      method: "DELETE",
    });
  },
};

// API Functions for Project Tasks
export const projectTasksApi = {
  getAll: async () => {
    return apiFetch("/project-tasks");
  },
  import: async (
    tasks: Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      progress: number;
      duration: number;
      isSummary: boolean;
      outlineLevel: number;
      dependencies: string[];
      baselineCost?: number;
      cost?: number;
    }>
  ) => {
    return apiFetch("/project-tasks/import", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    });
  },
};

// API Functions for Contract Modifications
export const contractModificationsApi = {
  getAll: async () => {
    return apiFetch("/contract-modifications");
  },
  summary: async (): Promise<{
    baseValue: number;
    cap: number;
    additionsAffecting: number;
    additionsNonAffecting: number;
    usedPercent: number;
    remainingCap: number;
  }> => {
    return apiFetch("/contract-modifications?summary=1");
  },
  create: async (data: {
    number: string;
    type: ModificationType;
    date: string;
    value?: number;
    days?: number;
    justification: string;
    attachmentId?: string;
    affectsFiftyPercent?: boolean;
  }) => {
    return apiFetch("/contract-modifications", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (
    id: string,
    data: {
      number?: string;
      type?: ModificationType;
      date?: string;
      value?: number;
      days?: number;
      justification?: string;
      attachmentId?: string;
      affectsFiftyPercent?: boolean;
    }
  ) => {
    return apiFetch(`/contract-modifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// API Functions for Project Details
export const projectDetailsApi = {
  get: async () => {
    return apiFetch("/project-details");
  },
};

// API Functions for Reports
export const reportsApi = {
  getAll: async () => {
    return apiFetch("/reports");
  },
  getById: async (id: string) => {
    return apiFetch(`/reports/${id}`);
  },
  create: async (
    data: Omit<
      Report,
      | "id"
      | "author"
      | "status"
      | "attachments"
      | "version"
      | "previousReportId"
      | "versions"
    > & { previousReportId?: string }
  ) => {
    return apiFetch("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<Report>) => {
    return apiFetch(`/reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  generateWeeklyExcel: async (
    id: string
  ): Promise<{ report: Report; attachment: Attachment }> => {
    return apiFetch(`/reports/${id}/generate-weekly-excel`, {
      method: "POST",
    });
  },
};

// API Functions for Drawings
export const drawingsApi = {
  getAll: async () => {
    return apiFetch("/drawings");
  },
  getById: async (id: string) => {
    return apiFetch(`/drawings/${id}`);
  },
  create: async (
    data: Omit<Drawing, "id" | "status" | "versions" | "comments"> & {
      version: {
        fileName: string;
        url: string;
        size: number;
        uploaderId: string;
      };
    }
  ) => {
    return apiFetch("/drawings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  addVersion: async (
    drawingId: string,
    version: {
      fileName: string;
      url: string;
      size: number;
      uploaderId: string;
    }
  ) => {
    return apiFetch(`/drawings/${drawingId}/versions`, {
      method: "POST",
      body: JSON.stringify({ version }),
    });
  },
  addComment: async (
    drawingId: string,
    comment: { content: string; authorId: string }
  ) => {
    return apiFetch(`/drawings/${drawingId}/comments`, {
      method: "POST",
      body: JSON.stringify(comment),
    });
  },
};

// API Functions for Weekly Reports
export const weeklyReportsApi = {
  getAll: async () => {
    return apiFetch("/weekly-reports");
  },
  create: async (data: Omit<WeeklyReport, "id">) => {
    return apiFetch("/weekly-reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// API Functions for File Upload
export const uploadApi = {
  uploadFile: async (
    file: File,
    type: "document" | "photo" | "drawing",
    controlPointId?: string
  ): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    if (controlPointId && type === "photo") {
      formData.append("controlPointId", controlPointId);
    }

    return apiFetch("/upload", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary for FormData
    });
  },
};

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    return apiFetch("/notifications");
  },
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    return apiFetch(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },
};

// API Functions for Chatbot
type ChatbotHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export const chatbotApi = {
  query: async (
    query: string,
    history: ChatbotHistoryMessage[] = []
  ): Promise<{
    response: string;
    interactionId: string | null;
    contextSections?: Array<{ id: string; heading: string }>;
  }> => {
    return apiFetch("/chatbot/query", {
      method: "POST",
      body: JSON.stringify({ query, history }),
    });
  },
  analyzePhoto: async (
    photoUrl: string,
    question?: string,
    context?: string
  ): Promise<{ analysis: string; interactionId: string }> => {
    return apiFetch("/chatbot/analyze-photo", {
      method: "POST",
      body: JSON.stringify({ photoUrl, question, context }),
    });
  },
  getInsights: async (projectId?: string): Promise<any[]> => {
    const query = projectId ? `?projectId=${projectId}` : "";
    return apiFetch(`/chatbot/insights${query}`);
  },
  markInsightRead: async (id: string): Promise<void> => {
    return apiFetch(`/chatbot/insights/${id}/read`, {
      method: "PATCH",
    });
  },
  feedback: async (payload: {
    interactionId: string;
    rating: "POSITIVE" | "NEGATIVE";
    comment?: string;
    tags?: string[];
  }): Promise<{ success: boolean }> => {
    return apiFetch("/chatbot/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getPreferences: async () => {
    return apiFetch("/preferences");
  },
  setPreference: async (key: string, value: string) => {
    return apiFetch("/preferences", {
      method: "POST",
      body: JSON.stringify({ key, value }),
    });
  },
};

type ContractorProgressPayload = {
  semanal: ContractorProgressRow[];
  acumulado?: {
    preliminar: ContractorProgressTotals;
    ejecucion: ContractorProgressTotals;
  };
  weekNumber?: number;
  weekStart?: string;
  weekEnd?: string;
  reportId?: string;
  source?: string;
  metadata?: any;
};

export const contractorProgressApi = {
  getLatest: async (): Promise<ContractorProgressSnapshot | null> => {
    return apiFetch("/contractor-progress/latest");
  },
  save: async (payload: ContractorProgressPayload): Promise<ContractorProgressSnapshot> => {
    return apiFetch("/contractor-progress", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  importExcel: async (
    file: File,
    options: {
      weekNumber?: number;
      weekStart?: string;
      weekEnd?: string;
      reportId?: string;
      source?: string;
      metadata?: any;
    } = {}
  ): Promise<ContractorProgressSnapshot> => {
    const formData = new FormData();
    formData.append("file", file);
    if (options.weekNumber !== undefined) {
      formData.append("weekNumber", String(options.weekNumber));
    }
    if (options.weekStart) {
      formData.append("weekStart", options.weekStart);
    }
    if (options.weekEnd) {
      formData.append("weekEnd", options.weekEnd);
    }
    if (options.reportId) {
      formData.append("reportId", options.reportId);
    }
    if (options.source) {
      formData.append("source", options.source);
    }
    if (options.metadata !== undefined) {
      const metadataValue =
        typeof options.metadata === "string"
          ? options.metadata
          : JSON.stringify(options.metadata);
      formData.append("metadata", metadataValue);
    }

    return apiFetch("/contractor-progress/import-excel", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },
};

// Export all API functions
export const api = Object.assign(
  (endpoint: string, options?: RequestInit) => apiFetch(endpoint, options),
  {
    auth: authApi,
    users: usersApi,
    logEntries: logEntriesApi,
    userSignature: userSignatureApi,
    attachments: attachmentsApi,
    communications: communicationsApi,
    actas: actasApi,
    costActas: costActasApi,
    workActas: workActasApi,
    contractItems: contractItemsApi,
    controlPoints: controlPointsApi,
    projectTasks: projectTasksApi,
    contractModifications: contractModificationsApi,
    projectDetails: projectDetailsApi,
    reports: reportsApi,
    drawings: drawingsApi,
    weeklyReports: weeklyReportsApi,
    admin: adminApi,
    upload: uploadApi,
    notifications: notificationsApi,
    chatbot: chatbotApi, // <-- ¡Añade esto aquí!
  contractorProgress: contractorProgressApi,
  }
);

export default api;
