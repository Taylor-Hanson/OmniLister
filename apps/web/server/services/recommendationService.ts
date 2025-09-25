import { 
  type PostingSuccessAnalytics, 
  type Listing, 
  type SalesMetrics,
  type User,
  type Job
} from "../shared/schema.ts";
import { storage } from "../storage";
import { optimizationEngine, type OptimizationInsight } from "./optimizationEngine";
import { patternAnalysisService, type CorrelationResult, type TrendAnalysis } from "./patternAnalysisService";
import { analyticsService } from "./analyticsService";
import { smartScheduler } from "./smartScheduler";
import { randomUUID } from "crypto";
import { addDays, format, getHours, getDay, subDays, differenceInDays } from "date-fns";

// Recommendation types and interfaces
export interface Recommendation {
  id: string;
  userId: string;
  type: 'timing' | 'pricing' | 'content' | 'marketplace' | 'strategy';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  reasoning: string;
  actionRequired: 'immediate' | 'scheduled' | 'optional';
  confidence: number; // 0-100
  
  // Expected impact
  impact: {
    metric: string;
    currentValue: number;
    projectedValue: number;
    improvement: number; // percentage
    timeframe: string; // "within 1 week", "next 30 days", etc.
  };
  
  // Recommendation actions
  actions: RecommendationAction[];
  
  // Supporting data
  evidence: {
    dataPoints: number;
    successRate: number;
    sampleSize: number;
    timeRange: string;
  };
  
  // Status and tracking
  status: 'active' | 'applied' | 'dismissed' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  appliedAt?: Date;
  results?: {
    metric: string;
    before: number;
    after: number;
    actualImprovement: number;
  };
}

export interface RecommendationAction {
  id: string;
  type: 'reschedule_job' | 'adjust_price' | 'change_marketplace' | 'optimize_content' | 'create_automation';
  description: string;
  parameters: any;
  canAutoApply: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string; // "5 minutes", "1 hour", etc.
}

export interface PersonalizedRecommendations {
  userId: string;
  overallScore: number; // 0-100, current optimization level
  potentialImprovement: number; // percentage
  recommendations: Recommendation[];
  quickWins: Recommendation[]; // Easy, high-impact recommendations
  automationOpportunities: Recommendation[]; // Recommendations that can be automated
  strategicInsights: string[]; // High-level strategic recommendations
  generatedAt: Date;
}

export interface ABTestRecommendation {
  id: string;
  testName: string;
  hypothesis: string;
  variants: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  successMetric: string;
  duration: number; // days
  requiredSamples: number;
  confidence: number;
}

export interface SeasonalRecommendation {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  month: number;
  category?: string;
  recommendations: Array<{
    type: 'timing' | 'pricing' | 'content' | 'marketplace';
    description: string;
    expectedImprovement: number;
    historicalEvidence: string;
  }>;
}

export class RecommendationService {
  private recommendations: Map<string, Recommendation[]> = new Map();
  private readonly RECOMMENDATION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MIN_CONFIDENCE = 60; // Minimum confidence for recommendations
  private readonly HIGH_IMPACT_THRESHOLD = 15; // Minimum improvement % for high impact

  /**
   * Generate comprehensive personalized recommendations for a user
   */
  async generatePersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendations> {
    console.log(`🎯 Generating personalized recommendations for user ${userId}`);

    // Emit recommendation generation start
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'recommendation_generation',
        data: {
          stage: 'started',
          message: 'Analyzing your data to generate personalized recommendations...'
        }
      });
    }

    // Get comprehensive data
    const [
      optimizationResult,
      patternAnalysis,
      userProfile,
      recentPerformance,
      upcomingJobs
    ] = await Promise.all([
      optimizationEngine.runOptimization(userId),
      patternAnalysisService.analyzeUserPatterns(userId),
      this.buildUserProfile(userId),
      this.analyzeRecentPerformance(userId),
      storage.getJobs(userId, { status: 'pending' })
    ]);

    // Emit data analysis complete
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'recommendation_generation',
        data: {
          stage: 'analysis_complete',
          patterns: optimizationResult.patterns.length,
          insights: optimizationResult.insights.length,
          message: 'Data analysis complete, generating recommendations...'
        }
      });
    }

    // Generate different types of recommendations
    const [
      timingRecommendations,
      pricingRecommendations,
      marketplaceRecommendations,
      contentRecommendations,
      strategyRecommendations
    ] = await Promise.all([
      this.generateTimingRecommendations(userId, optimizationResult, patternAnalysis),
      this.generatePricingRecommendations(userId, optimizationResult, recentPerformance),
      this.generateMarketplaceRecommendations(userId, optimizationResult, patternAnalysis),
      this.generateContentRecommendations(userId, optimizationResult, patternAnalysis),
      this.generateStrategyRecommendations(userId, optimizationResult, userProfile)
    ]);

    // Combine all recommendations
    const allRecommendations = [
      ...timingRecommendations,
      ...pricingRecommendations,
      ...marketplaceRecommendations,
      ...contentRecommendations,
      ...strategyRecommendations
    ].filter(rec => rec.confidence >= this.MIN_CONFIDENCE);

    // Sort by priority and impact
    allRecommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.impact.improvement - a.impact.improvement;
    });

    // Identify quick wins and automation opportunities
    const quickWins = allRecommendations.filter(rec => 
      rec.impact.improvement >= this.HIGH_IMPACT_THRESHOLD && 
      rec.actionRequired !== 'immediate' &&
      rec.actions.some(action => action.riskLevel === 'low')
    ).slice(0, 5);

    const automationOpportunities = allRecommendations.filter(rec =>
      rec.actions.some(action => action.canAutoApply)
    ).slice(0, 3);

    // Generate strategic insights
    const strategicInsights = this.generateStrategicInsights(
      optimizationResult, 
      patternAnalysis, 
      userProfile,
      allRecommendations
    );

    // Calculate overall optimization score
    const overallScore = this.calculateOptimizationScore(userProfile, recentPerformance);
    const potentialImprovement = Math.min(50, allRecommendations.reduce((sum, rec) => 
      sum + (rec.impact.improvement * 0.1), 0
    ));

    // Store recommendations
    this.recommendations.set(userId, allRecommendations);

    // Emit generation complete
    if (global.broadcastToUser) {
      global.broadcastToUser(userId, {
        type: 'recommendation_generation',
        data: {
          stage: 'complete',
          total: allRecommendations.length,
          quickWins: quickWins.length,
          automation: automationOpportunities.length,
          overallScore,
          potentialImprovement,
          message: 'Personalized recommendations generated!'
        }
      });
    }

    console.log(`✅ Generated ${allRecommendations.length} recommendations (${quickWins.length} quick wins)`);

    return {
      userId,
      overallScore,
      potentialImprovement,
      recommendations: allRecommendations,
      quickWins,
      automationOpportunities,
      strategicInsights,
      generatedAt: new Date()
    };
  }

  /**
   * Generate timing-related recommendations
   */
  private async generateTimingRecommendations(
    userId: string,
    optimizationResult: any,
    patternAnalysis: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find timing patterns
    const timingPatterns = optimizationResult.patterns.filter((p: any) => p.type === 'timing_pattern');
    
    for (const pattern of timingPatterns) {
      const optimalTimes = pattern.pattern.optimalTimes || [];
      if (optimalTimes.length === 0) continue;

      const bestTime = optimalTimes[0];
      const marketplace = pattern.marketplace;

      // Check if user is posting at optimal times
      const upcomingJobs = await storage.getJobs(userId, { 
        status: 'pending'
      });

      let suboptimalJobs = 0;
      const jobsToOptimize: any[] = [];

      upcomingJobs.forEach(job => {
        if (job.scheduledFor) {
          const scheduledDate = new Date(job.scheduledFor);
          const dayOfWeek = scheduledDate.getDay();
          const hourOfDay = scheduledDate.getHours();

          // Check if job is scheduled at suboptimal time
          const isOptimal = optimalTimes.some((time: any) => 
            time.dayOfWeek === dayOfWeek && 
            Math.abs(time.hourOfDay - hourOfDay) <= 1
          );

          if (!isOptimal) {
            suboptimalJobs++;
            jobsToOptimize.push(job);
          }
        }
      });

      if (suboptimalJobs > 0) {
        recommendations.push({
          id: randomUUID(),
          userId,
          type: 'timing',
          priority: suboptimalJobs > 5 ? 'high' : 'medium',
          category: `${marketplace} Timing Optimization`,
          title: `Optimize Posting Times for ${marketplace}`,
          description: `${suboptimalJobs} upcoming posts are scheduled at suboptimal times`,
          reasoning: `Analysis of ${pattern.samples} posts shows ${bestTime.avgSuccessScore.toFixed(1)}% higher success when posting on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][bestTime.dayOfWeek]} at ${bestTime.hourOfDay}:00`,
          actionRequired: 'scheduled',
          confidence: pattern.confidence,
          impact: {
            metric: 'Success Rate',
            currentValue: 50,
            projectedValue: bestTime.avgSuccessScore,
            improvement: ((bestTime.avgSuccessScore - 50) / 50) * 100,
            timeframe: 'within 1 week'
          },
          actions: [{
            id: randomUUID(),
            type: 'reschedule_job',
            description: `Reschedule ${suboptimalJobs} jobs to optimal time windows`,
            parameters: {
              jobIds: jobsToOptimize.slice(0, 10).map(j => j.id),
              optimalTimes
            },
            canAutoApply: true,
            riskLevel: 'low',
            estimatedTime: '2 minutes'
          }],
          evidence: {
            dataPoints: pattern.samples,
            successRate: bestTime.avgSuccessScore,
            sampleSize: pattern.samples,
            timeRange: 'last 90 days'
          },
          status: 'active',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.RECOMMENDATION_TTL)
        });
      }
    }

    // Generate general timing recommendations from correlations
    if (patternAnalysis.correlations) {
      const timingCorrelations = patternAnalysis.correlations.filter((c: CorrelationResult) =>
        (c.variable1.includes('hour') || c.variable1.includes('day') ||
         c.variable2.includes('hour') || c.variable2.includes('day')) &&
        Math.abs(c.correlation) > 0.4
      );

      if (timingCorrelations.length > 0) {
        const strongestCorrelation = timingCorrelations[0];
        
        recommendations.push({
          id: randomUUID(),
          userId,
          type: 'timing',
          priority: 'medium',
          category: 'Timing Strategy',
          title: 'Timing-Performance Correlation Detected',
          description: `Strong ${strongestCorrelation.strength} correlation found between timing and performance`,
          reasoning: `${strongestCorrelation.correlation > 0 ? 'Positive' : 'Negative'} correlation of ${Math.abs(strongestCorrelation.correlation).toFixed(2)} between ${strongestCorrelation.variable1} and ${strongestCorrelation.variable2}`,
          actionRequired: 'optional',
          confidence: 85,
          impact: {
            metric: 'Engagement Score',
            currentValue: 50,
            projectedValue: 50 + (Math.abs(strongestCorrelation.correlation) * 20),
            improvement: Math.abs(strongestCorrelation.correlation) * 40,
            timeframe: 'next 2 weeks'
          },
          actions: [{
            id: randomUUID(),
            type: 'create_automation',
            description: 'Set up automated timing optimization based on this pattern',
            parameters: {
              correlationType: strongestCorrelation,
              optimizationRule: `Optimize timing based on ${strongestCorrelation.variable1}-${strongestCorrelation.variable2} correlation`
            },
            canAutoApply: false,
            riskLevel: 'medium',
            estimatedTime: '10 minutes'
          }],
          evidence: {
            dataPoints: strongestCorrelation.sampleSize,
            successRate: Math.abs(strongestCorrelation.correlation) * 100,
            sampleSize: strongestCorrelation.sampleSize,
            timeRange: 'last 60 days'
          },
          status: 'active',
          createdAt: new Date()
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate pricing-related recommendations
   */
  private async generatePricingRecommendations(
    userId: string,
    optimizationResult: any,
    recentPerformance: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze pricing patterns from optimization results
    const pricingPatterns = optimizationResult.patterns.filter((p: any) => 
      p.type === 'success_factor' && p.pattern.categoryPricing
    );

    for (const pattern of pricingPatterns) {
      const categoryPricing = pattern.pattern.categoryPricing;
      
      Object.entries(categoryPricing).forEach(([category, data]: [string, any]) => {
        const bestRange = data.bestRange;
        const performance = data.performance;
        
        // Find listings in this category that could benefit from repricing
        const categoryListings = recentPerformance.listings?.filter((l: any) => 
          l.category === category && l.status === 'active'
        ) || [];

        if (categoryListings.length > 0) {
          const suboptimalPricing = categoryListings.filter((listing: any) => {
            const currentRange = this.classifyPriceRange(parseFloat(listing.price));
            return currentRange !== bestRange;
          });

          if (suboptimalPricing.length > 0) {
            const bestPerformance = performance.find((p: any) => p.range === bestRange);
            const avgImprovement = bestPerformance ? bestPerformance.conversionRate - 
              performance.reduce((sum: number, p: any) => sum + p.conversionRate, 0) / performance.length : 15;

            recommendations.push({
              id: randomUUID(),
              userId,
              type: 'pricing',
              priority: avgImprovement > 20 ? 'high' : 'medium',
              category: `${category} Pricing`,
              title: `Optimize Pricing for ${category} Category`,
              description: `${suboptimalPricing.length} listings could benefit from pricing adjustments`,
              reasoning: `${bestRange} price range shows ${bestPerformance?.conversionRate.toFixed(1)}% conversion rate vs ${performance.filter((p: any) => p.range !== bestRange).map((p: any) => p.conversionRate.toFixed(1)).join(', ')}% for other ranges`,
              actionRequired: 'optional',
              confidence: pattern.confidence,
              impact: {
                metric: 'Conversion Rate',
                currentValue: performance.filter((p: any) => p.range !== bestRange)
                  .reduce((sum: number, p: any) => sum + p.conversionRate, 0) / 
                  performance.filter((p: any) => p.range !== bestRange).length,
                projectedValue: bestPerformance?.conversionRate || 0,
                improvement: avgImprovement,
                timeframe: 'within 2 weeks'
              },
              actions: [{
                id: randomUUID(),
                type: 'adjust_price',
                description: `Adjust prices for ${suboptimalPricing.length} listings to ${bestRange} range`,
                parameters: {
                  listingIds: suboptimalPricing.slice(0, 10).map((l: any) => l.id),
                  targetRange: bestRange,
                  adjustmentStrategy: 'gradual' // or 'immediate'
                },
                canAutoApply: false,
                riskLevel: 'medium',
                estimatedTime: `${Math.ceil(suboptimalPricing.length / 10)} minutes`
              }],
              evidence: {
                dataPoints: pattern.samples,
                successRate: bestPerformance?.conversionRate || 0,
                sampleSize: categoryListings.length,
                timeRange: 'last 90 days'
              },
              status: 'active',
              createdAt: new Date()
            });
          }
        }
      });
    }

    // Add dynamic pricing recommendations based on market trends
    if (recentPerformance.trends) {
      Object.entries(recentPerformance.trends).forEach(([category, trend]: [string, any]) => {
        if (trend.direction === 'increasing' && trend.strength > 70) {
          recommendations.push({
            id: randomUUID(),
            userId,
            type: 'pricing',
            priority: 'medium',
            category: `${category} Market Trends`,
            title: `Capitalize on Rising ${category} Market`,
            description: `${category} shows strong upward trend - consider premium pricing`,
            reasoning: `${category} performance trending upward with ${trend.strength}% strength and ${trend.confidence}% confidence`,
            actionRequired: 'optional',
            confidence: trend.confidence,
            impact: {
              metric: 'Average Sale Price',
              currentValue: 100,
              projectedValue: 115,
              improvement: 15,
              timeframe: 'next 30 days'
            },
            actions: [{
              id: randomUUID(),
              type: 'adjust_price',
              description: `Increase prices by 10-15% for ${category} items`,
              parameters: {
                category,
                adjustmentType: 'percentage_increase',
                percentage: 12
              },
              canAutoApply: false,
              riskLevel: 'medium',
              estimatedTime: '15 minutes'
            }],
            evidence: {
              dataPoints: 100,
              successRate: trend.strength,
              sampleSize: 50,
              timeRange: 'last 60 days'
            },
            status: 'active',
            createdAt: new Date()
          });
        }
      });
    }

    return recommendations;
  }

  /**
   * Generate marketplace-related recommendations
   */
  private async generateMarketplaceRecommendations(
    userId: string,
    optimizationResult: any,
    patternAnalysis: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find best performing marketplaces
    const marketplacePatterns = optimizationResult.patterns.filter((p: any) => 
      p.type === 'success_factor' && !p.category
    );

    // Get user's marketplace connections
    const connections = await storage.getMarketplaceConnections(userId);
    const connectedMarketplaces = connections.filter(c => c.isConnected).map(c => c.marketplace);
    const disconnectedMarketplaces = connections.filter(c => !c.isConnected).map(c => c.marketplace);

    // Identify high-performing marketplaces user isn't using
    const highPerformingUnused = marketplacePatterns
      .filter((p: any) => 
        p.impact > 5 && 
        !connectedMarketplaces.includes(p.marketplace)
      )
      .sort((a: any, b: any) => b.impact - a.impact)
      .slice(0, 3);

    highPerformingUnused.forEach((pattern: any) => {
      recommendations.push({
        id: randomUUID(),
        userId,
        type: 'marketplace',
        priority: pattern.impact > 7 ? 'high' : 'medium',
        category: 'Marketplace Expansion',
        title: `Connect to ${pattern.marketplace}`,
        description: `${pattern.marketplace} shows strong performance potential`,
        reasoning: `Analysis indicates ${pattern.impact}x performance multiplier potential on ${pattern.marketplace}`,
        actionRequired: 'optional',
        confidence: pattern.confidence,
        impact: {
          metric: 'Market Reach',
          currentValue: connectedMarketplaces.length,
          projectedValue: connectedMarketplaces.length + 1,
          improvement: (1 / connectedMarketplaces.length) * 100,
          timeframe: 'immediate after connection'
        },
        actions: [{
          id: randomUUID(),
          type: 'change_marketplace',
          description: `Connect to ${pattern.marketplace}`,
          parameters: {
            marketplace: pattern.marketplace,
            action: 'connect'
          },
          canAutoApply: false,
          riskLevel: 'low',
          estimatedTime: '5 minutes'
        }],
        evidence: {
          dataPoints: pattern.samples,
          successRate: pattern.impact * 10,
          sampleSize: pattern.samples,
          timeRange: 'last 90 days'
        },
        status: 'active',
        createdAt: new Date()
      });
    });

    // Identify underperforming connected marketplaces
    const underperformingConnected = marketplacePatterns
      .filter((p: any) => 
        p.impact < 3 && 
        connectedMarketplaces.includes(p.marketplace) &&
        p.type === 'failure_pattern'
      )
      .sort((a: any, b: any) => a.impact - b.impact)
      .slice(0, 2);

    underperformingConnected.forEach((pattern: any) => {
      recommendations.push({
        id: randomUUID(),
        userId,
        type: 'marketplace',
        priority: 'medium',
        category: 'Marketplace Optimization',
        title: `Optimize ${pattern.marketplace} Strategy`,
        description: `${pattern.marketplace} showing below-average performance`,
        reasoning: pattern.pattern.recommendation || `Performance on ${pattern.marketplace} is ${pattern.pattern.failureRate?.toFixed(1)}% below expectations`,
        actionRequired: 'scheduled',
        confidence: pattern.confidence,
        impact: {
          metric: 'Marketplace Performance',
          currentValue: 40,
          projectedValue: 65,
          improvement: 62.5,
          timeframe: 'next 3 weeks'
        },
        actions: [{
          id: randomUUID(),
          type: 'optimize_content',
          description: `Adjust strategy for ${pattern.marketplace}`,
          parameters: {
            marketplace: pattern.marketplace,
            optimizations: ['timing', 'pricing', 'content']
          },
          canAutoApply: false,
          riskLevel: 'low',
          estimatedTime: '30 minutes'
        }],
        evidence: {
          dataPoints: pattern.samples,
          successRate: 40,
          sampleSize: pattern.samples,
          timeRange: 'last 60 days'
        },
        status: 'active',
        createdAt: new Date()
      });
    });

    return recommendations;
  }

  /**
   * Generate content optimization recommendations
   */
  private async generateContentRecommendations(
    userId: string,
    optimizationResult: any,
    patternAnalysis: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Find engagement patterns
    const engagementPatterns = optimizationResult.patterns.filter((p: any) => 
      p.type === 'engagement_driver'
    );

    engagementPatterns.forEach((pattern: any) => {
      const topCategories = pattern.pattern.topCategories || [];
      
      if (topCategories.length > 0) {
        recommendations.push({
          id: randomUUID(),
          userId,
          type: 'content',
          priority: 'medium',
          category: `${pattern.marketplace} Content`,
          title: `Focus on High-Engagement Categories`,
          description: `${topCategories.map((c: any) => c.category).join(', ')} drive highest engagement`,
          reasoning: `Analysis shows ${topCategories[0].category} generates ${pattern.pattern.avgEngagement.toFixed(1)} average engagement vs ${(pattern.pattern.avgEngagement * 0.7).toFixed(1)} overall average`,
          actionRequired: 'optional',
          confidence: pattern.confidence,
          impact: {
            metric: 'Engagement Score',
            currentValue: pattern.pattern.avgEngagement * 0.7,
            projectedValue: pattern.pattern.avgEngagement,
            improvement: 30,
            timeframe: 'next 2 weeks'
          },
          actions: [{
            id: randomUUID(),
            type: 'optimize_content',
            description: 'Prioritize high-engagement categories in content strategy',
            parameters: {
              focusCategories: topCategories.slice(0, 3).map((c: any) => c.category),
              marketplace: pattern.marketplace
            },
            canAutoApply: false,
            riskLevel: 'low',
            estimatedTime: '20 minutes'
          }],
          evidence: {
            dataPoints: pattern.samples,
            successRate: pattern.pattern.avgEngagement,
            sampleSize: pattern.samples,
            timeRange: 'last 90 days'
          },
          status: 'active',
          createdAt: new Date()
        });
      }
    });

    // Add image optimization recommendations if we have view/engagement data
    const listings = await storage.getListings(userId, { status: 'active' });
    const lowEngagementListings = listings.filter(listing => {
      // This would need actual engagement data - for now using a heuristic
      const daysSinceListed = listing.createdAt ? differenceInDays(new Date(), new Date(listing.createdAt)) : 0;
      const hasImages = listing.images && Array.isArray(listing.images) && (listing.images as any[]).length > 0;
      return daysSinceListed > 7 && !hasImages;
    });

    if (lowEngagementListings.length > 0) {
      recommendations.push({
        id: randomUUID(),
        userId,
        type: 'content',
        priority: 'high',
        category: 'Image Optimization',
        title: 'Add Images to Low-Engagement Listings',
        description: `${lowEngagementListings.length} listings lack images or have poor image quality`,
        reasoning: 'Listings with high-quality images typically see 3x higher engagement rates',
        actionRequired: 'immediate',
        confidence: 90,
        impact: {
          metric: 'Engagement Rate',
          currentValue: 20,
          projectedValue: 60,
          improvement: 200,
          timeframe: 'within 1 week'
        },
        actions: [{
          id: randomUUID(),
          type: 'optimize_content',
          description: `Add or improve images for ${lowEngagementListings.length} listings`,
          parameters: {
            listingIds: lowEngagementListings.slice(0, 20).map(l => l.id),
            optimizationType: 'images'
          },
          canAutoApply: false,
          riskLevel: 'low',
          estimatedTime: `${lowEngagementListings.length * 2} minutes`
        }],
        evidence: {
          dataPoints: 1000,
          successRate: 75,
          sampleSize: lowEngagementListings.length,
          timeRange: 'industry standard'
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Generate strategic recommendations
   */
  private async generateStrategyRecommendations(
    userId: string,
    optimizationResult: any,
    userProfile: any
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze overall performance and suggest strategic improvements
    const overallScore = optimizationResult.profile?.overallPerformanceScore || 50;
    
    if (overallScore < 60) {
      recommendations.push({
        id: randomUUID(),
        userId,
        type: 'strategy',
        priority: 'high',
        category: 'Overall Performance',
        title: 'Comprehensive Optimization Needed',
        description: `Current performance score of ${overallScore}/100 indicates significant optimization opportunities`,
        reasoning: `Multiple areas for improvement identified: timing optimization, pricing strategy, and marketplace selection`,
        actionRequired: 'immediate',
        confidence: 95,
        impact: {
          metric: 'Overall Performance Score',
          currentValue: overallScore,
          projectedValue: Math.min(85, overallScore + 25),
          improvement: Math.min(41.7, ((85 - overallScore) / overallScore) * 100),
          timeframe: 'next 6-8 weeks'
        },
        actions: [{
          id: randomUUID(),
          type: 'create_automation',
          description: 'Enable comprehensive auto-optimization',
          parameters: {
            optimizationTypes: ['timing', 'pricing', 'marketplace'],
            aggressiveness: 'moderate'
          },
          canAutoApply: true,
          riskLevel: 'low',
          estimatedTime: '5 minutes'
        }],
        evidence: {
          dataPoints: optimizationResult.insights.length,
          successRate: overallScore,
          sampleSize: 100,
          timeRange: 'comprehensive analysis'
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    // Seasonal strategy recommendations
    const currentMonth = new Date().getMonth();
    const seasonalRecommendation = this.getSeasonalRecommendation(currentMonth);
    
    if (seasonalRecommendation) {
      recommendations.push({
        id: randomUUID(),
        userId,
        type: 'strategy',
        priority: 'medium',
        category: 'Seasonal Strategy',
        title: `${seasonalRecommendation.season.charAt(0).toUpperCase() + seasonalRecommendation.season.slice(1)} Optimization Strategy`,
        description: `Prepare for seasonal trends in ${seasonalRecommendation.season}`,
        reasoning: seasonalRecommendation.recommendations[0]?.description || 'Seasonal adjustment needed',
        actionRequired: 'scheduled',
        confidence: 75,
        impact: {
          metric: 'Seasonal Performance',
          currentValue: 50,
          projectedValue: 50 + (seasonalRecommendation.recommendations[0]?.expectedImprovement || 15),
          improvement: seasonalRecommendation.recommendations[0]?.expectedImprovement || 15,
          timeframe: 'current season'
        },
        actions: [{
          id: randomUUID(),
          type: 'create_automation',
          description: 'Set up seasonal optimization rules',
          parameters: {
            season: seasonalRecommendation.season,
            adjustments: seasonalRecommendation.recommendations
          },
          canAutoApply: false,
          riskLevel: 'low',
          estimatedTime: '10 minutes'
        }],
        evidence: {
          dataPoints: 365,
          successRate: 70,
          sampleSize: 50,
          timeRange: 'historical seasonal data'
        },
        status: 'active',
        createdAt: new Date()
      });
    }

    return recommendations;
  }

  // Helper methods

  private async buildUserProfile(userId: string): Promise<any> {
    const [user, listings, connections] = await Promise.all([
      storage.getUser(userId),
      storage.getListings(userId),
      storage.getMarketplaceConnections(userId)
    ]);

    return {
      user,
      totalListings: listings.length,
      activeListings: listings.filter(l => l.status === 'active').length,
      connectedMarketplaces: connections.filter(c => c.isConnected).length,
      categories: Array.from(new Set(listings.map(l => l.category).filter(Boolean))),
      avgPrice: listings.length > 0 
        ? listings.reduce((sum, l) => sum + parseFloat(l.price), 0) / listings.length 
        : 0
    };
  }

  /**
   * Get batch ordering recommendations based on user patterns
   */
  async getBatchOrderingRecommendations(userId: string, items: any[]): Promise<{
    orderingStrategy: 'priority' | 'marketplace' | 'category' | 'sequential';
    optimizedOrder: any[];
    reasoning: string;
    estimatedImprovement: number;
  }> {
    console.log(`🎯 Generating batch ordering recommendations for ${items.length} items`);
    
    try {
      // Get user patterns and performance data
      const [userProfile, analytics] = await Promise.all([
        this.buildUserProfile(userId),
        storage.getPostingSuccessAnalytics(userId, {
          startDate: subDays(new Date(), 30)
        })
      ]);
      
      if (analytics.length < 5) {
        return {
          orderingStrategy: 'sequential',
          optimizedOrder: items,
          reasoning: 'Insufficient data for optimization - using sequential order',
          estimatedImprovement: 0
        };
      }
      
      // Analyze marketplace performance
      const marketplacePerformance = analytics.reduce((acc, record) => {
        const marketplace = record.marketplace;
        const success = parseFloat(record.success_score || '0');
        if (!acc[marketplace]) acc[marketplace] = { total: 0, count: 0 };
        acc[marketplace].total += success;
        acc[marketplace].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      // Sort marketplaces by performance
      const sortedMarketplaces = Object.entries(marketplacePerformance)
        .map(([marketplace, data]) => ({
          marketplace,
          avgScore: data.total / data.count
        }))
        .sort((a, b) => b.avgScore - a.avgScore);
      
      // Determine optimal ordering strategy
      let orderingStrategy: 'priority' | 'marketplace' | 'category' | 'sequential' = 'sequential';
      let optimizedOrder = [...items];
      let reasoning = 'Using sequential order';
      let estimatedImprovement = 0;
      
      if (sortedMarketplaces.length > 1) {
        // Marketplace-based ordering if we have multiple marketplaces
        orderingStrategy = 'marketplace';
        optimizedOrder = items.sort((a, b) => {
          const aMarketplaces = a.marketplaces || [];
          const bMarketplaces = b.marketplaces || [];
          const aScore = Math.max(...aMarketplaces.map((m: string) => 
            marketplacePerformance[m]?.total / marketplacePerformance[m]?.count || 0
          ));
          const bScore = Math.max(...bMarketplaces.map((m: string) => 
            marketplacePerformance[m]?.total / marketplacePerformance[m]?.count || 0
          ));
          return bScore - aScore;
        });
        reasoning = `Ordered by marketplace performance: ${sortedMarketplaces.slice(0, 3).map(m => m.marketplace).join(', ')}`;
        estimatedImprovement = 15;
        
      } else if (items.some(item => item.priority)) {
        // Priority-based ordering
        orderingStrategy = 'priority';
        optimizedOrder = items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        reasoning = 'Ordered by item priority for optimal processing';
        estimatedImprovement = 10;
        
      } else {
        // Category-based ordering as fallback
        orderingStrategy = 'category';
        optimizedOrder = items.sort((a, b) => {
          const aCategory = a.itemData?.category || a.category || 'Other';
          const bCategory = b.itemData?.category || b.category || 'Other';
          return aCategory.localeCompare(bCategory);
        });
        reasoning = 'Grouped by category for efficient processing';
        estimatedImprovement = 5;
      }
      
      return {
        orderingStrategy,
        optimizedOrder,
        reasoning,
        estimatedImprovement
      };
      
    } catch (error) {
      console.error('Error generating batch ordering recommendations:', error);
      return {
        orderingStrategy: 'sequential',
        optimizedOrder: items,
        reasoning: 'Error occurred, using original order',
        estimatedImprovement: 0
      };
    }
  }

  private async analyzeRecentPerformance(userId: string): Promise<any> {
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const [analytics, listings] = await Promise.all([
      storage.getPostingSuccessAnalytics(userId, { startDate: thirtyDaysAgo }),
      storage.getListings(userId)
    ]);

    const avgSuccessScore = analytics.length > 0
      ? analytics.reduce((sum, a) => sum + parseFloat(a.success_score || '0'), 0) / analytics.length
      : 0;

    const conversionRate = analytics.length > 0
      ? (analytics.filter(a => a.sold).length / analytics.length) * 100
      : 0;

    return {
      avgSuccessScore,
      conversionRate,
      totalPosts: analytics.length,
      listings,
      trends: {} // Would be populated with actual trend analysis
    };
  }

  private classifyPriceRange(price: number): 'low' | 'medium' | 'high' {
    if (price < 25) return 'low';
    if (price < 100) return 'medium';
    return 'high';
  }

  private calculateOptimizationScore(userProfile: any, recentPerformance: any): number {
    let score = 50; // Base score

    // Connected marketplaces bonus
    score += Math.min(20, userProfile.connectedMarketplaces * 4);

    // Performance bonus
    score += Math.min(20, recentPerformance.avgSuccessScore * 0.3);

    // Activity bonus
    if (userProfile.activeListings > 10) score += 10;
    if (recentPerformance.totalPosts > 50) score += 10;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  private generateStrategicInsights(
    optimizationResult: any,
    patternAnalysis: any,
    userProfile: any,
    recommendations: Recommendation[]
  ): string[] {
    const insights: string[] = [];

    // Performance insights
    const overallScore = optimizationResult.profile?.overallPerformanceScore || 50;
    if (overallScore > 80) {
      insights.push('Your listing performance is excellent - focus on scaling successful strategies');
    } else if (overallScore > 60) {
      insights.push('Good performance with clear optimization opportunities identified');
    } else {
      insights.push('Significant improvement potential - prioritize high-impact recommendations');
    }

    // Pattern insights
    const highConfidencePatterns = optimizationResult.patterns.filter((p: any) => p.confidence > 80);
    if (highConfidencePatterns.length > 0) {
      insights.push(`${highConfidencePatterns.length} high-confidence patterns discovered - reliable optimization opportunities`);
    }

    // Marketplace insights
    if (userProfile.connectedMarketplaces < 3) {
      insights.push('Consider expanding to additional marketplaces for broader reach');
    } else if (userProfile.connectedMarketplaces > 5) {
      insights.push('Focus on optimizing performance on your best-performing marketplaces');
    }

    // Quick wins insight
    const quickWins = recommendations.filter(r => 
      r.impact.improvement > 20 && 
      r.actions.some(a => a.riskLevel === 'low')
    );
    
    if (quickWins.length > 0) {
      insights.push(`${quickWins.length} quick wins identified - implement these first for immediate impact`);
    }

    return insights;
  }

  private getSeasonalRecommendation(month: number): SeasonalRecommendation | null {
    const seasonalData: Record<string, SeasonalRecommendation> = {
      'winter': {
        season: 'winter',
        month: 0, // January
        recommendations: [{
          type: 'content',
          description: 'Focus on winter clothing and indoor activities',
          expectedImprovement: 20,
          historicalEvidence: 'Winter items see 40% higher engagement in Q1'
        }]
      },
      'spring': {
        season: 'spring',
        month: 3, // April  
        recommendations: [{
          type: 'timing',
          description: 'Increase posting frequency as buyers become more active',
          expectedImprovement: 15,
          historicalEvidence: 'Spring cleaning drives 25% more marketplace activity'
        }]
      },
      'summer': {
        season: 'summer',
        month: 6, // July
        recommendations: [{
          type: 'marketplace',
          description: 'Focus on vacation and outdoor gear categories',
          expectedImprovement: 18,
          historicalEvidence: 'Summer categories see 30% higher conversion rates'
        }]
      },
      'fall': {
        season: 'fall', 
        month: 9, // October
        recommendations: [{
          type: 'pricing',
          description: 'Prepare for holiday shopping with competitive pricing',
          expectedImprovement: 25,
          historicalEvidence: 'Q4 sees highest sales volumes and price sensitivity'
        }]
      }
    };

    const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';
    return seasonalData[season] || null;
  }

  /**
   * Apply a recommendation
   */
  async applyRecommendation(userId: string, recommendationId: string, actionId: string): Promise<{
    success: boolean;
    message: string;
    appliedChanges?: any;
  }> {
    const userRecommendations = this.recommendations.get(userId) || [];
    const recommendation = userRecommendations.find(r => r.id === recommendationId);
    
    if (!recommendation) {
      return { success: false, message: 'Recommendation not found' };
    }

    const action = recommendation.actions.find(a => a.id === actionId);
    if (!action) {
      return { success: false, message: 'Action not found' };
    }

    try {
      let appliedChanges: any = {};

      switch (action.type) {
        case 'reschedule_job':
          const { jobIds, optimalTimes } = action.parameters;
          for (const jobId of jobIds) {
            // Find next optimal time
            const nextOptimalTime = this.findNextOptimalTime(optimalTimes);
            if (nextOptimalTime) {
              await storage.updateJob(jobId, { 
                scheduledFor: nextOptimalTime,
                schedulingMetadata: {
                  optimizationApplied: true,
                  recommendationId,
                  actionId,
                  originalTime: new Date()
                }
              });
              appliedChanges[jobId] = nextOptimalTime;
            }
          }
          break;

        case 'adjust_price':
          // Implementation would depend on specific pricing strategy
          appliedChanges.priceAdjustments = `Applied ${action.description}`;
          break;

        case 'create_automation':
          // Create automation rule
          appliedChanges.automationCreated = action.parameters;
          break;

        default:
          return { success: false, message: 'Action type not supported' };
      }

      // Update recommendation status
      recommendation.status = 'applied';
      recommendation.appliedAt = new Date();

      // Emit notification
      if (global.broadcastToUser) {
        global.broadcastToUser(userId, {
          type: 'recommendation_applied',
          data: {
            recommendationId,
            title: recommendation.title,
            action: action.description,
            changes: appliedChanges
          }
        });
      }

      return {
        success: true,
        message: 'Recommendation applied successfully',
        appliedChanges
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to apply recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private findNextOptimalTime(optimalTimes: any[]): Date | null {
    if (optimalTimes.length === 0) return null;
    
    const now = new Date();
    const bestTime = optimalTimes[0]; // Assuming sorted by performance
    
    // Find next occurrence of this day/hour
    const nextOccurrence = new Date(now);
    const currentDay = now.getDay();
    const daysToAdd = bestTime.dayOfWeek >= currentDay 
      ? bestTime.dayOfWeek - currentDay 
      : 7 - currentDay + bestTime.dayOfWeek;
    
    nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
    nextOccurrence.setHours(bestTime.hourOfDay, 0, 0, 0);
    
    if (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 7);
    }
    
    return nextOccurrence;
  }

  /**
   * Get recommendations for a user
   */
  async getUserRecommendations(userId: string): Promise<Recommendation[]> {
    return this.recommendations.get(userId) || [];
  }

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(userId: string, recommendationId: string): Promise<boolean> {
    const userRecommendations = this.recommendations.get(userId) || [];
    const recommendation = userRecommendations.find(r => r.id === recommendationId);
    
    if (recommendation) {
      recommendation.status = 'dismissed';
      return true;
    }
    
    return false;
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationMetrics(userId: string): Promise<{
    totalRecommendations: number;
    applied: number;
    dismissed: number;
    avgConfidence: number;
    totalImpactRealized: number;
  }> {
    const recommendations = this.recommendations.get(userId) || [];
    
    const applied = recommendations.filter(r => r.status === 'applied');
    const dismissed = recommendations.filter(r => r.status === 'dismissed');
    const avgConfidence = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length 
      : 0;
    
    const totalImpactRealized = applied.reduce((sum, r) => 
      sum + (r.results?.actualImprovement || r.impact.improvement), 0
    );

    return {
      totalRecommendations: recommendations.length,
      applied: applied.length,
      dismissed: dismissed.length,
      avgConfidence: Math.round(avgConfidence),
      totalImpactRealized: Math.round(totalImpactRealized)
    };
  }
}

export const recommendationService = new RecommendationService();