import { rateLimitService, type MarketplaceRateLimitHeaders } from "./rateLimitService";
import { circuitBreakerService } from "./circuitBreakerService";

export interface ApiRequest {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  rateLimitHeaders?: MarketplaceRateLimitHeaders;
}

export interface RateLimitedApiOptions {
  marketplace: string;
  userId?: string;
  priority?: number;
  maxRetries?: number;
  retryDelay?: number;
  bypassRateLimit?: boolean; // For critical operations
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public marketplace: string,
    public waitTime: number,
    public status?: RateLimitedApiResponse
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public marketplace: string) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

export interface RateLimitedApiResponse {
  success: boolean;
  error?: string;
  waitTime?: number;
  retryAfter?: number;
}

/**
 * Rate limit middleware that wraps API calls to marketplaces
 */
export class RateLimitMiddleware {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Make a rate-limited API call to a marketplace
   */
  async makeApiCall<T = any>(
    request: ApiRequest,
    options: RateLimitedApiOptions
  ): Promise<ApiResponse<T>> {
    const {
      marketplace,
      userId,
      priority = 0,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = 1000,
      bypassRateLimit = false,
    } = options;

    // Check rate limits before making the call (unless bypassed)
    if (!bypassRateLimit) {
      const rateLimitCheck = await rateLimitService.checkRateLimit(marketplace, userId);
      if (!rateLimitCheck.allowed) {
        throw new RateLimitError(
          rateLimitCheck.reasoning,
          marketplace,
          rateLimitCheck.waitTime || 60000,
          {
            success: false,
            error: rateLimitCheck.reasoning,
            waitTime: rateLimitCheck.waitTime,
          }
        );
      }

      // Check circuit breaker
      const circuitBreakerState = await circuitBreakerService.getState(marketplace);
      if (circuitBreakerState === "open") {
        throw new CircuitBreakerError(
          `Circuit breaker is open for ${marketplace}`,
          marketplace
        );
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        // Apply intelligent delay based on current rate limit status
        if (attempt > 1) {
          const delay = await this.calculateRetryDelay(marketplace, attempt, retryDelay);
          await this.sleep(delay);
        } else if (!bypassRateLimit) {
          const optimalDelay = await rateLimitService.getOptimalDelay(marketplace, priority);
          if (optimalDelay > 0) {
            console.log(`Applying optimal delay of ${optimalDelay}ms for ${marketplace}`);
            await this.sleep(optimalDelay);
          }
        }

        // Make the actual API call
        const response = await this.executeApiCall<T>(request);

        // Extract rate limit headers
        const rateLimitHeaders = this.extractRateLimitHeaders(response.headers);

        // Record successful request
        await rateLimitService.recordRequest(marketplace, true, rateLimitHeaders);

        return {
          ...response,
          rateLimitHeaders,
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`API call attempt ${attempt} failed for ${marketplace}:`, error);

        // Handle specific error types
        if (error instanceof Response) {
          const status = error.status;
          const headers = this.responseHeadersToObject(error.headers);
          const rateLimitHeaders = this.extractRateLimitHeaders(headers);

          // Handle rate limit responses (429)
          if (status === 429) {
            const backoffTime = await rateLimitService.handleRateLimitHit(marketplace, rateLimitHeaders);
            
            // Record failed request due to rate limiting
            await rateLimitService.recordRequest(marketplace, false, rateLimitHeaders);

            // If this is the last attempt, throw the error
            if (attempt >= maxRetries) {
              throw new RateLimitError(
                `Rate limit exceeded for ${marketplace}. Retry after ${backoffTime}ms`,
                marketplace,
                backoffTime,
                {
                  success: false,
                  error: `HTTP 429: Rate limit exceeded`,
                  retryAfter: backoffTime,
                }
              );
            }

            // Wait for the specified backoff time before retrying
            console.log(`Rate limit hit for ${marketplace}, backing off for ${backoffTime}ms`);
            await this.sleep(backoffTime);
            continue;
          }

          // Handle other HTTP errors
          if (status >= 500) {
            // Server errors - record as failure and potentially retry
            await rateLimitService.recordRequest(marketplace, false, rateLimitHeaders);
            
            if (attempt >= maxRetries) {
              throw new Error(`Server error ${status} for ${marketplace}`);
            }
            continue;
          }

          if (status >= 400 && status < 500) {
            // Client errors - record as failure but don't retry (except 429)
            await rateLimitService.recordRequest(marketplace, false, rateLimitHeaders);
            throw new Error(`Client error ${status} for ${marketplace}`);
          }

          // Record successful request for other status codes
          await rateLimitService.recordRequest(marketplace, true, rateLimitHeaders);
        }

        // For non-HTTP errors, record as failure
        await rateLimitService.recordRequest(marketplace, false);

        // If this is the last attempt, throw the error
        if (attempt >= maxRetries) {
          throw lastError;
        }
      }
    }

    // This shouldn't be reached, but just in case
    throw lastError || new Error(`Failed to make API call after ${maxRetries} attempts`);
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeApiCall<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const {
      url,
      method,
      headers = {},
      body,
      timeout = this.DEFAULT_TIMEOUT,
    } = request;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: controller.signal,
      };

      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      let data: T;
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      if (!response.ok) {
        // Convert response to error for consistent error handling
        const error = response as any;
        error.data = data;
        throw error;
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.responseHeadersToObject(response.headers),
      };

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract rate limit headers from API response
   */
  private extractRateLimitHeaders(headers: Record<string, string>): MarketplaceRateLimitHeaders {
    const rateLimitHeaders: MarketplaceRateLimitHeaders = {};

    // Common rate limit header patterns
    const headerMappings = [
      // Standard headers
      { key: "remaining", headers: ["x-ratelimit-remaining", "x-rate-limit-remaining"] },
      { key: "limit", headers: ["x-ratelimit-limit", "x-rate-limit-limit"] },
      { key: "resetTime", headers: ["x-ratelimit-reset", "x-rate-limit-reset"] },
      { key: "retryAfter", headers: ["retry-after", "x-retry-after"] },

      // GitHub style
      { key: "remaining", headers: ["x-ratelimit-remaining"] },
      { key: "limit", headers: ["x-ratelimit-limit"] },
      { key: "resetTime", headers: ["x-ratelimit-reset"] },

      // Twitter/X style
      { key: "remaining", headers: ["x-rate-limit-remaining"] },
      { key: "limit", headers: ["x-rate-limit-limit"] },
      { key: "resetTime", headers: ["x-rate-limit-reset"] },

      // Other variations
      { key: "remaining", headers: ["ratelimit-remaining", "rate-limit-remaining"] },
      { key: "limit", headers: ["ratelimit-limit", "rate-limit-limit"] },
      { key: "resetTime", headers: ["ratelimit-reset", "rate-limit-reset"] },
    ];

    for (const mapping of headerMappings) {
      for (const headerName of mapping.headers) {
        const value = headers[headerName.toLowerCase()];
        if (value) {
          const numericValue = parseInt(value, 10);
          if (!isNaN(numericValue)) {
            (rateLimitHeaders as any)[mapping.key] = numericValue;
            break;
          }
        }
      }
    }

    return rateLimitHeaders;
  }

  /**
   * Convert Headers object to plain object
   */
  private responseHeadersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private async calculateRetryDelay(marketplace: string, attempt: number, baseDelay: number): Promise<number> {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    
    // Add jitter (random factor between 0.5 and 1.5)
    const jitter = 0.5 + Math.random();
    const jitteredDelay = exponentialDelay * jitter;

    // Get additional delay based on rate limit status
    const rateLimitDelay = await rateLimitService.getOptimalDelay(marketplace);

    // Use the maximum of the two delays
    return Math.min(Math.max(jitteredDelay, rateLimitDelay), 300000); // Cap at 5 minutes
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch API calls with rate limit awareness
   */
  async makeBatchApiCalls<T = any>(
    requests: Array<{ request: ApiRequest; options: RateLimitedApiOptions }>,
    concurrency: number = 1
  ): Promise<Array<ApiResponse<T> | Error>> {
    const results: Array<ApiResponse<T> | Error> = [];
    const marketplaceGroups: Map<string, Array<{ request: ApiRequest; options: RateLimitedApiOptions; index: number }>> = new Map();

    // Group requests by marketplace
    requests.forEach((item, index) => {
      const marketplace = item.options.marketplace;
      if (!marketplaceGroups.has(marketplace)) {
        marketplaceGroups.set(marketplace, []);
      }
      marketplaceGroups.get(marketplace)!.push({ ...item, index });
    });

    // Process each marketplace group with concurrency control
    const promises: Promise<void>[] = [];
    
    marketplaceGroups.forEach((marketplaceRequests, marketplace) => {
      const promise = this.processBatchForMarketplace(marketplace, marketplaceRequests, concurrency, results);
      promises.push(promise);
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Process batch requests for a specific marketplace
   */
  private async processBatchForMarketplace<T>(
    marketplace: string,
    requests: Array<{ request: ApiRequest; options: RateLimitedApiOptions; index: number }>,
    concurrency: number,
    results: Array<ApiResponse<T> | Error>
  ): Promise<void> {
    const semaphore = Array(concurrency).fill(null);
    let requestIndex = 0;

    const processNext = async (): Promise<void> => {
      while (requestIndex < requests.length) {
        const currentIndex = requestIndex++;
        const item = requests[currentIndex];

        try {
          const response = await this.makeApiCall<T>(item.request, item.options);
          results[item.index] = response;
        } catch (error) {
          results[item.index] = error as Error;
        }
      }
    };

    // Start concurrent processors
    await Promise.all(semaphore.map(processNext));
  }

  /**
   * Check if a marketplace is available for API calls
   */
  async isMarketplaceAvailable(marketplace: string): Promise<{ available: boolean; reason?: string; waitTime?: number }> {
    try {
      const rateLimitCheck = await rateLimitService.checkRateLimit(marketplace);
      if (!rateLimitCheck.allowed) {
        return {
          available: false,
          reason: rateLimitCheck.reasoning,
          waitTime: rateLimitCheck.waitTime,
        };
      }

      const circuitBreakerState = await circuitBreakerService.getState(marketplace);
      if (circuitBreakerState === "open") {
        return {
          available: false,
          reason: "Circuit breaker is open due to repeated failures",
          waitTime: 60000, // Default 1 minute
        };
      }

      return { available: true };
    } catch (error) {
      return {
        available: false,
        reason: `Error checking marketplace availability: ${error}`,
      };
    }
  }

  /**
   * Get rate limit status for multiple marketplaces
   */
  async getMarketplaceStatuses(marketplaces: string[]): Promise<Record<string, { available: boolean; reason?: string; waitTime?: number }>> {
    const statuses: Record<string, { available: boolean; reason?: string; waitTime?: number }> = {};

    await Promise.all(
      marketplaces.map(async (marketplace) => {
        statuses[marketplace] = await this.isMarketplaceAvailable(marketplace);
      })
    );

    return statuses;
  }
}

export const rateLimitMiddleware = new RateLimitMiddleware();