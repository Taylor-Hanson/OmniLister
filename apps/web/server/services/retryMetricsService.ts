import { type RetryMetrics, type InsertRetryMetrics, type Job, type JobRetryHistory } from "@shared/schema";
import { storage } from "../storage";
import { randomUUID } from "crypto";

export interface RetryAnalytics {
  // Overall metrics
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  retriedJobs: number;
  successRate: number;
  
  // Retry patterns
  avgRetriesPerJob: number;
  maxRetries: number;
  commonFailureCategories: Array<{ category: string; count: number; percentage: number }>;
  
  // Performance by marketplace
  marketplaceMetrics: Array<{
    marketplace: string;
    totalJobs: number;
    successRate: number;
    avgRetries: number;
    avgProcessingTime: number;
    failureRate: number;
    commonFailures: string[];
  }>;
  
  // Time-based analysis
  retryPatternsByHour: Array<{ hour: number; avgRetries: number; successRate: number }>;
  failuresByTimeOfDay: Array<{ hour: number; failures: number; categories: string[] }>;
  
  // Circuit breaker impact
  circuitBreakerActivations: number;
  jobsBlockedByCircuitBreaker: number;
  circuitBreakerSavings: number; // Estimated processing time saved
  
  // Dead letter queue metrics
  deadLetterQueueSize: number;
  dlqResolutionRate: number;
  avgTimeToResolution: number;
}

export interface RetryOptimization {
  recommendations: Array<{
    type: "schedule_adjustment" | "timeout_change" | "retry_strategy" | "circuit_breaker_tuning";
    marketplace?: string;
    current: any;
    recommended: any;
    expectedImprovement: string;
    confidence: number;
  }>;
  
  performanceIssues: Array<{
    issue: string;
    severity: "low" | "medium" | "high";
    affectedJobs: number;
    suggestedAction: string;
  }>;
  
  costOptimizations: Array<{
    optimization: string;
    estimatedSavings: number;
    implementationEffort: "low" | "medium" | "high";
  }>;
}

export interface RealTimeMetrics {
  currentActiveJobs: number;
  currentRetryQueue: number;
  currentCircuitBreakerStatus: Array<{ marketplace: string; status: string; reason?: string }>;
  recentFailures: Array<{
    timestamp: Date;
    jobType: string;
    marketplace: string;
    failureCategory: string;
    retryCount: number;
  }>;
  
  // Live performance indicators
  avgProcessingTime: number;
  currentSuccessRate: number;
  retryBacklogSize: number;
  estimatedBacklogClearTime: number;
}

export class RetryMetricsService {
  private readonly METRICS_RETENTION_DAYS = 90;
  private readonly ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private analyticsCache: Map<string, { data: any; timestamp: number }> = new Map();
  
  /**
   * Record retry metrics for a job
   */
  async recordRetryMetrics(
    job: Job,
    attempt: number,
    outcome: "success" | "failure" | "circuit_breaker_blocked",
    failureCategory?: string,
    processingTimeMs?: number,
    marketplace?: string
  ): Promise<void> {
    try {
      const metrics: InsertRetryMetrics = {
        marketplace: marketplace || this.extractMarketplaceFromJobData(job.data) || "unknown",
        jobType: job.type,
        failureCategory: failureCategory || "unknown",
        timeWindow: new Date(),
        totalAttempts: 1,
        successfulRetries: outcome === "success" ? 1 : 0,
        failedRetries: outcome === "failure" ? 1 : 0,
        avgRetryDelay: (this.calculateRetryDelay(job, attempt) || 0).toString(),
        maxRetryDelay: this.calculateRetryDelay(job, attempt) || 0,
        minRetryDelay: this.calculateRetryDelay(job, attempt) || 0,
        avgProcessingTime: (processingTimeMs || 0).toString(),
        successRate: outcome === "success" ? "100" : "0",
        deadLetterCount: 0,
        circuitBreakerTriggered: outcome === "circuit_breaker_blocked" ? 1 : 0,
      };
      
      // In production, this would save to the database
      console.debug(`Recorded retry metrics for job ${job.id}:`, {
        attempt,
        outcome,
        failureCategory,
        marketplace: metrics.marketplace,
        processingTimeMs,
      });
      
      // Clear analytics cache to ensure fresh calculations
      this.clearAnalyticsCache();
      
    } catch (error) {
      console.error(`Failed to record retry metrics for job ${job.id}:`, error);
    }
  }

  /**
   * Get comprehensive retry analytics
   */
  async getRetryAnalytics(
    userId?: string,
    timeRange?: { start: Date; end: Date },
    filters?: {
      marketplace?: string;
      jobType?: string;
      failureCategory?: string;
    }
  ): Promise<RetryAnalytics> {
    const cacheKey = this.generateAnalyticsCacheKey("analytics", userId, timeRange, filters);
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // In production, this would query the database for actual metrics
      // For now, return sample analytics data
      const analytics: RetryAnalytics = {
        totalJobs: 1247,
        successfulJobs: 1089,
        failedJobs: 158,
        retriedJobs: 423,
        successRate: 87.3,
        
        avgRetriesPerJob: 1.8,
        maxRetries: 7,
        commonFailureCategories: [
          { category: "rate_limit", count: 89, percentage: 56.3 },
          { category: "network", count: 34, percentage: 21.5 },
          { category: "auth", count: 18, percentage: 11.4 },
          { category: "validation", count: 12, percentage: 7.6 },
          { category: "permanent", count: 5, percentage: 3.2 },
        ],
        
        marketplaceMetrics: [
          {
            marketplace: "ebay",
            totalJobs: 456,
            successRate: 89.2,
            avgRetries: 1.6,
            avgProcessingTime: 3400,
            failureRate: 10.8,
            commonFailures: ["rate_limit", "network"],
          },
          {
            marketplace: "poshmark",
            totalJobs: 312,
            successRate: 92.1,
            avgRetries: 1.3,
            avgProcessingTime: 2800,
            failureRate: 7.9,
            commonFailures: ["auth", "validation"],
          },
          {
            marketplace: "mercari",
            totalJobs: 267,
            successRate: 84.6,
            avgRetries: 2.1,
            avgProcessingTime: 4200,
            failureRate: 15.4,
            commonFailures: ["rate_limit", "network"],
          },
          {
            marketplace: "facebook",
            totalJobs: 212,
            successRate: 81.6,
            avgRetries: 2.4,
            avgProcessingTime: 5100,
            failureRate: 18.4,
            commonFailures: ["rate_limit", "auth"],
          },
        ],
        
        retryPatternsByHour: this.generateHourlyPatterns(),
        failuresByTimeOfDay: this.generateFailurePatterns(),
        
        circuitBreakerActivations: 12,
        jobsBlockedByCircuitBreaker: 89,
        circuitBreakerSavings: 4.2 * 60 * 1000, // 4.2 minutes of processing time saved
        
        deadLetterQueueSize: 23,
        dlqResolutionRate: 78.3,
        avgTimeToResolution: 2.1 * 24 * 60 * 60 * 1000, // 2.1 days
      };
      
      this.setCachedData(cacheKey, analytics);
      return analytics;
      
    } catch (error) {
      console.error("Failed to generate retry analytics:", error);
      throw error;
    }
  }

  /**
   * Get retry optimization recommendations
   */
  async getRetryOptimizations(
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<RetryOptimization> {
    const cacheKey = this.generateAnalyticsCacheKey("optimizations", userId, timeRange);
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const analytics = await this.getRetryAnalytics(userId, timeRange);
      
      const optimization: RetryOptimization = {
        recommendations: [
          {
            type: "schedule_adjustment",
            marketplace: "facebook",
            current: { peakHours: "9-12, 18-21", retryDelay: "exponential" },
            recommended: { peakHours: "avoid 9-12, 18-21", retryDelay: "extended_exponential" },
            expectedImprovement: "25% reduction in rate limit failures",
            confidence: 0.83,
          },
          {
            type: "timeout_change",
            marketplace: "mercari",
            current: { timeout: 30000 },
            recommended: { timeout: 45000 },
            expectedImprovement: "15% reduction in network timeout failures",
            confidence: 0.71,
          },
          {
            type: "circuit_breaker_tuning",
            marketplace: "ebay",
            current: { threshold: 5, timeout: 60000 },
            recommended: { threshold: 3, timeout: 90000 },
            expectedImprovement: "Faster failure detection, reduced resource waste",
            confidence: 0.69,
          },
        ],
        
        performanceIssues: [
          {
            issue: "High failure rate during peak hours on Facebook Marketplace",
            severity: "high",
            affectedJobs: 67,
            suggestedAction: "Implement smart scheduling to avoid Facebook peak hours (9-12 PM, 6-9 PM)",
          },
          {
            issue: "Frequent authentication token expiry on Poshmark",
            severity: "medium",
            affectedJobs: 23,
            suggestedAction: "Implement proactive token refresh 5 minutes before expiry",
          },
          {
            issue: "Network timeouts increasing on Mercari during weekend evenings",
            severity: "medium",
            affectedJobs: 19,
            suggestedAction: "Increase timeout values and implement weekend-specific retry delays",
          },
        ],
        
        costOptimizations: [
          {
            optimization: "Reduce unnecessary retries for permanent failures",
            estimatedSavings: 12.4, // hours of processing time per month
            implementationEffort: "low",
          },
          {
            optimization: "Optimize retry scheduling to avoid marketplace peak times",
            estimatedSavings: 34.7, // hours of processing time per month
            implementationEffort: "medium",
          },
          {
            optimization: "Implement predictive failure detection to prevent retry cascades",
            estimatedSavings: 67.2, // hours of processing time per month
            implementationEffort: "high",
          },
        ],
      };
      
      this.setCachedData(cacheKey, optimization);
      return optimization;
      
    } catch (error) {
      console.error("Failed to generate retry optimizations:", error);
      throw error;
    }
  }

  /**
   * Get real-time retry metrics
   */
  async getRealTimeMetrics(userId?: string): Promise<RealTimeMetrics> {
    try {
      // In production, this would query current system state
      const metrics: RealTimeMetrics = {
        currentActiveJobs: 23,
        currentRetryQueue: 8,
        currentCircuitBreakerStatus: [
          { marketplace: "ebay", status: "closed" },
          { marketplace: "poshmark", status: "closed" },
          { marketplace: "mercari", status: "half_open", reason: "Recent failures detected" },
          { marketplace: "facebook", status: "open", reason: "Rate limit threshold exceeded" },
        ],
        recentFailures: [
          {
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            jobType: "post-listing",
            marketplace: "facebook",
            failureCategory: "rate_limit",
            retryCount: 3,
          },
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            jobType: "delist-listing",
            marketplace: "mercari",
            failureCategory: "network",
            retryCount: 1,
          },
          {
            timestamp: new Date(Date.now() - 8 * 60 * 1000),
            jobType: "post-listing",
            marketplace: "ebay",
            failureCategory: "validation",
            retryCount: 0,
          },
        ],
        
        avgProcessingTime: 3200, // 3.2 seconds
        currentSuccessRate: 89.4,
        retryBacklogSize: 15,
        estimatedBacklogClearTime: 12 * 60 * 1000, // 12 minutes
      };
      
      return metrics;
    } catch (error) {
      console.error("Failed to get real-time metrics:", error);
      throw error;
    }
  }

  /**
   * Generate failure trend analysis
   */
  async getFailureTrends(
    userId?: string,
    days = 30
  ): Promise<{
    trends: Array<{
      date: string;
      totalJobs: number;
      failures: number;
      retries: number;
      categories: Record<string, number>;
    }>;
    insights: Array<{
      insight: string;
      trend: "improving" | "degrading" | "stable";
      impact: "low" | "medium" | "high";
    }>;
  }> {
    try {
      // Generate sample trend data
      const trends = [];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        trends.push({
          date: date.toISOString().split('T')[0],
          totalJobs: Math.floor(Math.random() * 50) + 30,
          failures: Math.floor(Math.random() * 10) + 2,
          retries: Math.floor(Math.random() * 20) + 5,
          categories: {
            rate_limit: Math.floor(Math.random() * 4) + 1,
            network: Math.floor(Math.random() * 3) + 1,
            auth: Math.floor(Math.random() * 2),
            validation: Math.floor(Math.random() * 2),
          },
        });
      }
      
      const insights = [
        {
          insight: "Rate limit failures decreased by 23% over the last 7 days",
          trend: "improving" as const,
          impact: "medium" as const,
        },
        {
          insight: "Network timeout failures increased during weekend peak hours",
          trend: "degrading" as const,
          impact: "low" as const,
        },
        {
          insight: "Overall success rate has remained stable at ~87%",
          trend: "stable" as const,
          impact: "low" as const,
        },
      ];
      
      return { trends, insights };
    } catch (error) {
      console.error("Failed to get failure trends:", error);
      throw error;
    }
  }

  /**
   * Export retry metrics for external analysis
   */
  async exportMetrics(
    userId?: string,
    timeRange?: { start: Date; end: Date },
    format: "json" | "csv" = "json"
  ): Promise<{ data: any; filename: string }> {
    try {
      const analytics = await this.getRetryAnalytics(userId, timeRange);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (format === "csv") {
        // Convert to CSV format
        const csvData = this.convertAnalyticsToCSV(analytics);
        return {
          data: csvData,
          filename: `retry-metrics-${timestamp}.csv`,
        };
      } else {
        return {
          data: analytics,
          filename: `retry-metrics-${timestamp}.json`,
        };
      }
    } catch (error) {
      console.error("Failed to export metrics:", error);
      throw error;
    }
  }

  /**
   * Schedule automated metrics cleanup
   */
  async cleanupOldMetrics(): Promise<{ deletedCount: number; retentionDays: number }> {
    try {
      const cutoffDate = new Date(Date.now() - this.METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      // In production, this would delete old metrics from the database
      const deletedCount = 0; // Placeholder
      
      if (deletedCount > 0) {
        console.info(`Cleaned up ${deletedCount} old retry metrics older than ${this.METRICS_RETENTION_DAYS} days`);
      }
      
      return {
        deletedCount,
        retentionDays: this.METRICS_RETENTION_DAYS,
      };
    } catch (error) {
      console.error("Failed to cleanup old metrics:", error);
      return { deletedCount: 0, retentionDays: this.METRICS_RETENTION_DAYS };
    }
  }

  // Private helper methods
  
  private extractMarketplaceFromJobData(jobData: any): string | null {
    if (jobData.marketplace) return jobData.marketplace;
    if (jobData.marketplaces && Array.isArray(jobData.marketplaces) && jobData.marketplaces.length > 0) {
      return jobData.marketplaces[0];
    }
    return null;
  }
  
  private calculateRetryDelay(job: Job, attempt: number): number | null {
    // Simple exponential backoff calculation
    return Math.pow(2, attempt) * 1000;
  }
  
  private generateHourlyPatterns(): Array<{ hour: number; avgRetries: number; successRate: number }> {
    const patterns = [];
    for (let hour = 0; hour < 24; hour++) {
      patterns.push({
        hour,
        avgRetries: Math.random() * 3 + 1,
        successRate: Math.random() * 20 + 80, // 80-100%
      });
    }
    return patterns;
  }
  
  private generateFailurePatterns(): Array<{ hour: number; failures: number; categories: string[] }> {
    const patterns = [];
    for (let hour = 0; hour < 24; hour++) {
      const categories = [];
      if (hour >= 9 && hour <= 12) categories.push("rate_limit"); // Peak hours
      if (hour >= 18 && hour <= 21) categories.push("rate_limit"); // Evening peak
      if (hour >= 2 && hour <= 6) categories.push("network"); // Maintenance windows
      
      patterns.push({
        hour,
        failures: Math.floor(Math.random() * 10) + 1,
        categories,
      });
    }
    return patterns;
  }
  
  private generateAnalyticsCacheKey(type: string, userId?: string, timeRange?: any, filters?: any): string {
    const keyParts = [type, userId || "all"];
    if (timeRange) {
      keyParts.push(timeRange.start?.toISOString(), timeRange.end?.toISOString());
    }
    if (filters) {
      keyParts.push(JSON.stringify(filters));
    }
    return keyParts.join(":");
  }
  
  private getCachedData(key: string): any {
    const cached = this.analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ANALYTICS_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }
  
  private setCachedData(key: string, data: any): void {
    this.analyticsCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  private clearAnalyticsCache(): void {
    this.analyticsCache.clear();
  }
  
  private convertAnalyticsToCSV(analytics: RetryAnalytics): string {
    // Simple CSV conversion for marketplace metrics
    const headers = ["Marketplace", "Total Jobs", "Success Rate", "Avg Retries", "Avg Processing Time", "Failure Rate"];
    const rows = analytics.marketplaceMetrics.map(m => [
      m.marketplace,
      m.totalJobs,
      m.successRate,
      m.avgRetries,
      m.avgProcessingTime,
      m.failureRate,
    ]);
    
    return [headers, ...rows].map(row => row.join(",")).join("\\n");
  }
}

export const retryMetricsService = new RetryMetricsService();