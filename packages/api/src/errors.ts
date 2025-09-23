// API Error classes and utilities

export class ApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'SERVER_ERROR', details);
    this.name = 'ServerError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred') {
    super(message, undefined, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request timeout') {
    super(message, undefined, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

// Error utility functions
export const errorUtils = {
  /**
   * Check if error is an API error
   */
  isApiError: (error: any): error is ApiError => {
    return error instanceof ApiError;
  },

  /**
   * Check if error is a client error (4xx)
   */
  isClientError: (error: any): boolean => {
    return errorUtils.isApiError(error) && 
           error.status !== undefined && 
           error.status >= 400 && 
           error.status < 500;
  },

  /**
   * Check if error is a server error (5xx)
   */
  isServerError: (error: any): boolean => {
    return errorUtils.isApiError(error) && 
           error.status !== undefined && 
           error.status >= 500;
  },

  /**
   * Check if error is retryable
   */
  isRetryable: (error: any): boolean => {
    if (!errorUtils.isApiError(error)) {
      return true; // Network errors are retryable
    }

    // Don't retry client errors except 429 (rate limit)
    if (errorUtils.isClientError(error)) {
      return error.status === 429;
    }

    // Retry server errors
    if (errorUtils.isServerError(error)) {
      return true;
    }

    // Retry network errors
    return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT_ERROR';
  },

  /**
   * Get retry delay for error
   */
  getRetryDelay: (error: any, attempt: number): number => {
    if (error instanceof RateLimitError && error.details?.retryAfter) {
      return error.details.retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff for other retryable errors
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  },

  /**
   * Format error for logging
   */
  formatForLogging: (error: any): Record<string, any> => {
    if (errorUtils.isApiError(error)) {
      return {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details,
        stack: error.stack
      };
    }

    return {
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error',
      stack: error.stack
    };
  },

  /**
   * Create error from HTTP response
   */
  fromResponse: async (response: Response): Promise<ApiError> => {
    let details: any;
    try {
      details = await response.json();
    } catch {
      details = { statusText: response.statusText };
    }

    const message = details.message || details.error || response.statusText;
    const code = details.code || 'HTTP_ERROR';

    switch (response.status) {
      case 400:
        return new ValidationError(message, details);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError(message);
      case 409:
        return new ConflictError(message, details);
      case 429:
        return new RateLimitError(message, details.retryAfter);
      case 500:
        return new ServerError(message, details);
      case 503:
        return new ServiceUnavailableError(message);
      default:
        return new ApiError(message, response.status, code, details);
    }
  },

  /**
   * Create error from network failure
   */
  fromNetworkError: (error: Error): NetworkError => {
    return new NetworkError(error.message);
  },

  /**
   * Create error from timeout
   */
  fromTimeout: (timeout: number): TimeoutError => {
    return new TimeoutError(`Request timed out after ${timeout}ms`);
  }
};

// Error codes
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server Errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',

  // Business Logic
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  MARKETPLACE_ERROR: 'MARKETPLACE_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  AUTOMATION_ERROR: 'AUTOMATION_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
