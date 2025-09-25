import { type AnalyticsEvent, type InsertAnalyticsEvent } from "../shared/schema.ts";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";

export interface RateLimitMetrics {
  marketplace: string;
  timeWindow: string; // "hour" | "day" | "minute"
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageDelay: number;
  peakUsage: number;
  utilizationRate: number; // percentage of limit used
  timestamp: Date;
}

export interface MarketplaceUsagePattern {
  marketplace: string;
  optimalPostingTimes: Array<{
    hour: number;
    dayOfWeek: number;
    successRate: number;
    avgResponseTime: number;
  }>;
  peakUsageHours: number[];
  lowUsageHours: number[];
  recommendedMaxVelocity: number; // posts per hour
  currentVelocity: number;
  efficiencyScore: number; // 0-100
}

export interface UserRateLimitDashboard {
  userId: string;
  currentLimits: Record<string, {
    marketplace: string;
    hourlyUsed: number;
    hourlyLimit: number;
    dailyUsed: number;
    dailyLimit: number;
    nextReset: Date;
    status: "healthy" | "warning" | "critical" | "blocked";
    recommendedAction?: string;
  }>;
  recentActivity: Array<{
    marketplace: string;
    timestamp: Date;
    action: string;
    success: boolean;
    rateLimited: boolean;
  }>;
  usagePatterns: Record<string, MarketplaceUsagePattern>;
  alerts: Array<{
    marketplace: string;
    message: string;
    severity: "info" | "warning" | "error";
    timestamp: Date;
  }>;
}

export class RateLimitAnalyticsService {
  private readonly METRICS_WINDOW_HOURS = 24; // Track metrics for last 24 hours
  private readonly PATTERN_ANALYSIS_DAYS = 7; // Analyze patterns over 7 days

  /**
   * Record a rate limit event for analytics
   */
  async recordRateLimitEvent(
    userId: string,
    marketplace: string,
    eventType: "request" | "rate_limit_hit" | "backoff" | "circuit_breaker_open",
    metadata?: any
  ): Promise<void> {
    try {
      const eventData: InsertAnalyticsEvent = {
        eventType: `rate_limit_${eventType}`,
        marketplace,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      };

      await storage.createAnalyticsEvent(userId, eventData);
    } catch (error) {
      console.error(`Failed to record rate limit event:`, error);
    }
  }

  /**
   * Generate rate limit metrics for a marketplace
   */
  async generateRateLimitMetrics(marketplace: string, timeWindow: "hour" | "day" | "minute" = "hour"): Promise<RateLimitMetrics> {
    const now = new Date();
    let startTime: Date;

    switch (timeWindow) {
      case "minute":
        startTime = new Date(now.getTime() - 60000);
        break;
      case "hour":
        startTime = new Date(now.getTime() - 3600000);
        break;
      case "day":
        startTime = new Date(now.getTime() - 86400000);
        break;
    }

    // Get analytics events for the time window
    const events = await storage.getAnalyticsEvents("system", {
      marketplace,
      startDate: startTime,
      endDate: now,
    });

    const requestEvents = events.filter(e => e.eventType === "rate_limit_request");
    const rateLimitHitEvents = events.filter(e => e.eventType === "rate_limit_rate_limit_hit");

    const totalRequests = requestEvents.length;
    const successfulRequests = requestEvents.filter(e => (e.metadata as any)?.success === true).length;
    const failedRequests = requestEvents.filter(e => (e.metadata as any)?.success === false).length;
    const rateLimitHits = rateLimitHitEvents.length;

    // Calculate average delay from backoff events
    const backoffEvents = events.filter(e => e.eventType === "rate_limit_backoff");
    const totalDelay = backoffEvents.reduce((sum, e) => sum + ((e.metadata as any)?.delay || 0), 0);
    const averageDelay = backoffEvents.length > 0 ? totalDelay / backoffEvents.length : 0;

    // Get current rate limit status for utilization calculation
    const currentStatus = await rateLimitService.getRateLimitStatus(marketplace);
    const utilizationRate = timeWindow === "hour" ? 
      (currentStatus.hourlyUsage / (currentStatus.hourlyUsage + currentStatus.hourlyRemaining) * 100) :
      (currentStatus.dailyUsage / (currentStatus.dailyUsage + currentStatus.dailyRemaining) * 100);

    return {
      marketplace,
      timeWindow,
      totalRequests,
      successfulRequests,
      failedRequests,
      rateLimitHits,
      averageDelay,
      peakUsage: Math.max(currentStatus.hourlyUsage, currentStatus.dailyUsage),
      utilizationRate,
      timestamp: now,
    };
  }

  /**
   * Analyze usage patterns for a marketplace
   */
  async analyzeUsagePatterns(marketplace: string): Promise<MarketplaceUsagePattern> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (this.PATTERN_ANALYSIS_DAYS * 86400000));

    const events = await storage.getAnalyticsEvents("system", {
      marketplace,
      startDate,
      endDate,
    });

    const requestEvents = events.filter(e => e.eventType === "rate_limit_request");

    // Analyze optimal posting times
    const hourlyStats = new Map<string, { total: number; successful: number; totalResponseTime: number }>();

    requestEvents.forEach(event => {
      const timestamp = new Date(event.createdAt || new Date());
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      const key = `${dayOfWeek}-${hour}`;

      if (!hourlyStats.has(key)) {
        hourlyStats.set(key, { total: 0, successful: 0, totalResponseTime: 0 });
      }

      const stats = hourlyStats.get(key)!;
      stats.total++;
      
      if ((event.metadata as any)?.success) {
        stats.successful++;
      }
      
      if ((event.metadata as any)?.responseTime) {
        stats.totalResponseTime += (event.metadata as any).responseTime;
      }
    });

    const optimalPostingTimes = Array.from(hourlyStats.entries()).map(([key, stats]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return {
        hour,
        dayOfWeek,
        successRate: stats.successful / stats.total * 100,
        avgResponseTime: stats.totalResponseTime / stats.total,
      };
    }).sort((a, b) => b.successRate - a.successRate);

    // Calculate usage distribution by hour
    const hourlyUsage = new Array(24).fill(0);
    requestEvents.forEach(event => {
      const hour = new Date(event.createdAt || new Date()).getHours();
      hourlyUsage[hour]++;
    });

    const maxUsage = Math.max(...hourlyUsage);
    const minUsage = Math.min(...hourlyUsage);

    const peakUsageHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(item => item.usage > maxUsage * 0.8)
      .map(item => item.hour);

    const lowUsageHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(item => item.usage < minUsage * 1.2)
      .map(item => item.hour);

    // Calculate recommended velocity
    const avgHourlyRequests = requestEvents.length / (this.PATTERN_ANALYSIS_DAYS * 24);
    const currentStatus = await rateLimitService.getRateLimitStatus(marketplace);
    const recommendedMaxVelocity = Math.floor(currentStatus.hourlyRemaining / 2); // Conservative recommendation

    // Calculate efficiency score based on successful requests vs rate limit hits
    const rateLimitHits = events.filter(e => e.eventType === "rate_limit_rate_limit_hit").length;
    const efficiencyScore = Math.max(0, 100 - (rateLimitHits / requestEvents.length * 100));

    return {
      marketplace,
      optimalPostingTimes: optimalPostingTimes.slice(0, 10), // Top 10 optimal times
      peakUsageHours,
      lowUsageHours,
      recommendedMaxVelocity,
      currentVelocity: avgHourlyRequests,
      efficiencyScore,
    };
  }

  /**
   * Generate user dashboard data
   */
  async generateUserDashboard(userId: string): Promise<UserRateLimitDashboard> {
    // Get user's marketplace connections to determine which marketplaces to monitor
    const connections = await storage.getMarketplaceConnections(userId);
    const connectedMarketplaces = connections.filter(c => c.isConnected).map(c => c.marketplace);

    // Get current rate limit status for all connected marketplaces
    const currentLimits: UserRateLimitDashboard['currentLimits'] = {};
    
    for (const marketplace of connectedMarketplaces) {
      try {
        const status = await rateLimitService.getRateLimitStatus(marketplace);
        const utilizationRate = status.hourlyUsage / (status.hourlyUsage + status.hourlyRemaining);
        
        let alertStatus: "healthy" | "warning" | "critical" | "blocked" = "healthy";
        let recommendedAction: string | undefined;

        if (status.isLimited) {
          alertStatus = "blocked";
          recommendedAction = `Rate limit reached. Next available: ${status.nextAvailableSlot.toLocaleTimeString()}`;
        } else if (utilizationRate > 0.9) {
          alertStatus = "critical";
          recommendedAction = "Approaching rate limit. Consider reducing posting velocity.";
        } else if (utilizationRate > 0.7) {
          alertStatus = "warning";
          recommendedAction = "High usage detected. Monitor closely.";
        }

        currentLimits[marketplace] = {
          marketplace,
          hourlyUsed: status.hourlyUsage,
          hourlyLimit: status.hourlyUsage + status.hourlyRemaining,
          dailyUsed: status.dailyUsage,
          dailyLimit: status.dailyUsage + status.dailyRemaining,
          nextReset: status.resetTimes.hourly,
          status: alertStatus,
          recommendedAction,
        };
      } catch (error) {
        console.error(`Failed to get rate limit status for ${marketplace}:`, error);
      }
    }

    // Get recent activity
    const recentEvents = await storage.getAnalyticsEvents(userId, {
      startDate: new Date(Date.now() - 86400000), // Last 24 hours
      endDate: new Date(),
    });

    const recentActivity = recentEvents
      .filter(e => e.eventType.startsWith("rate_limit_"))
      .slice(0, 50) // Last 50 events
      .map(event => ({
        marketplace: event.marketplace || "unknown",
        timestamp: event.createdAt || new Date(),
        action: event.eventType.replace("rate_limit_", ""),
        success: (event.metadata as any)?.success || false,
        rateLimited: event.eventType === "rate_limit_rate_limit_hit",
      }));

    // Generate usage patterns for connected marketplaces
    const usagePatterns: Record<string, MarketplaceUsagePattern> = {};
    for (const marketplace of connectedMarketplaces) {
      try {
        usagePatterns[marketplace] = await this.analyzeUsagePatterns(marketplace);
      } catch (error) {
        console.error(`Failed to analyze usage patterns for ${marketplace}:`, error);
      }
    }

    // Generate alerts based on current status
    const alerts = [];
    for (const [marketplace, limits] of Object.entries(currentLimits)) {
      if (limits.status === "blocked") {
        alerts.push({
          marketplace,
          message: `Rate limit exceeded. Posting paused until ${limits.nextReset.toLocaleTimeString()}`,
          severity: "error" as const,
          timestamp: new Date(),
        });
      } else if (limits.status === "critical") {
        alerts.push({
          marketplace,
          message: `Approaching rate limit (${Math.round(limits.hourlyUsed / limits.hourlyLimit * 100)}% used)`,
          severity: "warning" as const,
          timestamp: new Date(),
        });
      }
    }

    return {
      userId,
      currentLimits,
      recentActivity,
      usagePatterns,
      alerts,
    };
  }

  /**
   * Get rate limit health summary
   */
  async getHealthSummary(): Promise<{
    overallHealth: "healthy" | "warning" | "critical";
    marketplaceStatuses: Record<string, { 
      status: string; 
      utilizationRate: number; 
      rateLimitHits: number;
      lastHit?: Date;
    }>;
    recommendations: string[];
  }> {
    const marketplaceStatuses: Record<string, any> = {};
    const recommendations: string[] = [];
    let criticalCount = 0;
    let warningCount = 0;

    // Get rate limit summary
    const rateLimitSummary = await rateLimitService.getRateLimitSummary();

    for (const [marketplace, status] of Object.entries(rateLimitSummary)) {
      const utilizationRate = status.hourlyUsage / (status.hourlyUsage + status.hourlyRemaining);
      
      // Get recent rate limit hits
      const recentEvents = await storage.getAnalyticsEvents("system", {
        marketplace,
        eventType: "rate_limit_rate_limit_hit",
        startDate: new Date(Date.now() - 3600000), // Last hour
        endDate: new Date(),
      });

      let healthStatus = "healthy";
      if (status.isLimited) {
        healthStatus = "critical";
        criticalCount++;
      } else if (utilizationRate > 0.8) {
        healthStatus = "warning";
        warningCount++;
      }

      marketplaceStatuses[marketplace] = {
        status: healthStatus,
        utilizationRate: Math.round(utilizationRate * 100),
        rateLimitHits: recentEvents.length,
        lastHit: recentEvents.length > 0 ? recentEvents[0].createdAt : undefined,
      };

      // Generate recommendations
      if (healthStatus === "critical") {
        recommendations.push(`${marketplace}: Rate limit exceeded. Consider redistributing posts to off-peak hours.`);
      } else if (healthStatus === "warning") {
        recommendations.push(`${marketplace}: High usage detected. Monitor closely and consider reducing velocity.`);
      }
    }

    let overallHealth: "healthy" | "warning" | "critical" = "healthy";
    if (criticalCount > 0) {
      overallHealth = "critical";
    } else if (warningCount > 0) {
      overallHealth = "warning";
    }

    return {
      overallHealth,
      marketplaceStatuses,
      recommendations,
    };
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldAnalytics(olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 86400000));
    
    // In a real implementation, this would delete old analytics events
    // For now, we'll just return a placeholder
    console.log(`Would clean up analytics data older than ${cutoffDate.toISOString()}`);
    
    return { deletedCount: 0 };
  }
}

export const rateLimitAnalyticsService = new RateLimitAnalyticsService();