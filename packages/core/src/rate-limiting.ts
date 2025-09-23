import { RateLimitWindow, FailureCategory } from './types';
import { RATE_LIMITS } from './constants';
import { timeUtils, retryUtils } from './utils';

export interface RateLimitConfig {
  window: RateLimitWindow;
  limit: number;
  windowSize: number; // in milliseconds
}

export interface RateLimitStatus {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitTracker {
  marketplace: string;
  windowStart: number;
  windowType: RateLimitWindow;
  requestCount: number;
  successCount: number;
  failureCount: number;
  remainingLimit: number;
  resetTime: number;
  lastRequestAt: number;
  isBlocked: boolean;
}

export class RateLimiter {
  private trackers: Map<string, RateLimitTracker> = new Map();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if request is allowed
   */
  isAllowed(marketplace: string): RateLimitStatus {
    const tracker = this.getTracker(marketplace);
    const now = Date.now();

    // Check if window has expired
    if (now >= tracker.resetTime) {
      this.resetTracker(tracker);
    }

    const isLimited = tracker.requestCount >= this.config.limit;
    const remaining = Math.max(0, this.config.limit - tracker.requestCount);
    const retryAfter = isLimited ? tracker.resetTime - now : undefined;

    return {
      isLimited,
      remaining,
      resetTime: tracker.resetTime,
      retryAfter
    };
  }

  /**
   * Record a request
   */
  recordRequest(marketplace: string, success: boolean = true): void {
    const tracker = this.getTracker(marketplace);
    const now = Date.now();

    // Check if window has expired
    if (now >= tracker.resetTime) {
      this.resetTracker(tracker);
    }

    tracker.requestCount++;
    tracker.lastRequestAt = now;

    if (success) {
      tracker.successCount++;
    } else {
      tracker.failureCount++;
    }

    tracker.remainingLimit = Math.max(0, this.config.limit - tracker.requestCount);
  }

  /**
   * Get tracker for marketplace
   */
  private getTracker(marketplace: string): RateLimitTracker {
    if (!this.trackers.has(marketplace)) {
      const now = Date.now();
      this.trackers.set(marketplace, {
        marketplace,
        windowStart: now,
        windowType: this.config.window,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        remainingLimit: this.config.limit,
        resetTime: now + this.config.windowSize,
        lastRequestAt: now,
        isBlocked: false
      });
    }
    return this.trackers.get(marketplace)!;
  }

  /**
   * Reset tracker for new window
   */
  private resetTracker(tracker: RateLimitTracker): void {
    const now = Date.now();
    tracker.windowStart = now;
    tracker.requestCount = 0;
    tracker.successCount = 0;
    tracker.failureCount = 0;
    tracker.remainingLimit = this.config.limit;
    tracker.resetTime = now + this.config.windowSize;
    tracker.isBlocked = false;
  }

  /**
   * Get all trackers
   */
  getAllTrackers(): RateLimitTracker[] {
    return Array.from(this.trackers.values());
  }

  /**
   * Clear all trackers
   */
  clearAll(): void {
    this.trackers.clear();
  }
}

// Rate limiting utilities
export const rateLimitUtils = {
  /**
   * Create hourly rate limiter
   */
  createHourlyLimiter: (limit: number = RATE_LIMITS.DEFAULT_HOURLY): RateLimiter => {
    return new RateLimiter({
      window: 'hourly',
      limit,
      windowSize: 60 * 60 * 1000 // 1 hour
    });
  },

  /**
   * Create daily rate limiter
   */
  createDailyLimiter: (limit: number = RATE_LIMITS.DEFAULT_DAILY): RateLimiter => {
    return new RateLimiter({
      window: 'daily',
      limit,
      windowSize: 24 * 60 * 60 * 1000 // 24 hours
    });
  },

  /**
   * Calculate delay between requests
   */
  calculateDelay: (minDelay: number = RATE_LIMITS.MIN_DELAY_SECONDS, maxDelay: number = RATE_LIMITS.MAX_DELAY_SECONDS): number => {
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  },

  /**
   * Check if marketplace is rate limited
   */
  isRateLimited: (tracker: RateLimitTracker): boolean => {
    const now = Date.now();
    return tracker.isBlocked || (now < tracker.resetTime && tracker.requestCount >= tracker.remainingLimit);
  },

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset: (tracker: RateLimitTracker): number => {
    const now = Date.now();
    return Math.max(0, tracker.resetTime - now);
  },

  /**
   * Calculate retry delay for rate limited request
   */
  calculateRetryDelay: (tracker: RateLimitTracker, attempt: number = 0): number => {
    const timeUntilReset = rateLimitUtils.getTimeUntilReset(tracker);
    const baseDelay = Math.max(timeUntilReset, 1000); // At least 1 second
    return retryUtils.retryDelay(attempt, baseDelay, 300000); // Max 5 minutes
  }
};

// Marketplace-specific rate limit configurations
export const marketplaceRateLimits: Record<string, { hourly: number; daily: number }> = {
  ebay: { hourly: 5000, daily: 100000 },
  poshmark: { hourly: 100, daily: 5000 },
  mercari: { hourly: 200, daily: 10000 },
  depop: { hourly: 150, daily: 8000 },
  grailed: { hourly: 100, daily: 5000 },
  shopify: { hourly: 1000, daily: 50000 },
  amazon: { hourly: 2000, daily: 100000 },
  default: { hourly: 100, daily: 1000 }
};

/**
 * Get rate limit configuration for marketplace
 */
export const getMarketplaceRateLimit = (marketplace: string): { hourly: number; daily: number } => {
  return marketplaceRateLimits[marketplace] || marketplaceRateLimits.default;
};
