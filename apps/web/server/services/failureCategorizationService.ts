import { type FailureCategory, type InsertFailureCategory } from "../shared/schema.ts";
import { storage } from "../storage";

export interface FailureAnalysis {
  category: string;
  errorType: string;
  shouldRetry: boolean;
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRange: number;
  requiresUserIntervention: boolean;
  circuitBreakerEnabled: boolean;
  confidence: number; // 0-1, how confident we are in this categorization
  reasoning: string;
}

export interface ErrorContext {
  error: Error;
  errorCode?: string | number;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  requestData?: any;
  marketplace?: string;
  attempt?: number;
  previousCategories?: string[];
}

export class FailureCategorizationService {
  private failureCategories: Map<string, FailureCategory> = new Map();
  private marketplaceErrorPatterns: Map<string, any> = new Map();
  private lastCacheRefresh = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeDefaultCategories();
    this.initializeMarketplacePatterns();
  }

  /**
   * Analyze an error and categorize it for retry strategy
   */
  async categorizeFailure(context: ErrorContext): Promise<FailureAnalysis> {
    await this.ensureCategoriesLoaded();

    // Try multiple categorization approaches
    const analyses = await Promise.all([
      this.categorizeByHttpStatus(context),
      this.categorizeByErrorMessage(context),
      this.categorizeByMarketplaceSpecific(context),
      this.categorizeByErrorType(context),
      this.categorizeByRateLimitHeaders(context),
    ]);

    // Select the analysis with highest confidence
    const bestAnalysis = analyses
      .filter(a => a !== null)
      .sort((a, b) => b!.confidence - a!.confidence)[0];

    if (!bestAnalysis) {
      return this.getDefaultAnalysis("unknown", context);
    }

    return bestAnalysis;
  }

  /**
   * Categorize based on HTTP status codes
   */
  private async categorizeByHttpStatus(context: ErrorContext): Promise<FailureAnalysis | null> {
    const { statusCode } = context;
    if (!statusCode) return null;

    let category: string;
    let confidence = 0.8;

    if (statusCode >= 400 && statusCode < 500) {
      // 4xx errors - usually permanent or require user intervention
      switch (statusCode) {
        case 400: // Bad Request
          category = "validation";
          confidence = 0.9;
          break;
        case 401: // Unauthorized
        case 403: // Forbidden
          category = "auth";
          confidence = 0.95;
          break;
        case 404: // Not Found
          category = "permanent";
          confidence = 0.9;
          break;
        case 409: // Conflict
          category = "validation";
          confidence = 0.8;
          break;
        case 422: // Unprocessable Entity
          category = "validation";
          confidence = 0.9;
          break;
        case 429: // Too Many Requests
          category = "rate_limit";
          confidence = 0.95;
          break;
        default:
          category = "marketplace_error";
          confidence = 0.6;
      }
    } else if (statusCode >= 500) {
      // 5xx errors - usually temporary
      category = "temporary";
      confidence = 0.8;
    } else {
      return null;
    }

    const categoryConfig = this.failureCategories.get(category);
    if (!categoryConfig) {
      return this.getDefaultAnalysis(category, context);
    }

    return {
      category,
      errorType: `http_${statusCode}`,
      shouldRetry: categoryConfig.shouldRetry || false,
      maxRetries: categoryConfig.maxRetries || 3,
      baseDelayMs: categoryConfig.baseDelayMs || 1000,
      maxDelayMs: categoryConfig.maxDelayMs || 30000,
      backoffMultiplier: Number(categoryConfig.backoffMultiplier),
      jitterRange: Number(categoryConfig.jitterRange),
      requiresUserIntervention: categoryConfig.requiresUserIntervention || false,
      circuitBreakerEnabled: categoryConfig.circuitBreakerEnabled || false,
      confidence,
      reasoning: `Categorized as ${category} based on HTTP status ${statusCode}`,
    };
  }

  /**
   * Categorize based on error message patterns
   */
  private async categorizeByErrorMessage(context: ErrorContext): Promise<FailureAnalysis | null> {
    const message = context.error.message.toLowerCase();
    
    const patterns = [
      // Network errors
      { regex: /network|timeout|connection|econnreset|etimedout|enotfound/, category: "network", confidence: 0.9 },
      
      // Rate limiting
      { regex: /rate.?limit|too.?many.?requests|quota.?exceeded|throttle/, category: "rate_limit", confidence: 0.95 },
      
      // Authentication
      { regex: /unauthorized|forbidden|authentication|invalid.?token|expired.?token/, category: "auth", confidence: 0.9 },
      
      // Validation errors
      { regex: /invalid|validation|required|missing|bad.?request/, category: "validation", confidence: 0.8 },
      
      // Marketplace-specific
      { regex: /listing.?not.?found|item.?not.?found|already.?exists/, category: "marketplace_error", confidence: 0.8 },
      
      // Temporary issues
      { regex: /server.?error|internal.?error|temporary|try.?again/, category: "temporary", confidence: 0.7 },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(message)) {
        const categoryConfig = this.failureCategories.get(pattern.category);
        if (!categoryConfig) continue;

        return {
          category: pattern.category,
          errorType: "message_pattern",
          shouldRetry: categoryConfig.shouldRetry || false,
          maxRetries: categoryConfig.maxRetries || 3,
          baseDelayMs: categoryConfig.baseDelayMs || 1000,
          maxDelayMs: categoryConfig.maxDelayMs || 30000,
          backoffMultiplier: Number(categoryConfig.backoffMultiplier),
          jitterRange: Number(categoryConfig.jitterRange),
          requiresUserIntervention: categoryConfig.requiresUserIntervention || false,
          circuitBreakerEnabled: categoryConfig.circuitBreakerEnabled || false,
          confidence: pattern.confidence,
          reasoning: `Categorized as ${pattern.category} based on error message pattern`,
        };
      }
    }

    return null;
  }

  /**
   * Categorize based on marketplace-specific error patterns
   */
  private async categorizeByMarketplaceSpecific(context: ErrorContext): Promise<FailureAnalysis | null> {
    if (!context.marketplace) return null;

    const marketplacePatterns = this.marketplaceErrorPatterns.get(context.marketplace);
    if (!marketplacePatterns) return null;

    const message = context.error.message.toLowerCase();
    const errorCode = context.errorCode?.toString();

    for (const pattern of marketplacePatterns) {
      let matches = false;

      if (pattern.messagePattern && pattern.messagePattern.test(message)) {
        matches = true;
      }

      if (pattern.errorCode && errorCode === pattern.errorCode) {
        matches = true;
      }

      if (matches) {
        const categoryConfig = this.failureCategories.get(pattern.category);
        if (!categoryConfig) continue;

        return {
          category: pattern.category,
          errorType: `${context.marketplace}_specific`,
          shouldRetry: categoryConfig.shouldRetry || false,
          maxRetries: categoryConfig.maxRetries || 3,
          baseDelayMs: categoryConfig.baseDelayMs || 1000,
          maxDelayMs: categoryConfig.maxDelayMs || 30000,
          backoffMultiplier: Number(categoryConfig.backoffMultiplier),
          jitterRange: Number(categoryConfig.jitterRange),
          requiresUserIntervention: categoryConfig.requiresUserIntervention || false,
          circuitBreakerEnabled: categoryConfig.circuitBreakerEnabled || false,
          confidence: pattern.confidence || 0.8,
          reasoning: `Categorized as ${pattern.category} based on ${context.marketplace}-specific pattern`,
        };
      }
    }

    return null;
  }

  /**
   * Categorize based on error type/constructor
   */
  private async categorizeByErrorType(context: ErrorContext): Promise<FailureAnalysis | null> {
    const errorName = context.error.constructor.name;
    
    const typeMapping: Record<string, { category: string; confidence: number }> = {
      'TypeError': { category: "permanent", confidence: 0.9 },
      'ReferenceError': { category: "permanent", confidence: 0.95 },
      'SyntaxError': { category: "permanent", confidence: 0.95 },
      'TimeoutError': { category: "network", confidence: 0.9 },
      'NetworkError': { category: "network", confidence: 0.95 },
      'AbortError': { category: "network", confidence: 0.8 },
    };

    const mapping = typeMapping[errorName];
    if (!mapping) return null;

    const categoryConfig = this.failureCategories.get(mapping.category);
    if (!categoryConfig) return null;

    return {
      category: mapping.category,
      errorType: `error_type_${errorName}`,
      shouldRetry: categoryConfig.shouldRetry || false,
      maxRetries: categoryConfig.maxRetries || 3,
      baseDelayMs: categoryConfig.baseDelayMs || 1000,
      maxDelayMs: categoryConfig.maxDelayMs || 30000,
      backoffMultiplier: Number(categoryConfig.backoffMultiplier),
      jitterRange: Number(categoryConfig.jitterRange),
      requiresUserIntervention: categoryConfig.requiresUserIntervention || false,
      circuitBreakerEnabled: categoryConfig.circuitBreakerEnabled || false,
      confidence: mapping.confidence,
      reasoning: `Categorized as ${mapping.category} based on error type ${errorName}`,
    };
  }

  /**
   * Categorize based on rate limit headers
   */
  private async categorizeByRateLimitHeaders(context: ErrorContext): Promise<FailureAnalysis | null> {
    if (!context.responseHeaders) return null;

    const headers = Object.keys(context.responseHeaders)
      .reduce((acc, key) => {
        acc[key.toLowerCase()] = context.responseHeaders![key];
        return acc;
      }, {} as Record<string, string>);

    // Common rate limit headers
    const rateLimitHeaders = [
      'x-ratelimit-remaining',
      'x-rate-limit-remaining',
      'ratelimit-remaining',
      'retry-after',
      'x-ratelimit-reset',
      'x-rate-limit-reset',
    ];

    const hasRateLimitHeaders = rateLimitHeaders.some(header => header in headers);
    
    if (hasRateLimitHeaders) {
      const categoryConfig = this.failureCategories.get("rate_limit");
      if (!categoryConfig) return null;

      // Extract retry-after value if available
      const retryAfter = headers['retry-after'];
      let customDelay = categoryConfig.baseDelayMs;
      
      if (retryAfter) {
        const retryAfterMs = parseInt(retryAfter) * 1000;
        if (!isNaN(retryAfterMs)) {
          customDelay = Math.min(retryAfterMs, categoryConfig.maxDelayMs || 30000);
        }
      }

      return {
        category: "rate_limit",
        errorType: "rate_limit_headers",
        shouldRetry: categoryConfig.shouldRetry || false,
        maxRetries: categoryConfig.maxRetries || 3,
        baseDelayMs: customDelay || 1000,
        maxDelayMs: categoryConfig.maxDelayMs || 30000,
        backoffMultiplier: Number(categoryConfig.backoffMultiplier),
        jitterRange: Number(categoryConfig.jitterRange),
        requiresUserIntervention: categoryConfig.requiresUserIntervention || false,
        circuitBreakerEnabled: categoryConfig.circuitBreakerEnabled || false,
        confidence: 0.95,
        reasoning: "Categorized as rate_limit based on response headers",
      };
    }

    return null;
  }

  /**
   * Get default analysis for unknown or fallback cases
   */
  private getDefaultAnalysis(category: string, context: ErrorContext): FailureAnalysis {
    const defaultCategory = this.failureCategories.get(category) || this.failureCategories.get("temporary")!;
    
    return {
      category,
      errorType: "default",
      shouldRetry: defaultCategory.shouldRetry || false,
      maxRetries: defaultCategory.maxRetries || 3,
      baseDelayMs: defaultCategory.baseDelayMs || 1000,
      maxDelayMs: defaultCategory.maxDelayMs || 30000,
      backoffMultiplier: Number(defaultCategory.backoffMultiplier),
      jitterRange: Number(defaultCategory.jitterRange),
      requiresUserIntervention: defaultCategory.requiresUserIntervention || false,
      circuitBreakerEnabled: defaultCategory.circuitBreakerEnabled || false,
      confidence: 0.3,
      reasoning: `Default categorization as ${category}`,
    };
  }

  /**
   * Initialize default failure categories
   */
  private initializeDefaultCategories(): void {
    const defaultCategories: FailureCategory[] = [
      {
        id: "permanent",
        category: "permanent",
        description: "Permanent failures that should not be retried (validation errors, not found, etc.)",
        shouldRetry: false,
        maxRetries: 0,
        baseDelayMs: 0,
        maxDelayMs: 0,
        backoffMultiplier: "1.0",
        jitterRange: "0.0",
        requiresUserIntervention: true,
        circuitBreakerEnabled: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "temporary",
        category: "temporary",
        description: "Temporary failures that can be retried (server errors, timeouts, etc.)",
        shouldRetry: true,
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: "2.0",
        jitterRange: "0.1",
        requiresUserIntervention: false,
        circuitBreakerEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rate_limit",
        category: "rate_limit",
        description: "Rate limit failures that need longer delays",
        shouldRetry: true,
        maxRetries: 5,
        baseDelayMs: 5000,
        maxDelayMs: 300000, // 5 minutes
        backoffMultiplier: "2.5",
        jitterRange: "0.2",
        requiresUserIntervention: false,
        circuitBreakerEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "auth",
        category: "auth",
        description: "Authentication failures that require user intervention",
        shouldRetry: false,
        maxRetries: 1,
        baseDelayMs: 60000, // 1 minute
        maxDelayMs: 300000, // 5 minutes
        backoffMultiplier: "1.0",
        jitterRange: "0.0",
        requiresUserIntervention: true,
        circuitBreakerEnabled: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "network",
        category: "network",
        description: "Network failures that can be retried quickly",
        shouldRetry: true,
        maxRetries: 4,
        baseDelayMs: 500,
        maxDelayMs: 15000,
        backoffMultiplier: "1.8",
        jitterRange: "0.15",
        requiresUserIntervention: false,
        circuitBreakerEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "validation",
        category: "validation",
        description: "Validation failures that typically need user correction",
        shouldRetry: false,
        maxRetries: 0,
        baseDelayMs: 0,
        maxDelayMs: 0,
        backoffMultiplier: "1.0",
        jitterRange: "0.0",
        requiresUserIntervention: true,
        circuitBreakerEnabled: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "marketplace_error",
        category: "marketplace_error",
        description: "Marketplace-specific errors that may be temporary",
        shouldRetry: true,
        maxRetries: 3,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: "2.2",
        jitterRange: "0.15",
        requiresUserIntervention: false,
        circuitBreakerEnabled: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const category of defaultCategories) {
      this.failureCategories.set(category.category, category);
    }
  }

  /**
   * Initialize marketplace-specific error patterns
   */
  private initializeMarketplacePatterns(): void {
    // eBay error patterns
    this.marketplaceErrorPatterns.set("ebay", [
      { messagePattern: /api.?call.?limit/i, category: "rate_limit", confidence: 0.95 },
      { messagePattern: /application.?check.?failed/i, category: "auth", confidence: 0.9 },
      { messagePattern: /listing.?already.?exists/i, category: "validation", confidence: 0.9 },
      { messagePattern: /invalid.?category/i, category: "validation", confidence: 0.85 },
      { errorCode: "21916888", category: "rate_limit", confidence: 0.95 },
    ]);

    // Poshmark error patterns
    this.marketplaceErrorPatterns.set("poshmark", [
      { messagePattern: /too.?many.?requests/i, category: "rate_limit", confidence: 0.95 },
      { messagePattern: /invalid.?access.?token/i, category: "auth", confidence: 0.9 },
      { messagePattern: /listing.?creation.?failed/i, category: "marketplace_error", confidence: 0.8 },
    ]);

    // Mercari error patterns
    this.marketplaceErrorPatterns.set("mercari", [
      { messagePattern: /rate.?limit.?exceeded/i, category: "rate_limit", confidence: 0.95 },
      { messagePattern: /unauthorized.?request/i, category: "auth", confidence: 0.9 },
      { messagePattern: /invalid.?item.?data/i, category: "validation", confidence: 0.85 },
    ]);

    // Facebook Marketplace error patterns
    this.marketplaceErrorPatterns.set("facebook", [
      { messagePattern: /api.?rate.?limit/i, category: "rate_limit", confidence: 0.95 },
      { messagePattern: /access.?token.?expired/i, category: "auth", confidence: 0.95 },
      { messagePattern: /commerce.?policy.?violation/i, category: "validation", confidence: 0.9 },
    ]);
  }

  /**
   * Ensure failure categories are loaded from database
   */
  private async ensureCategoriesLoaded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheRefresh < this.CACHE_TTL) {
      return;
    }

    try {
      // In a real implementation, this would load from the database
      // For now, we use the default categories
      this.lastCacheRefresh = now;
    } catch (error) {
      console.warn("Failed to load failure categories from database:", error);
      // Continue with default categories
    }
  }

  /**
   * Update failure category configuration
   */
  async updateCategory(category: string, updates: Partial<FailureCategory>): Promise<void> {
    const existing = this.failureCategories.get(category);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.failureCategories.set(category, updated);
      // In production, this would also update the database
    }
  }

  /**
   * Get all configured failure categories
   */
  getCategories(): FailureCategory[] {
    return Array.from(this.failureCategories.values());
  }
}

export const failureCategorizationService = new FailureCategorizationService();