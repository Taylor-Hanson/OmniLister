import { type RateLimitTracker, type InsertRateLimitTracker } from "../shared/schema.js";
import { storage } from "../storage";
import { circuitBreakerService } from "./circuitBreakerService";
import { marketplaces } from "../shared/marketplaceConfig.js";

export interface RateLimitConfig {
  marketplace: string;
  hourlyLimit: number;
  dailyLimit: number;
  perMinuteLimit?: number;
  burstLimit?: number; // Short-term burst allowance
  priority?: number; // Higher priority marketplaces get preference
}

export interface RateLimitStatus {
  marketplace: string;
  hourlyUsage: number;
  dailyUsage: number;
  minuteUsage: number;
  hourlyRemaining: number;
  dailyRemaining: number;
  minuteRemaining: number;
  isLimited: boolean;
  resetTimes: {
    hourly: Date;
    daily: Date;
    minute: Date;
  };
  nextAvailableSlot: Date;
  estimatedDelay: number; // milliseconds until next available slot
  canMakeRequest: boolean;
  backoffMultiplier: number;
}

export interface RateLimitResponse {
  allowed: boolean;
  status: RateLimitStatus;
  waitTime?: number; // milliseconds to wait before retrying
  reasoning: string;
}

export interface MarketplaceRateLimitHeaders {
  remaining?: number;
  limit?: number;
  resetTime?: number;
  retryAfter?: number;
}

export class RateLimitService {
  // Default rate limit configurations for each marketplace
  private readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    ebay: {
      marketplace: "ebay",
      hourlyLimit: 100,
      dailyLimit: 5000,
      perMinuteLimit: 5,
      burstLimit: 10,
      priority: 9,
    },
    poshmark: {
      marketplace: "poshmark",
      hourlyLimit: 50,
      dailyLimit: 300,
      perMinuteLimit: 2,
      burstLimit: 5,
      priority: 8,
    },
    mercari: {
      marketplace: "mercari",
      hourlyLimit: 100,
      dailyLimit: 500,
      perMinuteLimit: 3,
      burstLimit: 8,
      priority: 8,
    },
    facebook: {
      marketplace: "facebook",
      hourlyLimit: 20,
      dailyLimit: 100,
      perMinuteLimit: 1,
      burstLimit: 2,
      priority: 6, // Lower priority due to browser automation limitations
    },
    depop: {
      marketplace: "depop",
      hourlyLimit: 60,
      dailyLimit: 200,
      perMinuteLimit: 2,
      burstLimit: 4,
      priority: 7,
    },
    vinted: {
      marketplace: "vinted",
      hourlyLimit: 30,
      dailyLimit: 150,
      perMinuteLimit: 1,
      burstLimit: 3,
      priority: 7,
    },
    stockx: {
      marketplace: "stockx",
      hourlyLimit: 200,
      dailyLimit: 1000,
      perMinuteLimit: 5,
      burstLimit: 10,
      priority: 9,
    },
    goat: {
      marketplace: "goat",
      hourlyLimit: 150,
      dailyLimit: 800,
      perMinuteLimit: 4,
      burstLimit: 8,
      priority: 8,
    },
    grailed: {
      marketplace: "grailed",
      hourlyLimit: 80,
      dailyLimit: 400,
      perMinuteLimit: 3,
      burstLimit: 6,
      priority: 7,
    },
    reverb: {
      marketplace: "reverb",
      hourlyLimit: 120,
      dailyLimit: 600,
      perMinuteLimit: 3,
      burstLimit: 7,
      priority: 7,
    },
    etsy: {
      marketplace: "etsy",
      hourlyLimit: 300,
      dailyLimit: 1500,
      perMinuteLimit: 8,
      burstLimit: 15,
      priority: 8,
    },
    amazon: {
      marketplace: "amazon",
      hourlyLimit: 200,
      dailyLimit: 2000,
      perMinuteLimit: 5,
      burstLimit: 10,
      priority: 9,
    },
  };

  private configCache: Map<string, RateLimitConfig> = new Map();
  private statusCache: Map<string, { status: RateLimitStatus; expiresAt: Date }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Check if a request can be made to a marketplace
   */
  async checkRateLimit(marketplace: string, userId?: string): Promise<RateLimitResponse> {
    try {
      const config = await this.getMarketplaceConfig(marketplace);
      const status = await this.getRateLimitStatus(marketplace);
      
      // Check circuit breaker first
      const circuitBreakerState = await circuitBreakerService.getState(marketplace);
      if (circuitBreakerState === "open") {
        return {
          allowed: false,
          status,
          waitTime: 60000, // 1 minute default wait for circuit breaker
          reasoning: "Circuit breaker is open due to repeated failures",
        };
      }

      if (circuitBreakerState === "half_open") {
        // Allow limited requests during half-open state
        const halfOpenAllowed = await circuitBreakerService.canMakeHalfOpenRequest(marketplace);
        if (!halfOpenAllowed) {
          return {
            allowed: false,
            status,
            waitTime: 30000, // 30 seconds wait during half-open
            reasoning: "Circuit breaker is half-open, maximum concurrent requests reached",
          };
        }
      }

      // Check if we're at or near limits
      if (!status.canMakeRequest) {
        return {
          allowed: false,
          status,
          waitTime: status.estimatedDelay,
          reasoning: this.generateLimitReasoning(status, config),
        };
      }

      // Apply intelligent throttling near limits
      const throttleDelay = this.calculateThrottleDelay(status, config);
      if (throttleDelay > 0) {
        return {
          allowed: false,
          status,
          waitTime: throttleDelay,
          reasoning: `Throttling to prevent rate limit violation. ${Math.round(throttleDelay / 1000)}s delay recommended`,
        };
      }

      return {
        allowed: true,
        status,
        reasoning: "Request allowed within rate limits",
      };
    } catch (error) {
      console.error(`Rate limit check failed for ${marketplace}:`, error);
      // Fail safe - allow request but with caution
      return {
        allowed: true,
        status: await this.getRateLimitStatus(marketplace),
        reasoning: "Rate limit check failed, allowing with caution",
      };
    }
  }

  /**
   * Record that an API request was made
   */
  async recordRequest(marketplace: string, success: boolean = true, responseHeaders?: MarketplaceRateLimitHeaders): Promise<void> {
    try {
      const now = new Date();
      const tracker = await storage.getRateLimitTracker(marketplace);
      
      if (!tracker) {
        // Create new tracker
        await storage.createRateLimitTracker({
          marketplace,
          timeWindow: now,
          windowStart: now,
          windowType: "hour",
          requestCount: 1,
          lastRequestAt: now,
          isBlocked: false,
        });
      } else {
        // Update existing tracker
        await storage.updateRateLimitTracker(marketplace, {
          requestCount: (tracker.requestCount || 0) + 1,
          lastRequestAt: now,
          isBlocked: false,
        });
      }

      // Process rate limit headers if provided
      if (responseHeaders) {
        await this.updateFromHeaders(marketplace, responseHeaders);
      }

      // Update circuit breaker state
      if (success) {
        await circuitBreakerService.recordSuccess(marketplace);
      } else {
        await circuitBreakerService.recordFailure(marketplace);
      }

      // Clear status cache to force refresh
      this.statusCache.delete(marketplace);

      // Track analytics
      await this.recordAnalytics(marketplace, success, responseHeaders);
    } catch (error) {
      console.error(`Failed to record request for ${marketplace}:`, error);
    }
  }

  /**
   * Handle 429 rate limit response
   */
  async handleRateLimitHit(marketplace: string, responseHeaders?: MarketplaceRateLimitHeaders): Promise<number> {
    try {
      console.warn(`Rate limit hit for ${marketplace}`, responseHeaders);

      // Update tracker to blocked state
      await this.markAsBlocked(marketplace, responseHeaders);

      // Record failure in circuit breaker
      await circuitBreakerService.recordFailure(marketplace);

      // Calculate backoff time
      const backoffTime = this.calculateBackoffTime(marketplace, responseHeaders);

      // Clear status cache
      this.statusCache.delete(marketplace);

      // Record analytics for rate limit hit
      await this.recordRateLimitHit(marketplace, responseHeaders, backoffTime);

      return backoffTime;
    } catch (error) {
      console.error(`Failed to handle rate limit for ${marketplace}:`, error);
      return 60000; // Default 1 minute backoff
    }
  }

  /**
   * Get current rate limit status for a marketplace
   */
  async getRateLimitStatus(marketplace: string): Promise<RateLimitStatus> {
    // Check cache first
    const cached = this.statusCache.get(marketplace);
    if (cached && cached.expiresAt > new Date()) {
      return cached.status;
    }

    const config = await this.getMarketplaceConfig(marketplace);
    const tracker = await storage.getRateLimitTracker(marketplace);
    const now = new Date();

    // Calculate usage windows
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

    // Get usage for different time windows
    const hourlyUsage = await this.getUsageInWindow(marketplace, hourStart, now);
    const dailyUsage = await this.getUsageInWindow(marketplace, dayStart, now);
    const minuteUsage = await this.getUsageInWindow(marketplace, minuteStart, now);

    // Calculate remaining limits
    const hourlyRemaining = Math.max(0, config.hourlyLimit - hourlyUsage);
    const dailyRemaining = Math.max(0, config.dailyLimit - dailyUsage);
    const minuteRemaining = Math.max(0, (config.perMinuteLimit || 10) - minuteUsage);

    // Calculate reset times
    const hourlyReset = new Date(hourStart.getTime() + 3600000); // +1 hour
    const dailyReset = new Date(dayStart.getTime() + 86400000); // +1 day
    const minuteReset = new Date(minuteStart.getTime() + 60000); // +1 minute

    // Determine if blocked
    const isLimited = tracker?.isBlocked || 
                     hourlyRemaining === 0 || 
                     dailyRemaining === 0 || 
                     minuteRemaining === 0;

    // Calculate next available slot
    const nextAvailableSlot = isLimited ? 
      new Date(Math.min(hourlyReset.getTime(), dailyReset.getTime(), minuteReset.getTime())) : 
      now;

    const estimatedDelay = Math.max(0, nextAvailableSlot.getTime() - now.getTime());

    // Calculate backoff multiplier based on recent failures
    const backoffMultiplier = await this.calculateBackoffMultiplier(marketplace);

    // Determine if request can be made
    const canMakeRequest = !isLimited && 
                          hourlyRemaining > 0 && 
                          dailyRemaining > 0 && 
                          minuteRemaining > 0;

    const status: RateLimitStatus = {
      marketplace,
      hourlyUsage,
      dailyUsage,
      minuteUsage,
      hourlyRemaining,
      dailyRemaining,
      minuteRemaining,
      isLimited,
      resetTimes: {
        hourly: hourlyReset,
        daily: dailyReset,
        minute: minuteReset,
      },
      nextAvailableSlot,
      estimatedDelay,
      canMakeRequest,
      backoffMultiplier,
    };

    // Cache the status
    this.statusCache.set(marketplace, {
      status,
      expiresAt: new Date(now.getTime() + this.CACHE_TTL),
    });

    return status;
  }

  /**
   * Get optimal delay for distributing requests
   */
  async getOptimalDelay(marketplace: string, priority: number = 0): Promise<number> {
    const status = await this.getRateLimitStatus(marketplace);
    const config = await this.getMarketplaceConfig(marketplace);

    if (!status.canMakeRequest) {
      return status.estimatedDelay;
    }

    // Calculate optimal spacing to avoid rate limits
    const timeUntilReset = Math.min(
      status.resetTimes.hourly.getTime() - Date.now(),
      status.resetTimes.daily.getTime() - Date.now(),
      status.resetTimes.minute.getTime() - Date.now()
    );

    const remainingRequests = Math.min(
      status.hourlyRemaining,
      status.dailyRemaining,
      status.minuteRemaining
    );

    if (remainingRequests <= 0) {
      return timeUntilReset;
    }

    // Calculate optimal spacing
    const optimalSpacing = timeUntilReset / remainingRequests;

    // Apply priority adjustment (higher priority = less delay)
    const priorityMultiplier = Math.max(0.1, 1 - (priority * 0.1));

    // Apply throttling near limits
    const throttleMultiplier = this.getThrottleMultiplier(status);

    return Math.max(1000, optimalSpacing * priorityMultiplier * throttleMultiplier); // Minimum 1 second
  }

  /**
   * Get marketplace configuration
   */
  private async getMarketplaceConfig(marketplace: string): Promise<RateLimitConfig> {
    // Check cache first
    if (this.configCache.has(marketplace)) {
      return this.configCache.get(marketplace)!;
    }

    // Try to get from database
    const dbConfig = await storage.getMarketplacePostingRules(marketplace);
    let config: RateLimitConfig;

    if (dbConfig && dbConfig.length > 0) {
      const rules = dbConfig[0];
      config = {
        marketplace,
        hourlyLimit: rules.rateLimitPerHour || this.DEFAULT_CONFIGS[marketplace]?.hourlyLimit || 100,
        dailyLimit: rules.rateLimitPerDay || this.DEFAULT_CONFIGS[marketplace]?.dailyLimit || 1000,
        perMinuteLimit: Math.floor((rules.rateLimitPerHour || 100) / 60),
        burstLimit: Math.floor((rules.rateLimitPerHour || 100) * 0.1),
        priority: this.DEFAULT_CONFIGS[marketplace]?.priority || 5,
      };
    } else {
      // Use default configuration
      config = this.DEFAULT_CONFIGS[marketplace] || {
        marketplace,
        hourlyLimit: 100,
        dailyLimit: 1000,
        perMinuteLimit: 3,
        burstLimit: 5,
        priority: 5,
      };
    }

    // Cache the configuration
    this.configCache.set(marketplace, config);
    return config;
  }

  /**
   * Get usage count in a specific time window
   */
  private async getUsageInWindow(marketplace: string, startTime: Date, endTime: Date): Promise<number> {
    // This would query the database for actual usage - for now we'll use the tracker
    const tracker = await storage.getRateLimitTracker(marketplace);
    if (!tracker) return 0;

    // Simple approximation - in production this should query actual request logs
    if (tracker.windowStart && tracker.windowStart >= startTime && tracker.windowStart <= endTime) {
      return tracker.requestCount || 0;
    }

    return 0; // Placeholder - should implement proper window querying
  }

  /**
   * Calculate backoff multiplier based on recent failures
   */
  private async calculateBackoffMultiplier(marketplace: string): Promise<number> {
    const circuitBreakerState = await circuitBreakerService.getState(marketplace);
    
    switch (circuitBreakerState) {
      case "open":
        return 5.0; // Heavy backoff
      case "half_open":
        return 2.0; // Moderate backoff
      default:
        return 1.0; // Normal operation
    }
  }

  /**
   * Calculate intelligent throttle delay near limits
   */
  private calculateThrottleDelay(status: RateLimitStatus, config: RateLimitConfig): number {
    const throttleThreshold = 0.8; // Start throttling at 80% of limits

    const hourlyUtilization = status.hourlyUsage / config.hourlyLimit;
    const dailyUtilization = status.dailyUsage / config.dailyLimit;
    const minuteUtilization = status.minuteUsage / (config.perMinuteLimit || 10);

    const maxUtilization = Math.max(hourlyUtilization, dailyUtilization, minuteUtilization);

    if (maxUtilization < throttleThreshold) {
      return 0; // No throttling needed
    }

    // Exponential throttling as we approach limits
    const throttleIntensity = (maxUtilization - throttleThreshold) / (1 - throttleThreshold);
    return Math.floor(throttleIntensity * throttleIntensity * 30000); // Up to 30 seconds delay
  }

  /**
   * Generate human-readable reasoning for rate limit decisions
   */
  private generateLimitReasoning(status: RateLimitStatus, config: RateLimitConfig): string {
    if (status.minuteRemaining === 0) {
      return `Rate limit reached: ${config.perMinuteLimit}/minute. Resets in ${Math.ceil((status.resetTimes.minute.getTime() - Date.now()) / 1000)}s`;
    }
    if (status.hourlyRemaining === 0) {
      return `Hourly limit reached: ${config.hourlyLimit}/hour. Resets in ${Math.ceil((status.resetTimes.hourly.getTime() - Date.now()) / 60000)} minutes`;
    }
    if (status.dailyRemaining === 0) {
      return `Daily limit reached: ${config.dailyLimit}/day. Resets in ${Math.ceil((status.resetTimes.daily.getTime() - Date.now()) / 3600000)} hours`;
    }
    if (status.isLimited) {
      return `Rate limited by marketplace. Next available slot: ${status.nextAvailableSlot.toISOString()}`;
    }
    return "Rate limit status unknown";
  }

  /**
   * Get throttle multiplier based on current status
   */
  private getThrottleMultiplier(status: RateLimitStatus): number {
    const hourlyUtil = status.hourlyUsage / (status.hourlyUsage + status.hourlyRemaining || 1);
    const dailyUtil = status.dailyUsage / (status.dailyUsage + status.dailyRemaining || 1);
    
    const maxUtil = Math.max(hourlyUtil, dailyUtil);
    
    if (maxUtil > 0.9) return 3.0; // Heavy throttling
    if (maxUtil > 0.75) return 2.0; // Moderate throttling
    if (maxUtil > 0.5) return 1.5; // Light throttling
    return 1.0; // No throttling
  }

  /**
   * Update rate limits from API response headers
   */
  private async updateFromHeaders(marketplace: string, headers: MarketplaceRateLimitHeaders): Promise<void> {
    if (!headers.remaining || !headers.limit) return;

    // Update the tracker with server-provided information
    await storage.updateRateLimitTracker(marketplace, {
      requestCount: headers.limit - headers.remaining,
      isBlocked: headers.remaining === 0,
      lastRequestAt: new Date(),
    });

    // Clear cache to force refresh
    this.statusCache.delete(marketplace);
  }

  /**
   * Mark marketplace as blocked due to rate limit
   */
  private async markAsBlocked(marketplace: string, headers?: MarketplaceRateLimitHeaders): Promise<void> {
    const resetTime = headers?.resetTime ? new Date(headers.resetTime * 1000) : 
                     new Date(Date.now() + 3600000); // Default 1 hour

    await storage.updateRateLimitTracker(marketplace, {
      isBlocked: true,
      resetTime,
      lastRequestAt: new Date(),
    });
  }

  /**
   * Calculate backoff time for rate limit hits
   */
  private calculateBackoffTime(marketplace: string, headers?: MarketplaceRateLimitHeaders): number {
    if (headers?.retryAfter) {
      return headers.retryAfter * 1000; // Convert to milliseconds
    }

    if (headers?.resetTime) {
      return Math.max(60000, (headers.resetTime * 1000) - Date.now());
    }

    // Default exponential backoff
    const config = this.DEFAULT_CONFIGS[marketplace];
    return Math.min(3600000, 60000 * (config?.priority || 5)); // 1 minute to 1 hour based on priority
  }

  /**
   * Record analytics for rate limit tracking
   */
  private async recordAnalytics(marketplace: string, success: boolean, headers?: MarketplaceRateLimitHeaders): Promise<void> {
    try {
      // This would record analytics to help optimize rate limiting
      // Implementation would depend on analytics system
      console.debug(`Rate limit analytics: ${marketplace}, success: ${success}`, headers);
    } catch (error) {
      console.error("Failed to record rate limit analytics:", error);
    }
  }

  /**
   * Record when a rate limit is hit for analytics
   */
  private async recordRateLimitHit(marketplace: string, headers?: MarketplaceRateLimitHeaders, backoffTime?: number): Promise<void> {
    try {
      // Record rate limit hit for analysis and optimization
      console.warn(`Rate limit hit recorded: ${marketplace}, backoff: ${backoffTime}ms`, headers);
    } catch (error) {
      console.error("Failed to record rate limit hit:", error);
    }
  }

  /**
   * Get rate limit summary for all marketplaces
   */
  async getRateLimitSummary(): Promise<Record<string, RateLimitStatus>> {
    const summary: Record<string, RateLimitStatus> = {};
    
    for (const marketplaceId of Object.keys(this.DEFAULT_CONFIGS)) {
      try {
        summary[marketplaceId] = await this.getRateLimitStatus(marketplaceId);
      } catch (error) {
        console.error(`Failed to get status for ${marketplaceId}:`, error);
      }
    }
    
    return summary;
  }

  /**
   * Reset rate limits (for testing or administrative purposes)
   */
  async resetRateLimits(marketplace?: string): Promise<void> {
    if (marketplace) {
      this.statusCache.delete(marketplace);
      await storage.updateRateLimitTracker(marketplace, {
        requestCount: 0,
        isBlocked: false,
        windowStart: new Date(),
        lastRequestAt: new Date(),
      });
    } else {
      this.statusCache.clear();
      // Reset all marketplace rate limits
      for (const marketplaceId of Object.keys(this.DEFAULT_CONFIGS)) {
        await storage.updateRateLimitTracker(marketplaceId, {
          requestCount: 0,
          isBlocked: false,
          windowStart: new Date(),
          lastRequestAt: new Date(),
        });
      }
    }
  }
}

export const rateLimitService = new RateLimitService();