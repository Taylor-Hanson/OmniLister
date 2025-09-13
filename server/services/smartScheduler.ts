import { 
  type Job, 
  type MarketplacePostingRules, 
  type PostingSuccessAnalytics,
  type RateLimitTracker,
  type QueueDistribution,
  type User,
  type Listing
} from "@shared/schema";
import { storage } from "../storage";
import { marketplaces } from "@shared/marketplaceConfig";
import { randomUUID } from "crypto";
import { rateLimitService, type RateLimitStatus } from "./rateLimitService";
import { optimizationEngine } from "./optimizationEngine";
import { patternAnalysisService } from "./patternAnalysisService";
import { recommendationService } from "./recommendationService";

interface OptimalWindow {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
  score: number; // 0-100, higher is better
}

interface SchedulingContext {
  user: User;
  listing: Listing;
  requestedMarketplaces: string[];
  requestedTime?: Date;
  priority: number;
}

interface SmartScheduleResult {
  scheduledJobs: Array<{
    marketplace: string;
    scheduledFor: Date;
    reasoning: string;
    confidenceScore: number;
    estimatedSuccessRate: number;
  }>;
  totalDelay: number;
  distributionStrategy: string;
}

export class SmartScheduler {
  private readonly TIME_SLOT_MINUTES = 15; // 15-minute time slots
  private readonly MAX_LOOK_AHEAD_DAYS = 7; // Look up to 7 days ahead for optimal times
  private readonly MIN_DELAY_BETWEEN_MARKETPLACES = 60; // Minimum 1 minute between marketplace posts

  // Default optimal posting windows based on marketplace research
  private readonly DEFAULT_POSTING_RULES: Record<string, OptimalWindow[]> = {
    ebay: [
      { dayOfWeek: 0, startHour: 17, endHour: 21, timezone: "America/New_York", score: 95 }, // Sunday evening
      { dayOfWeek: 6, startHour: 10, endHour: 15, timezone: "America/New_York", score: 85 }, // Saturday afternoon
      { dayOfWeek: 1, startHour: 19, endHour: 22, timezone: "America/New_York", score: 80 }, // Monday evening
    ],
    poshmark: [
      { dayOfWeek: 6, startHour: 10, endHour: 16, timezone: "America/Los_Angeles", score: 90 }, // Saturday day
      { dayOfWeek: 0, startHour: 12, endHour: 18, timezone: "America/Los_Angeles", score: 88 }, // Sunday afternoon
      { dayOfWeek: 4, startHour: 17, endHour: 20, timezone: "America/Los_Angeles", score: 75 }, // Friday evening
    ],
    mercari: [
      { dayOfWeek: 6, startHour: 9, endHour: 17, timezone: "America/Los_Angeles", score: 85 }, // Saturday day
      { dayOfWeek: 0, startHour: 11, endHour: 19, timezone: "America/Los_Angeles", score: 83 }, // Sunday day
      { dayOfWeek: 3, startHour: 18, endHour: 21, timezone: "America/Los_Angeles", score: 70 }, // Wednesday evening
    ],
    facebook: [
      { dayOfWeek: 6, startHour: 9, endHour: 12, timezone: "America/New_York", score: 80 }, // Saturday morning
      { dayOfWeek: 0, startHour: 13, endHour: 17, timezone: "America/New_York", score: 78 }, // Sunday afternoon
      { dayOfWeek: 1, startHour: 18, endHour: 21, timezone: "America/New_York", score: 65 }, // Monday evening
    ],
    depop: [
      { dayOfWeek: 5, startHour: 16, endHour: 20, timezone: "Europe/London", score: 85 }, // Friday evening
      { dayOfWeek: 6, startHour: 11, endHour: 16, timezone: "Europe/London", score: 82 }, // Saturday afternoon
      { dayOfWeek: 0, startHour: 14, endHour: 18, timezone: "Europe/London", score: 75 }, // Sunday afternoon
    ],
    vinted: [
      { dayOfWeek: 6, startHour: 10, endHour: 16, timezone: "Europe/Berlin", score: 80 }, // Saturday day
      { dayOfWeek: 0, startHour: 12, endHour: 18, timezone: "Europe/Berlin", score: 78 }, // Sunday afternoon
      { dayOfWeek: 4, startHour: 17, endHour: 20, timezone: "Europe/Berlin", score: 70 }, // Friday evening
    ],
  };

  /**
   * Main entry point for intelligent scheduling
   */
  async scheduleJobs(context: SchedulingContext): Promise<SmartScheduleResult> {
    const { user, listing, requestedMarketplaces, requestedTime, priority } = context;
    
    // Emit smart scheduling start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'analysis_started',
          listingId: listing.id,
          listingTitle: listing.title,
          marketplaces: requestedMarketplaces,
          requestedTime: requestedTime?.toISOString(),
          priority,
          message: 'Analyzing optimal posting times...'
        }
      });
    }
    
    // Get marketplace posting rules, user analytics, rate limits, and optimization insights
    const [postingRules, userAnalytics, rateLimitStatuses, optimizationInsights, scheduleRecommendations] = await Promise.all([
      this.getMarketplacePostingRules(requestedMarketplaces),
      this.getUserSuccessAnalytics(user.id, requestedMarketplaces),
      this.getRateLimitStatuses(requestedMarketplaces),
      optimizationEngine.generateOptimizationInsights(user.id),
      this.getOptimizedScheduleRecommendations(user.id, listing, requestedMarketplaces),
    ]);
    
    // Emit data collection complete
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'data_collected',
          listingId: listing.id,
          rateLimitStatuses: Object.keys(rateLimitStatuses).map(marketplace => ({
            marketplace,
            healthy: rateLimitStatuses[marketplace].canMakeRequest,
            estimatedDelay: rateLimitStatuses[marketplace].estimatedDelay
          })),
          message: 'Rate limits and analytics analyzed'
        }
      });
    }

    // Emit optimal window calculation start
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'calculating_windows',
          listingId: listing.id,
          message: 'Calculating optimal posting windows...'
        }
      });
    }
    
    // Determine optimal time windows for each marketplace using optimization insights
    const optimalWindows = await this.calculateOptimalWindows(
      requestedMarketplaces,
      postingRules,
      userAnalytics,
      user.timezone || "UTC",
      listing.category,
      optimizationInsights,
      scheduleRecommendations
    );
    
    // Emit windows calculated
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'windows_calculated',
          listingId: listing.id,
          optimalWindows: Object.keys(optimalWindows).map(marketplace => ({
            marketplace,
            windowCount: optimalWindows[marketplace].length,
            bestScore: Math.max(...optimalWindows[marketplace].map(w => w.score))
          })),
          message: 'Optimal windows identified for each marketplace'
        }
      });
    }

    // Emit distribution start
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'distributing_jobs',
          listingId: listing.id,
          message: 'Applying intelligent distribution strategy...'
        }
      });
    }
    
    // Apply smart distribution strategy with rate limit awareness
    const scheduledJobs = await this.distributeAcrossTimeSlots(
      optimalWindows,
      rateLimitStatuses,
      requestedTime,
      priority
    );

    // Calculate metrics
    const totalDelay = this.calculateTotalDelay(scheduledJobs, requestedTime);
    const distributionStrategy = this.getDistributionStrategy(scheduledJobs);
    
    // Emit scheduling complete with results
    if (global.broadcastToUser) {
      global.broadcastToUser(user.id, {
        type: 'smart_schedule',
        data: {
          stage: 'scheduling_complete',
          listingId: listing.id,
          listingTitle: listing.title,
          scheduledJobs: scheduledJobs.map(job => ({
            marketplace: job.marketplace,
            scheduledFor: job.scheduledFor.toISOString(),
            reasoning: job.reasoning,
            confidenceScore: job.confidenceScore,
            estimatedSuccessRate: job.estimatedSuccessRate
          })),
          totalDelay,
          distributionStrategy,
          summary: {
            immediateJobs: scheduledJobs.filter(j => j.scheduledFor <= new Date(Date.now() + 60000)).length,
            delayedJobs: scheduledJobs.filter(j => j.scheduledFor > new Date(Date.now() + 60000)).length,
            averageConfidence: scheduledJobs.reduce((sum, j) => sum + j.confidenceScore, 0) / scheduledJobs.length,
            averageSuccessRate: scheduledJobs.reduce((sum, j) => sum + j.estimatedSuccessRate, 0) / scheduledJobs.length
          },
          message: `Smart scheduling complete: ${scheduledJobs.length} jobs optimally scheduled`
        }
      });
    }

    return {
      scheduledJobs,
      totalDelay,
      distributionStrategy,
    };
  }

  /**
   * Get marketplace posting rules (from DB or defaults)
   */
  private async getMarketplacePostingRules(marketplaceIds: string[]): Promise<Record<string, MarketplacePostingRules | null>> {
    const rules: Record<string, MarketplacePostingRules | null> = {};
    
    for (const marketplace of marketplaceIds) {
      try {
        // In production, this would fetch from the database
        // For now, we'll use default rules
        rules[marketplace] = null; // Will use defaults
      } catch (error) {
        console.warn(`Failed to fetch posting rules for ${marketplace}:`, error);
        rules[marketplace] = null;
      }
    }
    
    return rules;
  }

  /**
   * Get user's historical posting success data
   */
  private async getUserSuccessAnalytics(userId: string, marketplaceIds: string[]): Promise<PostingSuccessAnalytics[]> {
    try {
      // In production, this would query the posting success analytics table
      // For now, return empty array
      return [];
    } catch (error) {
      console.warn(`Failed to fetch user analytics for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get current rate limit status for marketplaces using the rate limit service
   */
  private async getRateLimitStatuses(marketplaceIds: string[]): Promise<Record<string, RateLimitStatus>> {
    const rateLimitStatuses: Record<string, RateLimitStatus> = {};
    
    await Promise.all(
      marketplaceIds.map(async (marketplace) => {
        try {
          rateLimitStatuses[marketplace] = await rateLimitService.getRateLimitStatus(marketplace);
        } catch (error) {
          console.warn(`Failed to get rate limit status for ${marketplace}:`, error);
          // Create a fallback status
          rateLimitStatuses[marketplace] = {
            marketplace,
            hourlyUsage: 0,
            dailyUsage: 0,
            minuteUsage: 0,
            hourlyRemaining: 100,
            dailyRemaining: 1000,
            minuteRemaining: 10,
            isLimited: false,
            resetTimes: {
              hourly: new Date(Date.now() + 3600000),
              daily: new Date(Date.now() + 86400000),
              minute: new Date(Date.now() + 60000),
            },
            nextAvailableSlot: new Date(),
            estimatedDelay: 0,
            canMakeRequest: true,
            backoffMultiplier: 1.0,
          };
        }
      })
    );
    
    return rateLimitStatuses;
  }

  /**
   * Calculate optimal posting windows for each marketplace using optimization insights
   */
  private async calculateOptimalWindows(
    marketplaceIds: string[],
    postingRules: Record<string, MarketplacePostingRules | null>,
    userAnalytics: PostingSuccessAnalytics[],
    userTimezone: string,
    category?: string | null,
    optimizationInsights?: any,
    scheduleRecommendations?: any
  ): Promise<Record<string, OptimalWindow[]>> {
    const windows: Record<string, OptimalWindow[]> = {};

    for (const marketplace of marketplaceIds) {
      const rules = postingRules[marketplace];
      const defaultWindows = this.DEFAULT_POSTING_RULES[marketplace] || [];
      
      let marketplaceWindows: OptimalWindow[] = [];
      
      if (rules && rules.optimalWindows) {
        // Use database rules if available
        marketplaceWindows = rules.optimalWindows as OptimalWindow[];
      } else {
        // Use default rules and enhance with user analytics
        marketplaceWindows = this.enhanceWindowsWithUserData(
          defaultWindows,
          userAnalytics.filter(a => a.marketplace === marketplace),
          category
        );
      }

      // Enhance with optimization insights if available
      if (optimizationInsights && scheduleRecommendations) {
        marketplaceWindows = await this.enhanceWindowsWithOptimization(
          marketplaceWindows,
          marketplace,
          category,
          optimizationInsights,
          scheduleRecommendations[marketplace]
        );
      }

      // Apply timezone conversion if needed
      windows[marketplace] = this.convertWindowsToUserTimezone(
        marketplaceWindows,
        userTimezone
      );
    }

    return windows;
  }

  /**
   * Enhance default posting windows with user's historical success data
   */
  private enhanceWindowsWithUserData(
    defaultWindows: OptimalWindow[],
    userAnalytics: PostingSuccessAnalytics[],
    category?: string | null
  ): OptimalWindow[] {
    if (userAnalytics.length === 0) {
      return defaultWindows;
    }

    // Analyze user's successful posting patterns
    const userPatterns = this.analyzeUserPostingPatterns(userAnalytics, category);
    
    // Combine default windows with user patterns
    return this.combineWindowSources(defaultWindows, userPatterns);
  }

  /**
   * Analyze user's historical posting patterns to find successful times
   */
  private analyzeUserPostingPatterns(analytics: PostingSuccessAnalytics[], category?: string | null): OptimalWindow[] {
    const patterns: Record<string, { count: number; totalScore: number }> = {};

    // Filter by category if specified
    const relevantAnalytics = category 
      ? analytics.filter(a => a.category === category)
      : analytics;

    // Group by day/hour patterns
    for (const record of relevantAnalytics) {
      const key = `${record.dayOfWeek}-${record.hourOfDay}`;
      if (!patterns[key]) {
        patterns[key] = { count: 0, totalScore: 0 };
      }
      
      patterns[key].count++;
      patterns[key].totalScore += Number(record.success_score || 0);
    }

    // Convert to optimal windows
    const windows: OptimalWindow[] = [];
    for (const [key, data] of Object.entries(patterns)) {
      if (data.count >= 3) { // Need at least 3 data points
        const [dayOfWeek, hourOfDay] = key.split('-').map(Number);
        const avgScore = data.totalScore / data.count;
        
        if (avgScore > 50) { // Only include reasonably successful patterns
          windows.push({
            dayOfWeek,
            startHour: hourOfDay,
            endHour: hourOfDay + 1,
            timezone: "UTC", // Will be converted later
            score: Math.min(90, avgScore), // Cap at 90 to leave room for proven defaults
          });
        }
      }
    }

    return windows;
  }

  /**
   * Combine default windows with user patterns
   */
  private combineWindowSources(defaultWindows: OptimalWindow[], userPatterns: OptimalWindow[]): OptimalWindow[] {
    const combined = [...defaultWindows];
    
    // Add user patterns that don't overlap significantly with defaults
    for (const userWindow of userPatterns) {
      const overlapsWithDefault = defaultWindows.some(defaultWindow =>
        Math.abs(defaultWindow.dayOfWeek - userWindow.dayOfWeek) <= 1 &&
        Math.abs(defaultWindow.startHour - userWindow.startHour) <= 2
      );
      
      if (!overlapsWithDefault) {
        combined.push(userWindow);
      }
    }

    // Sort by score (highest first)
    return combined.sort((a, b) => b.score - a.score);
  }

  /**
   * Convert posting windows to user's timezone
   */
  private convertWindowsToUserTimezone(windows: OptimalWindow[], userTimezone: string): OptimalWindow[] {
    return windows.map(window => {
      // In a full implementation, this would use a proper timezone library
      // For now, we'll keep the original timezone and note the conversion needed
      return {
        ...window,
        timezone: userTimezone, // Mark as converted to user timezone
      };
    });
  }

  /**
   * Distribute jobs across optimal time slots to avoid overwhelming marketplaces
   */
  private async distributeAcrossTimeSlots(
    optimalWindows: Record<string, OptimalWindow[]>,
    rateLimits: Record<string, RateLimitTracker | null>,
    requestedTime?: Date,
    priority: number = 0
  ): Promise<Array<{
    marketplace: string;
    scheduledFor: Date;
    reasoning: string;
    confidenceScore: number;
    estimatedSuccessRate: number;
  }>> {
    const now = new Date();
    const minTime = requestedTime || now;
    const scheduledJobs: Array<{
      marketplace: string;
      scheduledFor: Date;
      reasoning: string;
      confidenceScore: number;
      estimatedSuccessRate: number;
    }> = [];

    const marketplaces = Object.keys(optimalWindows);
    let lastScheduledTime = minTime;

    for (let i = 0; i < marketplaces.length; i++) {
      const marketplace = marketplaces[i];
      const windows = optimalWindows[marketplace];
      
      if (windows.length === 0) {
        // No optimal windows found, schedule immediately with delay
        const scheduledFor = new Date(lastScheduledTime.getTime() + (i * this.MIN_DELAY_BETWEEN_MARKETPLACES * 1000));
        scheduledJobs.push({
          marketplace,
          scheduledFor,
          reasoning: "No optimal windows found, scheduling with minimal delay",
          confidenceScore: 30,
          estimatedSuccessRate: 50,
        });
        lastScheduledTime = scheduledFor;
        continue;
      }

      // Find the best available time slot
      const optimalSlot = this.findOptimalTimeSlot(
        windows,
        lastScheduledTime,
        rateLimits[marketplace],
        priority
      );

      scheduledJobs.push({
        marketplace,
        scheduledFor: optimalSlot.scheduledFor,
        reasoning: optimalSlot.reasoning,
        confidenceScore: optimalSlot.confidenceScore,
        estimatedSuccessRate: optimalSlot.estimatedSuccessRate,
      });

      // Update last scheduled time with minimum delay
      lastScheduledTime = new Date(
        Math.max(
          optimalSlot.scheduledFor.getTime(),
          lastScheduledTime.getTime() + this.MIN_DELAY_BETWEEN_MARKETPLACES * 1000
        )
      );
    }

    return scheduledJobs;
  }

  /**
   * Find the optimal time slot for a specific marketplace
   */
  private findOptimalTimeSlot(
    windows: OptimalWindow[],
    minTime: Date,
    rateLimit: RateLimitTracker | null,
    priority: number
  ): {
    scheduledFor: Date;
    reasoning: string;
    confidenceScore: number;
    estimatedSuccessRate: number;
  } {
    const now = new Date();
    
    // Check if we can schedule in the immediate future
    for (const window of windows) {
      const nextOpportunity = this.getNextOpportunityInWindow(window, minTime);
      
      if (nextOpportunity && nextOpportunity.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
        // Within 24 hours - good opportunity
        return {
          scheduledFor: nextOpportunity,
          reasoning: `Optimal ${this.getDayName(window.dayOfWeek)} ${this.formatHour(window.startHour)}-${this.formatHour(window.endHour)} window (score: ${window.score})`,
          confidenceScore: window.score,
          estimatedSuccessRate: Math.min(95, window.score + 5),
        };
      }
    }

    // No immediate optimal window, find next best opportunity
    const bestWindow = windows[0]; // Highest scored window
    const nextOpportunity = this.getNextOpportunityInWindow(bestWindow, minTime);
    
    if (nextOpportunity) {
      const daysAway = Math.ceil((nextOpportunity.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        scheduledFor: nextOpportunity,
        reasoning: `Next optimal ${this.getDayName(bestWindow.dayOfWeek)} window in ${daysAway} day(s) (score: ${bestWindow.score})`,
        confidenceScore: Math.max(70, bestWindow.score - 10),
        estimatedSuccessRate: Math.min(90, bestWindow.score),
      };
    }

    // Fallback to immediate scheduling with delay
    const fallbackTime = new Date(minTime.getTime() + 5 * 60 * 1000); // 5 minutes delay
    return {
      scheduledFor: fallbackTime,
      reasoning: "No optimal window available, scheduling with short delay",
      confidenceScore: 40,
      estimatedSuccessRate: 60,
    };
  }

  /**
   * Get the next opportunity within a specific posting window
   */
  private getNextOpportunityInWindow(window: OptimalWindow, minTime: Date): Date | null {
    const now = new Date();
    const userNow = new Date(); // In production, convert to user's timezone

    // Find next occurrence of this day/time
    for (let daysAhead = 0; daysAhead <= this.MAX_LOOK_AHEAD_DAYS; daysAhead++) {
      const targetDate = new Date(userNow);
      targetDate.setDate(targetDate.getDate() + daysAhead);
      
      if (targetDate.getDay() === window.dayOfWeek) {
        // Found the right day of week
        for (let hour = window.startHour; hour < window.endHour; hour++) {
          const opportunity = new Date(targetDate);
          opportunity.setHours(hour, 0, 0, 0);
          
          if (opportunity >= minTime) {
            return opportunity;
          }
        }
      }
    }

    return null;
  }

  /**
   * Calculate total delay from requested time
   */
  private calculateTotalDelay(scheduledJobs: Array<{ scheduledFor: Date }>, requestedTime?: Date): number {
    if (!requestedTime) return 0;
    
    const earliestJob = scheduledJobs.reduce((earliest, job) => 
      job.scheduledFor < earliest.scheduledFor ? job : earliest
    );
    
    return Math.max(0, earliestJob.scheduledFor.getTime() - requestedTime.getTime());
  }

  /**
   * Determine the distribution strategy used
   */
  private getDistributionStrategy(scheduledJobs: Array<{ scheduledFor: Date; reasoning: string }>): string {
    const immediateJobs = scheduledJobs.filter(job => 
      job.scheduledFor.getTime() - Date.now() < 60 * 60 * 1000 // Within 1 hour
    ).length;
    
    if (immediateJobs === scheduledJobs.length) {
      return "immediate";
    } else if (immediateJobs > scheduledJobs.length / 2) {
      return "mixed";
    } else {
      return "optimized";
    }
  }

  /**
   * Helper methods for formatting
   */
  private getDayName(dayOfWeek: number): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek] || "Unknown";
  }

  private formatHour(hour: number): string {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  /**
   * Update posting success analytics after a job completes
   */
  async recordPostingSuccess(
    userId: string,
    marketplace: string,
    listingId: string,
    postedAt: Date,
    success: boolean,
    engagementData?: {
      views?: number;
      likes?: number;
      messages?: number;
      sold?: boolean;
      daysToSell?: number;
    }
  ): Promise<void> {
    try {
      const analytics = await storage.createPostingSuccessAnalytics(userId, {
        marketplace,
        listingId,
        postedAt,
        dayOfWeek: postedAt.getDay(),
        hourOfDay: postedAt.getHours(),
        views: engagementData?.views || 0,
        likes: engagementData?.likes || 0,
        messages: engagementData?.messages || 0,
        sold: engagementData?.sold || false,
        daysToSell: engagementData?.daysToSell,
        engagement_score: this.calculateEngagementScore(engagementData),
        success_score: this.calculateSuccessScore(success, engagementData),
        timezone: "UTC", // In production, use user's timezone
      });

      console.log(`Recorded posting analytics for ${marketplace}:`, analytics.id);
    } catch (error) {
      console.error("Failed to record posting success:", error);
    }
  }

  /**
   * Calculate engagement score based on interaction data
   */
  private calculateEngagementScore(data?: {
    views?: number;
    likes?: number;
    messages?: number;
  }): number {
    if (!data) return 0;
    
    const { views = 0, likes = 0, messages = 0 } = data;
    
    // Weighted scoring: messages worth most, then likes, then views
    const score = (messages * 10) + (likes * 3) + (views * 0.1);
    return Math.min(100, score); // Cap at 100
  }

  /**
   * Calculate success score based on outcome and engagement
   */
  private calculateSuccessScore(success: boolean, data?: {
    views?: number;
    likes?: number;
    messages?: number;
    sold?: boolean;
    daysToSell?: number;
  }): number {
    let score = success ? 70 : 30; // Base score
    
    if (data) {
      // Add engagement bonus
      const engagementScore = this.calculateEngagementScore(data);
      score += engagementScore * 0.3; // 30% weight for engagement
      
      // Add speed bonus if sold quickly
      if (data.sold && data.daysToSell) {
        if (data.daysToSell <= 1) score += 20;
        else if (data.daysToSell <= 7) score += 10;
        else if (data.daysToSell <= 30) score += 5;
      }
    }
    
    return Math.min(100, score);
  }

  /**
   * Enhance windows with optimization insights and recommendations
   */
  private async enhanceWindowsWithOptimization(
    baseWindows: OptimalWindow[],
    marketplace: string,
    category?: string | null,
    optimizationInsights?: any,
    marketplaceRecommendations?: any
  ): Promise<OptimalWindow[]> {
    try {
      // Start with base windows
      let optimizedWindows = [...baseWindows];

      // Apply optimization insights if available
      if (optimizationInsights) {
        // Boost window scores based on optimization insights
        optimizedWindows = optimizedWindows.map(window => ({
          ...window,
          score: this.adjustScoreBasedOnInsights(window, optimizationInsights, marketplace, category)
        }));

        // Add high-performing windows from insights
        if (optimizationInsights.bestPerformingTimes) {
          const newWindows = this.createWindowsFromInsights(
            optimizationInsights.bestPerformingTimes,
            marketplace,
            category
          );
          optimizedWindows = [...optimizedWindows, ...newWindows];
        }
      }

      // Apply marketplace-specific recommendations
      if (marketplaceRecommendations && marketplaceRecommendations.scheduleSuggestions) {
        optimizedWindows = this.applyScheduleRecommendations(
          optimizedWindows,
          marketplaceRecommendations.scheduleSuggestions
        );
      }

      // Remove duplicates and sort by score
      optimizedWindows = this.deduplicateAndSortWindows(optimizedWindows);

      // Limit to top performing windows (max 5 per marketplace)
      return optimizedWindows.slice(0, 5);
    } catch (error) {
      console.warn('Failed to enhance windows with optimization:', error);
      return baseWindows;
    }
  }

  /**
   * Adjust window score based on optimization insights
   */
  private adjustScoreBasedOnInsights(
    window: OptimalWindow,
    insights: any,
    marketplace: string,
    category?: string | null
  ): number {
    let adjustedScore = window.score;

    // Boost based on successful time patterns
    if (insights.timePatterns) {
      const timePattern = insights.timePatterns.find((p: any) => 
        p.dayOfWeek === window.dayOfWeek && 
        p.hourOfDay >= window.startHour && 
        p.hourOfDay <= window.endHour
      );
      
      if (timePattern && timePattern.successRate > 70) {
        adjustedScore += Math.min(15, timePattern.successRate - 70);
      }
    }

    // Boost based on marketplace performance
    if (insights.marketplacePerformance) {
      const marketplacePerf = insights.marketplacePerformance.find((mp: any) => mp.marketplace === marketplace);
      if (marketplacePerf && marketplacePerf.avgSuccessScore > 60) {
        adjustedScore += Math.min(10, (marketplacePerf.avgSuccessScore - 60) / 10);
      }
    }

    // Boost based on category performance
    if (category && insights.categoryPerformance) {
      const categoryPerf = insights.categoryPerformance.find((cp: any) => cp.category === category);
      if (categoryPerf && categoryPerf.avgSuccessScore > 65) {
        adjustedScore += Math.min(8, (categoryPerf.avgSuccessScore - 65) / 10);
      }
    }

    return Math.min(100, adjustedScore);
  }

  /**
   * Create new windows from optimization insights
   */
  private createWindowsFromInsights(
    bestTimes: any[],
    marketplace: string,
    category?: string | null
  ): OptimalWindow[] {
    return bestTimes
      .filter((time: any) => time.marketplace === marketplace && (!category || time.category === category))
      .map((time: any) => ({
        dayOfWeek: time.dayOfWeek,
        startHour: time.hourOfDay,
        endHour: time.hourOfDay + 1,
        timezone: "UTC",
        score: Math.min(95, time.successScore + 10) // Boost learned patterns but cap at 95
      }))
      .filter((window, index, arr) => 
        // Remove duplicates
        arr.findIndex(w => w.dayOfWeek === window.dayOfWeek && w.startHour === window.startHour) === index
      );
  }

  /**
   * Apply schedule recommendations to windows
   */
  private applyScheduleRecommendations(
    windows: OptimalWindow[],
    recommendations: any
  ): OptimalWindow[] {
    if (!recommendations || !Array.isArray(recommendations)) {
      return windows;
    }

    return windows.map(window => {
      const matchingRec = recommendations.find((rec: any) => 
        rec.dayOfWeek === window.dayOfWeek && 
        Math.abs(rec.suggestedHour - window.startHour) <= 1
      );

      if (matchingRec && matchingRec.confidence > 70) {
        return {
          ...window,
          score: window.score + (matchingRec.confidence - 70) / 5,
          startHour: matchingRec.suggestedHour,
          endHour: matchingRec.suggestedHour + 1
        };
      }

      return window;
    });
  }

  /**
   * Remove duplicate windows and sort by score
   */
  private deduplicateAndSortWindows(windows: OptimalWindow[]): OptimalWindow[] {
    const uniqueWindows = new Map<string, OptimalWindow>();

    windows.forEach(window => {
      const key = `${window.dayOfWeek}-${window.startHour}`;
      const existing = uniqueWindows.get(key);
      
      if (!existing || window.score > existing.score) {
        uniqueWindows.set(key, window);
      }
    });

    return Array.from(uniqueWindows.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get optimized schedule recommendations from the optimization engine
   */
  private async getOptimizedScheduleRecommendations(
    userId: string,
    listing: Listing,
    marketplaces: string[]
  ): Promise<any> {
    try {
      // Get schedule suggestions for this specific listing and marketplaces
      const scheduleRecommendations = await Promise.all(
        marketplaces.map(marketplace => 
          recommendationService.generateScheduleSuggestions(userId, {
            category: listing.category,
            marketplace,
            listingId: listing.id
          })
        )
      );

      // Combine recommendations by marketplace
      const combinedRecommendations: Record<string, any> = {};
      marketplaces.forEach((marketplace, index) => {
        combinedRecommendations[marketplace] = scheduleRecommendations[index];
      });

      return combinedRecommendations;
    } catch (error) {
      console.warn('Failed to get optimization recommendations:', error);
      return {};
    }
  }
}

export const smartScheduler = new SmartScheduler();