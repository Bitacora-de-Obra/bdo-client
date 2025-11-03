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
} from "../../types";
import { handleApiError, ApiError } from "../utils/error-handling";

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

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  retryOn401 = true
) {
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
  if (
    isMutatingMethod &&
    typeof window !== "undefined" &&
    typeof localStorage !== "undefined"
  ) {
    const storedRole = localStorage.getItem("appRole");
    if (storedRole === "viewer") {
      throw handleApiError({
        statusCode: 403,
        message: "El rol Viewer solo puede consultar información.",
        code: "VIEWER_READ_ONLY",
      });
    }
  }

  const fetchUrl = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(fetchUrl, {
      ...options,
      headers,
      credentials: "include",
    });

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
          errorData.error ||
          errorData.message ||
          `Error HTTP: ${response.status}`,
        details: errorData.details,
        code: errorData.code,
      });
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response.text();
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

  forgotPassword: async (email: string): Promise<ApiMessageResponse> => {
    const response = await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
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

export const adminApi = {
  getUsers: async () => {
    return apiFetch("/admin/users");
  },
  inviteUser: async (data: {
    fullName: string;
    email: string;
    appRole: AppRole;
    projectRole?: string;
  }): Promise<{ user: User; temporaryPassword: string }> => {
    return apiFetch("/admin/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateUser: async (
    id: string,
    data: Partial<{
      appRole: AppRole;
      status: "active" | "inactive";
      projectRole: string;
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
};

// API Functions for Log Entries
export const logEntriesApi = {
  getAll: async () => {
    return apiFetch("/log-entries");
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
  ) => {
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
    data: { signerId: string; password: string }
  ) => {
    return apiFetch(`/log-entries/${entryId}/signatures`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  exportPdf: async (entryId: string) => {
    return apiFetch(`/log-entries/${entryId}/export-pdf`, {
      method: "POST",
    });
  },
};

export const userSignatureApi = {
  get: async () => {
    return apiFetch("/users/me/signature");
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("signature", file);
    return apiFetch("/users/me/signature", {
      method: "POST",
      body: formData,
      headers: {},
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
      consentStatement?: string;
      page?: number;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      baseline?: boolean;
      baselineRatio?: number;
    } = {}
  ) => {
    return apiFetch(`/attachments/${attachmentId}/sign`, {
      method: "POST",
      body: JSON.stringify({
        consent: true,
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
    data: { signerId: string; password: string }
  ) => {
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
  create: async (data: {
    number: string;
    type: ModificationType;
    date: string;
    value?: number;
    days?: number;
    justification: string;
    attachmentId?: string;
  }) => {
    return apiFetch("/contract-modifications", {
      method: "POST",
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
    type: "document" | "photo" | "drawing"
  ): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    return apiFetch("/upload", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary for FormData
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
    chatbot: chatbotApi, // <-- ¡Añade esto aquí!
  }
);

export default api;
