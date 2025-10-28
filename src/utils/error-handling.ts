export class ApiError extends Error {
  statusCode?: number;
  details?: any;
  code?: string;

  constructor(message: string, statusCode?: number, details?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

interface ApiErrorData {
  statusCode?: number;
  message: string;
  details?: any;
  code?: string;
  error?: string;
}

export function handleApiError(error: ApiErrorData | Error | unknown): ApiError {
  // Si ya es un ApiError, lo devolvemos tal cual
  if (error instanceof ApiError) {
    return error;
  }

  // Si es un error de la API con formato estándar
  if ((error as ApiErrorData).statusCode) {
    const apiError = error as ApiErrorData;
    return new ApiError(
      apiError.message,
      apiError.statusCode,
      apiError.details,
      apiError.code
    );
  }

  // Si es un error de la API con formato simple
  if ((error as ApiErrorData).error) {
    const apiError = error as ApiErrorData;
    return new ApiError(
      apiError.error,
      apiError.statusCode,
      apiError.details,
      apiError.code
    );
  }

  // Si es un error estándar de JavaScript
  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  // Si es una respuesta de error de fetch
  if ((error as Response).status) {
    const response = error as Response;
    return new ApiError(
      'Error en la petición',
      response.status,
      undefined,
      'FETCH_ERROR'
    );
  }

  // Para cualquier otro tipo de error
  return new ApiError(
    typeof error === 'string' ? error : 'Error desconocido',
    500,
    undefined,
    'UNKNOWN_ERROR'
  );
}

export function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 404;
  }
  return false;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 401;
  }
  return false;
}

export function isForbiddenError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.statusCode === 403;
  }
  return false;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Network Error') || error.message.includes('Failed to fetch');
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error desconocido';
}