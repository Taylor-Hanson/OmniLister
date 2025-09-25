import { 
  type User, 
  type Listing, 
  type PostingSuccessAnalytics,
  type MarketplacePostingRules,
  type Job,
  type MarketplaceConnection
} from "../shared/schema.ts";
import { storage } from "../storage";
import { analyticsService } from "./analyticsService";
import { smartScheduler } from "./smartScheduler";
import { randomUUID } from "crypto";
import { subDays, format, getHours, getDay } from "date-fns";

// Core interfaces for optimization
export interface OptimizationInsight {
  type: 'timing' | 'pricing' | 'marketplace' | 'content' | 'seasonal';
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string; // Expected impact description
  recommendation: string;
  confidence: number; // 0-100
  data: any; // Supporting data for the insight
  actionable: boolean; // Whether this can be auto-applied
  estimatedImprovement: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvement: number; // percentage
  };
}

export interface OptimizationProfile {
  userId: string;
  bestMarketplaces: string[];
  optimalPostingTimes: Record<string, Array<{ hour: number; dayOfWeek: number; score: number }>>;
  priceOptimization: Record<string, { min: number; max: number; optimal: number; confidence: number }>;
  contentPatterns: {
    highPerformingTitles: string[];
    effectiveKeywords: string[];
    optimalDescriptionLength: number;
    imageCount: number;
  };
  seasonalTrends: Record<string, { bestMonths: number[]; worstMonths: number[]; multiplier: number }>;
  overallPerformanceScore: number; // 0-100
  lastOptimized: Date;
}

export interface LearningPattern {
  id: string;
  type: 'success_factor' | 'failure_pattern' | 'engagement_driver' | 'timing_pattern';
  marketplace: string;
  category?: string;
  pattern: any;
  confidence: number;
  samples: number;
  impact: number; // Statistical significance
  discovered: Date;
}

export interface OptimizationAction {
  id: string;
  userId: string;
  type: 'reschedule' | 'reprice' | 'repost' | 'optimize_content';
  targetId: string; // listing ID or job ID
  originalValue: any;
  optimizedValue: any;
  reasoning: string;
  expectedImprovement: number;
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: Date;
  results?: {
    metric: string;
    before: number;
    after: number;
    improvement: number;
  };
}

export class OptimizationEngine {
  private patterns: Map<string, LearningPattern[]> = new Map();
  private userProfiles: Map<string, OptimizationProfile> = new Map();
  
  // Result caching - 30 minutes expiration
  private cache: Map<string, { data: any; timestamp: number; expiresIn: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Get cached result or return null if expired/missing
   */
  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Cache result with expiration
   */
  private setCachedResult(key: string, data: any, expiresIn: number = this.CACHE_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
  }
  
  // Core optimization constants
  private readonly MIN_SAMPLE_SIZE = 10; // Minimum data points needed for reliable patterns
  private readonly CONFIDENCE_THRESHOLD = 70; // Minimum confidence for actionable insights
  private readonly UPDATE_FREQUENCY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  /**
   * Main optimization entry point - analyze all patterns and generate insights
   */
  async runOptimization(userId: string): Promise<{
    insights: OptimizationInsight[];
    actions: OptimizationAction[];
    profile: OptimizationProfile;
    patterns: LearningPattern[];
  }> {
    console.log(`🧠 Starting optimization analysis for user ${userId}`);

    // Check cache first (30 min expiration)
    const cacheKey = `optimization_analysis_${userId}`;
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log(`📋 Using cached optimization analysis for user ${userId}`);
      return cachedResult;
    }

    // Emit optimization start notification
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'optimization',
        data: {
          stage: 'analysis_started',
          message: 'Running intelligent optimization analysis...'
        }
      });
    }

    try {
      // 1. Gather comprehensive data
      const [
        successAnalytics,
        listings, 
        marketplaceMetrics,
        recentJobs,
        connections
      ] = await Promise.all([
        storage.getPostingSuccessAnalytics(userId),
        storage.getListings(userId),
        storage.getMarketplaceMetrics(userId),
        storage.getJobs(userId, { status: 'completed' }),
        storage.getMarketplaceConnections(userId)
      ]);

      // Emit data collection complete
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'optimization',
          data: {
            stage: 'data_collected',
            analytics: successAnalytics.length,
            listings: listings.length,
            jobs: recentJobs.length,
            message: 'Data collection complete, analyzing patterns...'
          }
        });
      }

      // 2. Discover new patterns
      const patterns = await this.discoverPatterns(userId, successAnalytics);
      this.patterns.set(userId, patterns);

      // Emit pattern analysis complete
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'optimization',
          data: {
            stage: 'patterns_discovered',
            patterns: patterns.length,
            highConfidence: patterns.filter(p => p.confidence > 80).length,
            message: `Discovered ${patterns.length} optimization patterns`
          }
        });
      }

      // 3. Build user optimization profile
      const profile = await this.buildOptimizationProfile(userId, successAnalytics, listings, patterns);
      this.userProfiles.set(userId, profile);

      // 4. Generate actionable insights
      const insights = await this.generateInsights(userId, patterns, profile, successAnalytics);

      // Emit insights generated
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'optimization',
          data: {
            stage: 'insights_generated',
            insights: insights.length,
            highPriority: insights.filter(i => i.priority === 'high').length,
            actionable: insights.filter(i => i.actionable).length,
            message: `Generated ${insights.length} optimization insights`
          }
        });
      }

      // 5. Generate automated optimization actions
      const actions = await this.generateOptimizationActions(userId, insights, listings, recentJobs);

      // Emit actions generated
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'optimization',
          data: {
            stage: 'actions_generated',
            actions: actions.length,
            autoApplicable: actions.filter(a => a.type === 'reschedule').length,
            message: 'Optimization analysis complete!'
          }
        });
      }

      // 6. Auto-apply safe optimizations if user has opted in
      await this.autoApplyOptimizations(userId, actions);

      console.log(`✅ Optimization complete for user ${userId}: ${insights.length} insights, ${actions.length} actions`);

      // Cache the result for 30 minutes to prevent redundant compute
      const result = { insights, actions, profile, patterns };
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      
      // Emit error notification
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'optimization',
          data: {
            stage: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Optimization analysis failed'
          }
        });
      }
      
      throw error;
    }
  }

  /**
   * Discover patterns from posting success analytics using ML techniques
   */
  private async discoverPatterns(userId: string, analytics: PostingSuccessAnalytics[]): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    if (analytics.length < this.MIN_SAMPLE_SIZE) {
      return patterns; // Not enough data for reliable patterns
    }

    // Group analytics by marketplace for analysis
    const byMarketplace = analytics.reduce((acc, record) => {
      if (!acc[record.marketplace]) acc[record.marketplace] = [];
      acc[record.marketplace].push(record);
      return acc;
    }, {} as Record<string, PostingSuccessAnalytics[]>);

    for (const [marketplace, records] of Object.entries(byMarketplace)) {
      if (records.length < this.MIN_SAMPLE_SIZE) continue;

      // 1. Timing patterns - when posts perform best
      const timingPattern = this.analyzeTimingPatterns(records, marketplace);
      if (timingPattern) patterns.push(timingPattern);

      // 2. Price range performance patterns
      const pricingPattern = this.analyzePricingPatterns(records, marketplace);
      if (pricingPattern) patterns.push(pricingPattern);

      // 3. Engagement driver patterns
      const engagementPattern = this.analyzeEngagementPatterns(records, marketplace);
      if (engagementPattern) patterns.push(engagementPattern);

      // 4. Category performance patterns
      const categoryPatterns = this.analyzeCategoryPatterns(records, marketplace);
      patterns.push(...categoryPatterns);

      // 5. Failure patterns - what leads to poor performance
      const failurePatterns = this.analyzeFailurePatterns(records, marketplace);
      patterns.push(...failurePatterns);
    }

    return patterns.filter(p => p.confidence >= 60); // Only return reliable patterns
  }

  /**
   * Analyze timing patterns to identify optimal posting windows
   */
  private analyzeTimingPatterns(records: PostingSuccessAnalytics[], marketplace: string): LearningPattern | null {
    // Group by hour of day and day of week
    const timingData = records.reduce((acc, record) => {
      const key = `${record.dayOfWeek}_${record.hourOfDay}`;
      if (!acc[key]) {
        acc[key] = {
          count: 0,
          totalEngagement: 0,
          totalSales: 0,
          successScore: 0,
          dayOfWeek: record.dayOfWeek,
          hourOfDay: record.hourOfDay
        };
      }
      
      acc[key].count++;
      acc[key].totalEngagement += parseFloat(record.engagement_score || '0');
      acc[key].totalSales += record.sold ? 1 : 0;
      acc[key].successScore += parseFloat(record.success_score || '0');
      
      return acc;
    }, {} as Record<string, any>);

    // Find best performing time slots
    const bestTimes = Object.values(timingData)
      .filter((slot: any) => slot.count >= 3) // Minimum samples per time slot
      .map((slot: any) => ({
        dayOfWeek: slot.dayOfWeek,
        hourOfDay: slot.hourOfDay,
        avgEngagement: slot.totalEngagement / slot.count,
        conversionRate: (slot.totalSales / slot.count) * 100,
        avgSuccessScore: slot.successScore / slot.count,
        samples: slot.count
      }))
      .sort((a, b) => b.avgSuccessScore - a.avgSuccessScore);

    if (bestTimes.length === 0) return null;

    // Calculate confidence based on sample size and score variance
    const totalSamples = bestTimes.reduce((sum, time) => sum + time.samples, 0);
    const topPerformers = bestTimes.slice(0, Math.min(5, bestTimes.length));
    const avgTopScore = topPerformers.reduce((sum, time) => sum + time.avgSuccessScore, 0) / topPerformers.length;
    const scoreVariance = topPerformers.reduce((sum, time) => sum + Math.pow(time.avgSuccessScore - avgTopScore, 2), 0) / topPerformers.length;
    
    const confidence = Math.min(95, 50 + (totalSamples * 2) - (scoreVariance * 10));

    return {
      id: randomUUID(),
      type: 'timing_pattern',
      marketplace,
      pattern: {
        optimalTimes: topPerformers,
        variance: scoreVariance,
        recommendation: `Best posting times: ${topPerformers.slice(0, 3).map(t => 
          `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][t.dayOfWeek]} ${t.hourOfDay}:00`
        ).join(', ')}`
      },
      confidence: Math.round(confidence),
      samples: totalSamples,
      impact: avgTopScore / 10, // Normalize to 0-10 scale
      discovered: new Date()
    };
  }

  /**
   * Analyze pricing patterns for optimal price points
   */
  private analyzePricingPatterns(records: PostingSuccessAnalytics[], marketplace: string): LearningPattern | null {
    // Group by category and price range
    const categoryPricing = records.reduce((acc, record) => {
      const category = record.category || 'Other';
      if (!acc[category]) acc[category] = { low: [], medium: [], high: [] };
      
      const range = record.priceRange || 'medium';
      if (['low', 'medium', 'high'].includes(range)) {
        acc[category][range as 'low' | 'medium' | 'high'].push(record);
      }
      
      return acc;
    }, {} as Record<string, Record<'low' | 'medium' | 'high', PostingSuccessAnalytics[]>>);

    const insights: any = {};
    let totalSamples = 0;
    
    for (const [category, ranges] of Object.entries(categoryPricing)) {
      const rangeStats = Object.entries(ranges).map(([range, items]) => {
        if (items.length === 0) return null;
        
        const avgEngagement = items.reduce((sum, item) => sum + parseFloat(item.engagement_score || '0'), 0) / items.length;
        const conversionRate = (items.filter(item => item.sold).length / items.length) * 100;
        const avgDaysToSell = items
          .filter(item => item.daysToSell)
          .reduce((sum, item) => sum + (item.daysToSell || 0), 0) / items.filter(item => item.daysToSell).length || 0;
          
        totalSamples += items.length;
        
        return {
          range,
          count: items.length,
          avgEngagement,
          conversionRate,
          avgDaysToSell,
          score: avgEngagement * (conversionRate / 100) * (avgDaysToSell > 0 ? 100 / avgDaysToSell : 1)
        };
      }).filter(Boolean);

      if (rangeStats.length > 0) {
        const bestRange = rangeStats.reduce((best, current) => current!.score > best!.score ? current : best)!;
        insights[category] = {
          bestRange: bestRange.range,
          performance: rangeStats,
          recommendation: `${category}: ${bestRange.range} price range performs best (${bestRange.conversionRate.toFixed(1)}% conversion)`
        };
      }
    }

    if (Object.keys(insights).length === 0) return null;

    return {
      id: randomUUID(),
      type: 'success_factor',
      marketplace,
      pattern: {
        categoryPricing: insights,
        overallRecommendation: `Optimize pricing based on category performance patterns`
      },
      confidence: Math.min(90, 40 + totalSamples),
      samples: totalSamples,
      impact: 7,
      discovered: new Date()
    };
  }

  /**
   * Analyze what drives engagement
   */
  private analyzeEngagementPatterns(records: PostingSuccessAnalytics[], marketplace: string): LearningPattern | null {
    if (records.length < this.MIN_SAMPLE_SIZE) return null;
    
    // Analyze engagement distribution
    const engagementScores = records.map(r => parseFloat(r.engagement_score || '0')).filter(s => s > 0);
    const avgEngagement = engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
    
    // Identify high-engagement posts (top 20%)
    const sortedEngagement = engagementScores.sort((a, b) => b - a);
    const top20Threshold = sortedEngagement[Math.floor(sortedEngagement.length * 0.2)];
    
    const highEngagementPosts = records.filter(r => parseFloat(r.engagement_score || '0') >= top20Threshold);
    
    // Look for common factors in high-engagement posts
    const factors = {
      categories: {} as Record<string, number>,
      brands: {} as Record<string, number>,
      priceRanges: {} as Record<string, number>,
      timings: {} as Record<string, number>
    };
    
    highEngagementPosts.forEach(post => {
      const category = post.category || 'Other';
      const brand = post.brand || 'Other';
      const priceRange = post.priceRange || 'medium';
      const timing = `${post.dayOfWeek}_${Math.floor(post.hourOfDay / 6)}`;  // 4 time blocks per day
      
      factors.categories[category] = (factors.categories[category] || 0) + 1;
      factors.brands[brand] = (factors.brands[brand] || 0) + 1;
      factors.priceRanges[priceRange] = (factors.priceRanges[priceRange] || 0) + 1;
      factors.timings[timing] = (factors.timings[timing] || 0) + 1;
    });
    
    // Find most impactful factors
    const topCategories = Object.entries(factors.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([cat, count]) => ({ category: cat, count }));
      
    return {
      id: randomUUID(),
      type: 'engagement_driver',
      marketplace,
      pattern: {
        avgEngagement,
        topCategories,
        highPerformanceThreshold: top20Threshold,
        keyFactors: factors,
        recommendation: `Focus on ${topCategories.map(c => c.category).join(', ')} for highest engagement`
      },
      confidence: Math.min(85, 50 + records.length),
      samples: records.length,
      impact: avgEngagement / 10,
      discovered: new Date()
    };
  }

  /**
   * Analyze category-specific performance patterns
   */
  private analyzeCategoryPatterns(records: PostingSuccessAnalytics[], marketplace: string): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    
    // Group by category
    const byCategory = records.reduce((acc, record) => {
      const category = record.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(record);
      return acc;
    }, {} as Record<string, PostingSuccessAnalytics[]>);

    for (const [category, categoryRecords] of Object.entries(byCategory)) {
      if (categoryRecords.length < 5) continue; // Need minimum samples per category
      
      const avgSuccess = categoryRecords.reduce((sum, r) => sum + parseFloat(r.success_score || '0'), 0) / categoryRecords.length;
      const conversionRate = (categoryRecords.filter(r => r.sold).length / categoryRecords.length) * 100;
      const avgViews = categoryRecords.reduce((sum, r) => sum + (r.views || 0), 0) / categoryRecords.length;
      
      // Compare with overall average
      const overallAvgSuccess = records.reduce((sum, r) => sum + parseFloat(r.success_score || '0'), 0) / records.length;
      const performanceIndex = (avgSuccess / overallAvgSuccess) * 100;
      
      if (Math.abs(performanceIndex - 100) > 20) { // Significant deviation
        patterns.push({
          id: randomUUID(),
          type: 'success_factor',
          marketplace,
          category,
          pattern: {
            avgSuccess,
            conversionRate,
            avgViews,
            performanceIndex,
            isOutperforming: performanceIndex > 100,
            recommendation: performanceIndex > 100 
              ? `${category} is a high-performing category - prioritize listings here`
              : `${category} underperforms - consider pricing/timing adjustments`
          },
          confidence: Math.min(80, 40 + categoryRecords.length),
          samples: categoryRecords.length,
          impact: Math.abs(performanceIndex - 100) / 10,
          discovered: new Date()
        });
      }
    }
    
    return patterns;
  }

  /**
   * Analyze failure patterns to avoid poor performance
   */
  private analyzeFailurePatterns(records: PostingSuccessAnalytics[], marketplace: string): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    
    // Identify low-performing posts (bottom 20%)
    const successScores = records.map(r => parseFloat(r.success_score || '0'));
    const sortedScores = successScores.sort((a, b) => a - b);
    const bottom20Threshold = sortedScores[Math.floor(sortedScores.length * 0.2)];
    
    const lowPerformingPosts = records.filter(r => parseFloat(r.success_score || '0') <= bottom20Threshold);
    
    if (lowPerformingPosts.length < 5) return patterns;
    
    // Analyze common failure factors
    const failureFactors = {
      timings: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      priceRanges: {} as Record<string, number>
    };
    
    lowPerformingPosts.forEach(post => {
      const timing = `${post.dayOfWeek}_${post.hourOfDay}`;
      const category = post.category || 'Other';
      const priceRange = post.priceRange || 'medium';
      
      failureFactors.timings[timing] = (failureFactors.timings[timing] || 0) + 1;
      failureFactors.categories[category] = (failureFactors.categories[category] || 0) + 1;
      failureFactors.priceRanges[priceRange] = (failureFactors.priceRanges[priceRange] || 0) + 1;
    });
    
    // Find most common failure patterns
    const worstTimings = Object.entries(failureFactors.timings)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([timing, count]) => ({ timing, count }));
    
    if (worstTimings.length > 0) {
      patterns.push({
        id: randomUUID(),
        type: 'failure_pattern',
        marketplace,
        pattern: {
          worstTimings,
          threshold: bottom20Threshold,
          failureRate: (lowPerformingPosts.length / records.length) * 100,
          recommendation: `Avoid posting during these times: ${worstTimings.map(t => {
            const [day, hour] = t.timing.split('_');
            return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(day)]} ${hour}:00`;
          }).join(', ')}`
        },
        confidence: Math.min(75, 30 + lowPerformingPosts.length),
        samples: lowPerformingPosts.length,
        impact: 6,
        discovered: new Date()
      });
    }
    
    return patterns;
  }

  /**
   * Build comprehensive optimization profile for user
   */
  private async buildOptimizationProfile(
    userId: string, 
    analytics: PostingSuccessAnalytics[], 
    listings: Listing[],
    patterns: LearningPattern[]
  ): Promise<OptimizationProfile> {
    // Extract best marketplaces from patterns
    const marketplaceScores = new Map<string, number>();
    patterns.forEach(pattern => {
      if (pattern.type === 'success_factor') {
        const current = marketplaceScores.get(pattern.marketplace) || 0;
        marketplaceScores.set(pattern.marketplace, current + pattern.impact);
      }
    });
    
    const bestMarketplaces = Array.from(marketplaceScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([marketplace]) => marketplace);

    // Extract optimal posting times
    const optimalPostingTimes: Record<string, Array<{ hour: number; dayOfWeek: number; score: number }>> = {};
    patterns
      .filter(p => p.type === 'timing_pattern')
      .forEach(pattern => {
        optimalPostingTimes[pattern.marketplace] = pattern.pattern.optimalTimes.map((time: any) => ({
          hour: time.hourOfDay,
          dayOfWeek: time.dayOfWeek,
          score: time.avgSuccessScore
        }));
      });

    // Calculate overall performance score
    const avgSuccessScore = analytics.length > 0 
      ? analytics.reduce((sum, a) => sum + parseFloat(a.success_score || '0'), 0) / analytics.length
      : 50;
    
    const conversionRate = analytics.length > 0
      ? (analytics.filter(a => a.sold).length / analytics.length) * 100
      : 0;
      
    const overallPerformanceScore = Math.round((avgSuccessScore + conversionRate) / 2);

    return {
      userId,
      bestMarketplaces,
      optimalPostingTimes,
      priceOptimization: {}, // Will be enhanced by recommendation service
      contentPatterns: {
        highPerformingTitles: [],
        effectiveKeywords: [],
        optimalDescriptionLength: 150,
        imageCount: 5
      },
      seasonalTrends: {},
      overallPerformanceScore,
      lastOptimized: new Date()
    };
  }

  /**
   * Generate actionable insights from patterns
   */
  private async generateInsights(
    userId: string,
    patterns: LearningPattern[],
    profile: OptimizationProfile,
    analytics: PostingSuccessAnalytics[]
  ): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];
    
    // Process each pattern into actionable insights
    for (const pattern of patterns) {
      const insight = this.patternToInsight(pattern, profile, analytics);
      if (insight && insight.confidence >= this.CONFIDENCE_THRESHOLD) {
        insights.push(insight);
      }
    }
    
    // Add performance summary insight
    if (analytics.length > 0) {
      const avgEngagement = analytics.reduce((sum, a) => sum + parseFloat(a.engagement_score || '0'), 0) / analytics.length;
      const conversionRate = (analytics.filter(a => a.sold).length / analytics.length) * 100;
      
      insights.unshift({
        type: 'marketplace',
        priority: 'high',
        category: 'Performance Overview',
        title: 'Overall Posting Performance Analysis',
        description: `Based on ${analytics.length} posts across ${profile.bestMarketplaces.length} marketplaces`,
        impact: `Current performance score: ${profile.overallPerformanceScore}/100`,
        recommendation: profile.overallPerformanceScore > 75 
          ? 'Excellent performance! Focus on scaling successful patterns.'
          : profile.overallPerformanceScore > 50
            ? 'Good performance with room for optimization. Apply recommended improvements.'
            : 'Significant optimization opportunities identified. Implement high-priority recommendations.',
        confidence: 95,
        data: {
          avgEngagement,
          conversionRate,
          totalPosts: analytics.length,
          marketplaces: profile.bestMarketplaces.length
        },
        actionable: false,
        estimatedImprovement: {
          metric: 'Overall Performance Score',
          currentValue: profile.overallPerformanceScore,
          projectedValue: Math.min(100, profile.overallPerformanceScore + 15),
          improvement: 15
        }
      });
    }
    
    return insights.sort((a, b) => {
      // Sort by priority and confidence
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Convert a learned pattern into an actionable insight
   */
  private patternToInsight(
    pattern: LearningPattern, 
    profile: OptimizationProfile, 
    analytics: PostingSuccessAnalytics[]
  ): OptimizationInsight | null {
    switch (pattern.type) {
      case 'timing_pattern':
        return {
          type: 'timing',
          priority: pattern.confidence > 80 ? 'high' : 'medium',
          category: `${pattern.marketplace} Timing`,
          title: `Optimal Posting Times for ${pattern.marketplace}`,
          description: `Analysis of ${pattern.samples} posts reveals peak performance windows`,
          impact: `Up to ${Math.round(pattern.impact * 10)}% improvement in engagement`,
          recommendation: pattern.pattern.recommendation,
          confidence: pattern.confidence,
          data: pattern.pattern,
          actionable: true,
          estimatedImprovement: {
            metric: 'Engagement Score',
            currentValue: 50,
            projectedValue: 50 + pattern.impact,
            improvement: (pattern.impact / 50) * 100
          }
        };

      case 'success_factor':
        return {
          type: pattern.category ? 'content' : 'marketplace',
          priority: pattern.impact > 5 ? 'high' : 'medium',
          category: pattern.category || `${pattern.marketplace} Performance`,
          title: pattern.category 
            ? `${pattern.category} Category Optimization` 
            : `${pattern.marketplace} Success Factors`,
          description: `Identified key performance drivers based on ${pattern.samples} data points`,
          impact: `${Math.round(pattern.impact)}x performance multiplier potential`,
          recommendation: pattern.pattern.recommendation,
          confidence: pattern.confidence,
          data: pattern.pattern,
          actionable: true,
          estimatedImprovement: {
            metric: 'Success Rate',
            currentValue: 60,
            projectedValue: 60 + (pattern.impact * 5),
            improvement: (pattern.impact * 5 / 60) * 100
          }
        };

      case 'failure_pattern':
        return {
          type: 'timing',
          priority: 'medium',
          category: `${pattern.marketplace} Avoidance`,
          title: `Avoid Low-Performance Windows`,
          description: `Identified timing patterns that lead to poor performance`,
          impact: `Avoid ${Math.round(pattern.pattern.failureRate)}% failure rate`,
          recommendation: pattern.pattern.recommendation,
          confidence: pattern.confidence,
          data: pattern.pattern,
          actionable: true,
          estimatedImprovement: {
            metric: 'Failure Avoidance',
            currentValue: pattern.pattern.failureRate,
            projectedValue: pattern.pattern.failureRate * 0.5,
            improvement: 50
          }
        };

      case 'engagement_driver':
        return {
          type: 'content',
          priority: 'medium',
          category: `${pattern.marketplace} Engagement`,
          title: `Content Optimization Opportunities`,
          description: `Analysis reveals engagement patterns across ${pattern.samples} posts`,
          impact: `${Math.round(pattern.impact * 10)}% engagement boost potential`,
          recommendation: pattern.pattern.recommendation,
          confidence: pattern.confidence,
          data: pattern.pattern,
          actionable: false, // Requires manual content optimization
          estimatedImprovement: {
            metric: 'Engagement Score',
            currentValue: pattern.pattern.avgEngagement,
            projectedValue: pattern.pattern.avgEngagement * 1.2,
            improvement: 20
          }
        };

      default:
        return null;
    }
  }

  /**
   * Generate automated optimization actions
   */
  private async generateOptimizationActions(
    userId: string,
    insights: OptimizationInsight[],
    listings: Listing[],
    recentJobs: Job[]
  ): Promise<OptimizationAction[]> {
    const actions: OptimizationAction[] = [];
    
    // Find actionable timing insights
    const timingInsights = insights.filter(i => i.type === 'timing' && i.actionable && i.confidence > 80);
    
    // Find pending jobs that can be optimized
    const pendingJobs = recentJobs.filter(job => 
      job.status === 'pending' && 
      job.scheduledFor && 
      new Date(job.scheduledFor) > new Date()
    );

    for (const job of pendingJobs) {
      const marketplaces = (job.data as any)?.marketplaces || [];
      
      for (const marketplace of marketplaces) {
        const relevantInsight = timingInsights.find(insight => 
          insight.data?.optimalTimes && 
          insight.category.includes(marketplace)
        );
        
        if (relevantInsight) {
          const optimalTimes = relevantInsight.data.optimalTimes || [];
          const currentSchedule = new Date(job.scheduledFor!);
          
          // Find next optimal time
          const nextOptimalTime = this.findNextOptimalTime(optimalTimes, currentSchedule);
          
          if (nextOptimalTime && Math.abs(nextOptimalTime.getTime() - currentSchedule.getTime()) > 60000) {
            actions.push({
              id: randomUUID(),
              userId,
              type: 'reschedule',
              targetId: job.id,
              originalValue: job.scheduledFor,
              optimizedValue: nextOptimalTime,
              reasoning: `Reschedule to optimal window (${relevantInsight.confidence}% confidence)`,
              expectedImprovement: relevantInsight.estimatedImprovement.improvement,
              status: 'pending'
            });
          }
        }
      }
    }
    
    return actions;
  }

  /**
   * Find the next optimal posting time based on learned patterns
   */
  private findNextOptimalTime(optimalTimes: any[], currentTime: Date): Date | null {
    if (optimalTimes.length === 0) return null;
    
    // Sort optimal times by score (best first)
    const sortedTimes = optimalTimes.sort((a, b) => b.avgSuccessScore - a.avgSuccessScore);
    
    // Find the next occurrence of the best time slot
    const bestTime = sortedTimes[0];
    const nextOccurrence = new Date(currentTime);
    
    // Calculate days until next optimal day
    const currentDay = nextOccurrence.getDay();
    const daysToAdd = bestTime.dayOfWeek >= currentDay 
      ? bestTime.dayOfWeek - currentDay 
      : 7 - currentDay + bestTime.dayOfWeek;
    
    nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
    nextOccurrence.setHours(bestTime.hourOfDay, 0, 0, 0);
    
    // If the optimal time is in the past, find next week's occurrence
    if (nextOccurrence <= currentTime) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 7);
    }
    
    return nextOccurrence;
  }

  /**
   * Auto-apply safe optimizations (with user consent)
   */
  private async autoApplyOptimizations(userId: string, actions: OptimizationAction[]): Promise<void> {
    // For now, we only auto-apply rescheduling actions with high confidence
    const safeActions = actions.filter(action => 
      action.type === 'reschedule' && 
      action.expectedImprovement > 10
    );

    for (const action of safeActions) {
      try {
        // Update the job schedule
        await storage.updateJob(action.targetId, {
          scheduledFor: new Date(action.optimizedValue),
          schedulingMetadata: {
            optimizationApplied: true,
            originalSchedule: action.originalValue,
            optimizationReason: action.reasoning,
            expectedImprovement: action.expectedImprovement
          }
        });

        // Mark action as applied
        action.status = 'applied';
        action.appliedAt = new Date();

        // Emit notification
        if (global.broadcastToUser) {
          global.broadcastToUser(userId, {
            type: 'optimization_applied',
            data: {
              action: 'reschedule',
              jobId: action.targetId,
              newTime: action.optimizedValue,
              reason: action.reasoning,
              improvement: `${action.expectedImprovement.toFixed(1)}% expected improvement`
            }
          });
        }
      } catch (error) {
        console.error(`Failed to apply optimization action ${action.id}:`, error);
        action.status = 'rejected';
      }
    }
  }

  /**
   * Get optimization insights for a specific user
   */
  async getOptimizationInsights(userId: string): Promise<OptimizationInsight[]> {
    const result = await this.runOptimization(userId);
    return result.insights;
  }

  /**
   * Get user's optimization profile
   */
  async getUserOptimizationProfile(userId: string): Promise<OptimizationProfile | null> {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get learned patterns for a user
   */
  async getUserPatterns(userId: string): Promise<LearningPattern[]> {
    return this.patterns.get(userId) || [];
  }

  /**
   * Manual optimization trigger for specific listing
   */
  async optimizeListing(userId: string, listingId: string): Promise<{
    insights: OptimizationInsight[];
    recommendations: string[];
  }> {
    const listing = await storage.getListing(listingId);
    if (!listing || listing.userId !== userId) {
      throw new Error('Listing not found');
    }

    const analytics = await storage.getPostingSuccessAnalytics(userId);
    const patterns = await this.getUserPatterns(userId);

    // Generate listing-specific insights
    const relevantPatterns = patterns.filter(p => 
      !p.category || p.category === listing.category
    );

    const insights = await this.generateInsights(userId, relevantPatterns, 
      await this.buildOptimizationProfile(userId, analytics, [listing], patterns), analytics);

    const recommendations = insights.map(insight => insight.recommendation);

    return { insights, recommendations };
  }
}

export const optimizationEngine = new OptimizationEngine();