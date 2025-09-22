import { 
  type Job, 
  type JobRetryHistory, 
  type MarketplaceRetryConfig,
  type RetryMetrics,
  type InsertJobRetryHistory,
  type InsertRetryMetrics
} from "@shared/schema";
import { storage } from "../storage";
import { failureCategorizationService, type FailureAnalysis, type ErrorContext } from "./failureCategorizationService";
import { randomUUID } from "crypto";

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  reason: string;
  maxRetriesReached: boolean;
  requiresUserIntervention: boolean;
  useCircuitBreaker: boolean;
  nextAttemptAt: Date;
  metadata: {
    failureCategory: string;
    errorType: string;
    confidence: number;
    appliedJitter: number;
    baseDelayMs: number;
    actualDelayMs: number;
    adaptiveAdjustment?: number;
  };
}

export interface RetryContext {
  job: Job;
  error: Error;
  errorCode?: string | number;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  requestData?: any;
  marketplace?: string;
  processingDuration?: number;
}

export interface AdaptiveRetryMetrics {
  successRate: number;
  avgDelayMs: number;
  recentFailures: number;
  adjustmentFactor: number;
}

export class RetryStrategyService {
  private marketplaceConfigs: Map<string, MarketplaceRetryConfig> = new Map();
  private recentMetrics: Map<string, AdaptiveRetryMetrics> = new Map();
  private lastConfigRefresh = 0;
  private readonly CONFIG_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly METRICS_WINDOW_HOURS = 24; // Look at last 24 hours for adaptive adjustments

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Determine retry strategy for a failed job
   */
  async determineRetryStrategy(context: RetryContext): Promise<RetryDecision> {
    // Categorize the failure
    const errorContext: ErrorContext = {
      error: context.error,
      errorCode: context.errorCode,
      statusCode: context.statusCode,
      responseHeaders: context.responseHeaders,
      requestData: context.requestData,
      marketplace: context.marketplace,
      attempt: context.job.attempts || 0,
    };

    const failureAnalysis = await failureCategorizationService.categorizeFailure(errorContext);

    // Get marketplace-specific configuration
    const marketplaceConfig = await this.getMarketplaceConfig(context.marketplace);

    // Check if we've exceeded max retries
    const effectiveMaxRetries = marketplaceConfig?.globalMaxRetries || failureAnalysis.maxRetries;
    if ((context.job.attempts || 0) >= effectiveMaxRetries) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max retries (${effectiveMaxRetries}) exceeded`,
        maxRetriesReached: true,
        requiresUserIntervention: failureAnalysis.requiresUserIntervention,
        useCircuitBreaker: failureAnalysis.circuitBreakerEnabled,
        nextAttemptAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        metadata: {
          failureCategory: failureAnalysis.category,
          errorType: failureAnalysis.errorType,
          confidence: failureAnalysis.confidence,
          appliedJitter: 0,
          baseDelayMs: 0,
          actualDelayMs: 0,
        },
      };
    }

    // Check if failure category allows retries
    if (!failureAnalysis.shouldRetry) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Failure category '${failureAnalysis.category}' does not allow retries`,
        maxRetriesReached: false,
        requiresUserIntervention: failureAnalysis.requiresUserIntervention,
        useCircuitBreaker: false,
        nextAttemptAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        metadata: {
          failureCategory: failureAnalysis.category,
          errorType: failureAnalysis.errorType,
          confidence: failureAnalysis.confidence,
          appliedJitter: 0,
          baseDelayMs: 0,
          actualDelayMs: 0,
        },
      };
    }

    // Calculate retry delay with exponential backoff and jitter
    const delayCalculation = await this.calculateRetryDelay(
      context.job.attempts || 0,
      failureAnalysis,
      marketplaceConfig,
      context.marketplace
    );

    // Record retry attempt
    await this.recordRetryAttempt(context, failureAnalysis, delayCalculation.actualDelayMs);

    return {
      shouldRetry: true,
      delayMs: delayCalculation.actualDelayMs,
      reason: `Retry attempt ${(context.job.attempts || 0) + 1}/${effectiveMaxRetries} for ${failureAnalysis.category} failure`,
      maxRetriesReached: false,
      requiresUserIntervention: failureAnalysis.requiresUserIntervention,
      useCircuitBreaker: failureAnalysis.circuitBreakerEnabled,
      nextAttemptAt: new Date(Date.now() + delayCalculation.actualDelayMs),
      metadata: {
        failureCategory: failureAnalysis.category,
        errorType: failureAnalysis.errorType,
        confidence: failureAnalysis.confidence,
        appliedJitter: delayCalculation.appliedJitter,
        baseDelayMs: delayCalculation.baseDelayMs,
        actualDelayMs: delayCalculation.actualDelayMs,
        adaptiveAdjustment: delayCalculation.adaptiveAdjustment,
      },
    };
  }

  /**
   * Calculate retry delay with exponential backoff, jitter, and adaptive adjustments
   */
  private async calculateRetryDelay(
    attemptNumber: number,
    failureAnalysis: FailureAnalysis,
    marketplaceConfig: MarketplaceRetryConfig | null,
    marketplace?: string
  ): Promise<{
    baseDelayMs: number;
    actualDelayMs: number;
    appliedJitter: number;
    adaptiveAdjustment?: number;
  }> {
    // Get base delay from failure analysis or marketplace config override
    let baseDelayMs = failureAnalysis.baseDelayMs;
    let maxDelayMs = failureAnalysis.maxDelayMs;
    let backoffMultiplier = failureAnalysis.backoffMultiplier;
    let jitterRange = failureAnalysis.jitterRange;

    // Apply marketplace-specific overrides if available
    if (marketplaceConfig?.retryDelayOverrides) {
      const overrides = marketplaceConfig.retryDelayOverrides as any;
      const categoryOverride = overrides[failureAnalysis.category];
      if (categoryOverride) {
        baseDelayMs = categoryOverride.baseDelayMs || baseDelayMs;
        maxDelayMs = categoryOverride.maxDelayMs || maxDelayMs;
        backoffMultiplier = categoryOverride.backoffMultiplier || backoffMultiplier;
        jitterRange = categoryOverride.jitterRange || jitterRange;
      }
    }

    // Calculate exponential backoff
    const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attemptNumber);

    // Apply adaptive adjustment based on recent success patterns
    let adaptiveAdjustment = 1.0;
    if (marketplace && marketplaceConfig?.adaptiveRetryEnabled) {
      adaptiveAdjustment = await this.calculateAdaptiveAdjustment(marketplace, failureAnalysis.category);
    }

    // Calculate adjusted delay
    const adjustedDelay = exponentialDelay * adaptiveAdjustment;

    // Ensure we don't exceed max delay
    const cappedDelay = Math.min(adjustedDelay, maxDelayMs);

    // Apply jitter to prevent thundering herd
    const jitterAmount = cappedDelay * jitterRange;
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount; // Random jitter between -jitterAmount and +jitterAmount
    const finalDelay = Math.max(0, cappedDelay + jitter);

    return {
      baseDelayMs,
      actualDelayMs: Math.round(finalDelay),
      appliedJitter: Math.round(jitter),
      adaptiveAdjustment: adaptiveAdjustment !== 1.0 ? adaptiveAdjustment : undefined,
    };
  }

  /**
   * Calculate adaptive adjustment factor based on recent success patterns
   */
  private async calculateAdaptiveAdjustment(marketplace: string, failureCategory: string): Promise<number> {
    const cacheKey = `${marketplace}:${failureCategory}`;
    
    // Check if we have recent metrics cached
    let metrics = this.recentMetrics.get(cacheKey);
    if (!metrics) {
      metrics = await this.calculateRecentMetrics(marketplace, failureCategory);
      this.recentMetrics.set(cacheKey, metrics);
      
      // Cache for 15 minutes
      setTimeout(() => {
        this.recentMetrics.delete(cacheKey);
      }, 15 * 60 * 1000);
    }

    const marketplaceConfig = await this.getMarketplaceConfig(marketplace);
    const successThreshold = marketplaceConfig?.adaptiveSuccessThreshold || 0.8;
    const adjustmentFactor = marketplaceConfig?.adaptiveAdjustmentFactor || 1.5;

    // If success rate is below threshold, increase delays
    if (parseFloat(metrics.successRate.toString()) < parseFloat(successThreshold.toString())) {
      return parseFloat(adjustmentFactor.toString());
    }

    // If success rate is very high, slightly decrease delays
    if (metrics.successRate > 0.95) {
      return 0.8;
    }

    return 1.0; // No adjustment
  }

  /**
   * Calculate recent metrics for adaptive adjustments
   */
  private async calculateRecentMetrics(marketplace: string, failureCategory: string): Promise<AdaptiveRetryMetrics> {
    const windowStart = new Date(Date.now() - this.METRICS_WINDOW_HOURS * 60 * 60 * 1000);
    
    try {
      // In a real implementation, this would query the retry metrics table
      // For now, we'll return default values
      return {
        successRate: 0.75, // 75% success rate
        avgDelayMs: 5000,   // 5 second average delay
        recentFailures: 3,  // 3 recent failures
        adjustmentFactor: 1.0,
      };
    } catch (error) {
      console.warn(`Failed to calculate recent metrics for ${marketplace}:${failureCategory}:`, error);
      return {
        successRate: 0.5, // Conservative fallback
        avgDelayMs: 10000,
        recentFailures: 5,
        adjustmentFactor: 1.2,
      };
    }
  }

  /**
   * Record retry attempt for analytics and future optimization
   */
  private async recordRetryAttempt(
    context: RetryContext,
    failureAnalysis: FailureAnalysis,
    delayMs: number
  ): Promise<void> {
    try {
      const retryHistory: InsertJobRetryHistory = {
        jobId: context.job.id,
        attemptNumber: (context.job.attempts || 0) + 1,
        failureCategory: failureAnalysis.category,
        errorType: failureAnalysis.errorType,
        errorMessage: context.error.message,
        errorCode: context.errorCode?.toString(),
        marketplace: context.marketplace,
        retryDelay: delayMs,
        nextRetryAt: new Date(Date.now() + delayMs),
        stackTrace: context.error.stack,
        requestData: context.requestData,
        responseData: context.responseHeaders,
        contextData: {
          failureAnalysis,
          processingDuration: context.processingDuration,
        },
        processingDuration: context.processingDuration,
      };

      // In production, this would save to the database
      console.log("Recording retry attempt:", {
        jobId: context.job.id,
        attemptNumber: retryHistory.attemptNumber,
        category: failureAnalysis.category,
        delayMs,
      });

    } catch (error) {
      console.error("Failed to record retry attempt:", error);
    }
  }

  /**
   * Get marketplace-specific retry configuration
   */
  private async getMarketplaceConfig(marketplace?: string): Promise<MarketplaceRetryConfig | null> {
    if (!marketplace) return null;

    await this.ensureConfigsLoaded();
    return this.marketplaceConfigs.get(marketplace) || null;
  }

  /**
   * Ensure marketplace configurations are loaded
   */
  private async ensureConfigsLoaded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastConfigRefresh < this.CONFIG_CACHE_TTL) {
      return;
    }

    try {
      // In production, this would load from the database
      // For now, we use the default configurations
      this.lastConfigRefresh = now;
    } catch (error) {
      console.warn("Failed to load marketplace retry configs:", error);
    }
  }

  /**
   * Initialize default marketplace configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: MarketplaceRetryConfig[] = [
      {
        id: "ebay-config",
        marketplace: "ebay",
        isEnabled: true,
        globalMaxRetries: 5,
        rateLimitDetection: {
          headers: ["x-ebay-api-call-usage", "x-ebay-rate-limit"],
          patterns: ["api call limit", "rate limit exceeded"],
        },
        customErrorMappings: {
          "21916888": "rate_limit", // eBay rate limit error code
          "17": "auth", // Invalid access token
        },
        retryDelayOverrides: {
          rate_limit: {
            baseDelayMs: 10000, // 10 seconds for rate limits
            maxDelayMs: 600000, // 10 minutes max
            backoffMultiplier: 3.0,
            jitterRange: 0.3,
          },
          auth: {
            baseDelayMs: 300000, // 5 minutes for auth errors
            maxDelayMs: 1800000, // 30 minutes max
            backoffMultiplier: 1.0,
            jitterRange: 0.1,
          },
        },
        circuitBreakerConfig: {
          failureThreshold: 5,
          recoveryThreshold: 3,
          timeoutMs: 120000, // 2 minutes
        },
        maintenanceWindows: [
          { dayOfWeek: 0, startHour: 2, endHour: 4, timezone: "UTC" }, // Sunday 2-4 AM UTC
        ],
        adaptiveRetryEnabled: true,
        adaptiveSuccessThreshold: "0.8",
        adaptiveAdjustmentFactor: "1.8",
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "poshmark-config",
        marketplace: "poshmark",
        isEnabled: true,
        globalMaxRetries: 4,
        rateLimitDetection: {
          headers: ["x-ratelimit-remaining", "retry-after"],
          patterns: ["too many requests", "rate limit"],
        },
        customErrorMappings: {},
        retryDelayOverrides: {
          rate_limit: {
            baseDelayMs: 15000, // 15 seconds
            maxDelayMs: 900000, // 15 minutes max
            backoffMultiplier: 2.5,
            jitterRange: 0.25,
          },
        },
        circuitBreakerConfig: {
          failureThreshold: 4,
          recoveryThreshold: 2,
          timeoutMs: 180000, // 3 minutes
        },
        maintenanceWindows: [],
        adaptiveRetryEnabled: true,
        adaptiveSuccessThreshold: "0.75",
        adaptiveAdjustmentFactor: "1.6",
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "mercari-config",
        marketplace: "mercari",
        isEnabled: true,
        globalMaxRetries: 3,
        rateLimitDetection: {
          headers: ["x-rate-limit", "retry-after"],
          patterns: ["rate limit exceeded"],
        },
        customErrorMappings: {},
        retryDelayOverrides: {
          network: {
            baseDelayMs: 2000, // 2 seconds for network errors
            maxDelayMs: 30000, // 30 seconds max
            backoffMultiplier: 2.0,
            jitterRange: 0.2,
          },
        },
        circuitBreakerConfig: {
          failureThreshold: 3,
          recoveryThreshold: 2,
          timeoutMs: 60000, // 1 minute
        },
        maintenanceWindows: [],
        adaptiveRetryEnabled: true,
        adaptiveSuccessThreshold: "0.8",
        adaptiveAdjustmentFactor: "1.4",
        priority: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const config of defaultConfigs) {
      this.marketplaceConfigs.set(config.marketplace, config);
    }
  }

  /**
   * Update marketplace configuration
   */
  async updateMarketplaceConfig(marketplace: string, updates: Partial<MarketplaceRetryConfig>): Promise<void> {
    const existing = this.marketplaceConfigs.get(marketplace);
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      this.marketplaceConfigs.set(marketplace, updated);
      // In production, this would also update the database
    }
  }

  /**
   * Get retry statistics for a marketplace
   */
  async getRetryStatistics(marketplace: string, hours = 24): Promise<{
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    avgDelayMs: number;
    successRate: number;
    topFailureCategories: Array<{ category: string; count: number }>;
  }> {
    const windowStart = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // In production, this would query the retry metrics and history tables
    return {
      totalAttempts: 100,
      successfulRetries: 75,
      failedRetries: 25,
      avgDelayMs: 8500,
      successRate: 0.75,
      topFailureCategories: [
        { category: "rate_limit", count: 15 },
        { category: "network", count: 8 },
        { category: "temporary", count: 2 },
      ],
    };
  }

  /**
   * Check if a marketplace is in maintenance window
   */
  isInMaintenanceWindow(marketplace?: string): boolean {
    if (!marketplace) return false;

    const config = this.marketplaceConfigs.get(marketplace);
    if (!config?.maintenanceWindows) return false;

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDayOfWeek = now.getUTCDay();

    for (const window of config.maintenanceWindows as any[]) {
      if (window.dayOfWeek === currentDayOfWeek &&
          currentHour >= window.startHour &&
          currentHour < window.endHour) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all marketplace configurations
   */
  getMarketplaceConfigs(): MarketplaceRetryConfig[] {
    return Array.from(this.marketplaceConfigs.values());
  }
}

export const retryStrategyService = new RetryStrategyService();