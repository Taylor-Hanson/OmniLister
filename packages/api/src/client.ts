import { retryUtils } from '@omnilister/core';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (this.config.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(request: ApiRequest): Promise<ApiResponse<T>> {
    const url = this.buildUrl(request.url, request.params);
    const headers = { ...this.defaultHeaders, ...request.headers };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.makeRequest(url, {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            'HTTP_ERROR'
          );
        }

        const data = await response.json();
        return {
          data,
          status: response.status,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers)
        };

      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retries) {
          throw error;
        }

        // Wait before retry
        const delay = retryUtils.retryDelay(attempt, this.config.retryDelay);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params, headers });
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, body, headers });
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, body, headers });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, headers });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, body, headers });
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    }

    const urlObj = new URL(url.startsWith('http') ? url : `${this.config.baseUrl}${url}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  /**
   * Make actual HTTP request
   */
  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  /**
   * Parse response headers
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.defaultHeaders['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Remove API key
   */
  removeApiKey(): void {
    delete this.config.apiKey;
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ApiClientConfig>> {
    return { ...this.config };
  }
}

// API Error class
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

// Default API client instance
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};
