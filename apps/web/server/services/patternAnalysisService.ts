import { 
  type PostingSuccessAnalytics, 
  type Listing,
  type SalesMetrics
} from "@shared/schema";
import { storage } from "../storage";
import { subDays, format, getHours, getDay, differenceInDays, startOfWeek, endOfWeek } from "date-fns";

// Core data structures for pattern analysis
export interface TimeSeries {
  date: string;
  value: number;
  metadata?: any;
}

export interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;
  significance: number; // p-value
  sampleSize: number;
  strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
}

export interface ClusterResult {
  clusterId: number;
  center: Record<string, number>;
  members: string[]; // IDs of items in cluster
  characteristics: string[];
  size: number;
}

export interface AnomalyResult {
  id: string;
  type: 'outlier' | 'trend_break' | 'seasonal_anomaly';
  score: number; // How anomalous (0-100)
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-100
  slope: number;
  confidence: number; // 0-100
  seasonality: {
    detected: boolean;
    period?: number; // days
    strength?: number;
  };
  changePoints: Array<{
    date: string;
    significance: number;
    type: 'increase' | 'decrease' | 'volatility_change';
  }>;
}

export interface SegmentationResult {
  segments: Array<{
    id: string;
    name: string;
    criteria: Record<string, any>;
    performance: {
      avgSuccessScore: number;
      conversionRate: number;
      avgEngagement: number;
      count: number;
    };
    recommendations: string[];
  }>;
  optimalSegment: string;
  underperformingSegments: string[];
}

export interface PerformanceMetrics {
  successRate: number;
  avgEngagement: number;
  conversionRate: number;
  timeToSell: number;
  viewsToEngagement: number;
  engagementToSale: number;
  priceRealization: number; // actual vs optimal price
}

export class PatternAnalysisService {
  private readonly CORRELATION_THRESHOLD = 0.3; // Minimum correlation to consider significant
  private readonly ANOMALY_THRESHOLD = 2.0; // Standard deviations for anomaly detection
  private readonly TREND_MIN_POINTS = 10; // Minimum points for trend analysis
  private readonly CLUSTER_MIN_SIZE = 5; // Minimum items per cluster

  /**
   * Comprehensive pattern analysis entry point
   */
  async analyzeUserPatterns(userId: string, options: {
    timeRange?: number; // days
    marketplaces?: string[];
    categories?: string[];
    includeCorrelations?: boolean;
    includeAnomalies?: boolean;
    includeTrends?: boolean;
    includeSegmentation?: boolean;
  } = {}): Promise<{
    correlations?: CorrelationResult[];
    anomalies?: AnomalyResult[];
    trends?: Record<string, TrendAnalysis>;
    segmentation?: SegmentationResult;
    summary: {
      totalAnalyzed: number;
      significantPatterns: number;
      confidence: number;
      recommendations: string[];
    };
  }> {
    const {
      timeRange = 90,
      marketplaces,
      categories,
      includeCorrelations = true,
      includeAnomalies = true,
      includeTrends = true,
      includeSegmentation = true
    } = options;

    console.log(`🔍 Starting comprehensive pattern analysis for user ${userId}`);

    // Gather data
    const startDate = subDays(new Date(), timeRange);
    const analytics = await storage.getPostingSuccessAnalytics(userId, {
      startDate,
      marketplace: marketplaces?.[0], // Use first marketplace or undefined
      category: categories?.[0] // Use first category or undefined
    });

    if (analytics.length < 10) {
      throw new Error('Insufficient data for reliable pattern analysis');
    }

    console.log(`📊 Analyzing ${analytics.length} data points`);

    const results: any = {
      summary: {
        totalAnalyzed: analytics.length,
        significantPatterns: 0,
        confidence: 0,
        recommendations: []
      }
    };

    // Parallel analysis for performance
    const analyses = await Promise.all([
      includeCorrelations ? this.analyzeCorrelations(analytics) : null,
      includeAnomalies ? this.detectAnomalies(analytics) : null,
      includeTrends ? this.analyzeTrends(analytics) : null,
      includeSegmentation ? this.performSegmentation(analytics) : null,
    ]);

    results.correlations = analyses[0];
    results.anomalies = analyses[1];
    results.trends = analyses[2];
    results.segmentation = analyses[3];

    // Calculate summary statistics
    const significantCorrelations = results.correlations?.filter((c: CorrelationResult) => 
      Math.abs(c.correlation) > this.CORRELATION_THRESHOLD && c.significance < 0.05
    ).length || 0;

    const highImpactAnomalies = results.anomalies?.filter((a: AnomalyResult) => 
      a.impact === 'high'
    ).length || 0;

    const strongTrends = Object.values(results.trends || {}).filter((t: any) => 
      t.strength > 70 && t.confidence > 80
    ).length;

    results.summary.significantPatterns = significantCorrelations + highImpactAnomalies + strongTrends;
    results.summary.confidence = this.calculateOverallConfidence(analytics.length, results.summary.significantPatterns);
    results.summary.recommendations = this.generateSummaryRecommendations(results);

    console.log(`✅ Pattern analysis complete: ${results.summary.significantPatterns} significant patterns found`);

    return results;
  }

  /**
   * Analyze correlations between different variables
   */
  async analyzeCorrelations(analytics: PostingSuccessAnalytics[]): Promise<CorrelationResult[]> {
    console.log('🔗 Analyzing variable correlations...');
    
    const correlations: CorrelationResult[] = [];
    
    // Extract numerical variables for correlation analysis
    const variables = this.extractNumericalVariables(analytics);
    const variableNames = Object.keys(variables);
    
    // Calculate all pairwise correlations
    for (let i = 0; i < variableNames.length; i++) {
      for (let j = i + 1; j < variableNames.length; j++) {
        const var1Name = variableNames[i];
        const var2Name = variableNames[j];
        const var1Values = variables[var1Name];
        const var2Values = variables[var2Name];
        
        const correlation = this.calculatePearsonCorrelation(var1Values, var2Values);
        const significance = this.calculateSignificance(correlation, var1Values.length);
        
        if (Math.abs(correlation) > 0.1) { // Filter out very weak correlations
          correlations.push({
            variable1: var1Name,
            variable2: var2Name,
            correlation,
            significance,
            sampleSize: var1Values.length,
            strength: this.classifyCorrelationStrength(correlation)
          });
        }
      }
    }
    
    // Sort by absolute correlation strength
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    console.log(`📈 Found ${correlations.filter(c => Math.abs(c.correlation) > this.CORRELATION_THRESHOLD).length} significant correlations`);
    
    return correlations;
  }

  /**
   * Detect anomalies in posting performance
   */
  async detectAnomalies(analytics: PostingSuccessAnalytics[]): Promise<AnomalyResult[]> {
    console.log('🚨 Detecting performance anomalies...');
    
    const anomalies: AnomalyResult[] = [];
    
    // Convert analytics to time series for different metrics
    const timeSeries = {
      success_score: this.createTimeSeries(analytics, 'success_score'),
      engagement_score: this.createTimeSeries(analytics, 'engagement_score'),
      views: this.createTimeSeries(analytics, 'views'),
      likes: this.createTimeSeries(analytics, 'likes')
    };
    
    // Detect outliers in each metric
    for (const [metric, series] of Object.entries(timeSeries)) {
      const outliers = this.detectOutliers(series, metric);
      anomalies.push(...outliers);
    }
    
    // Detect trend breaks
    const trendBreaks = this.detectTrendBreaks(timeSeries.success_score, 'success_score');
    anomalies.push(...trendBreaks);
    
    // Detect seasonal anomalies
    const seasonalAnomalies = this.detectSeasonalAnomalies(analytics);
    anomalies.push(...seasonalAnomalies);
    
    // Sort by impact and score
    anomalies.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.score - a.score;
    });
    
    console.log(`⚠️  Detected ${anomalies.length} anomalies (${anomalies.filter(a => a.impact === 'high').length} high impact)`);
    
    return anomalies;
  }

  /**
   * Analyze trends in posting performance over time
   */
  async analyzeTrends(analytics: PostingSuccessAnalytics[]): Promise<Record<string, TrendAnalysis>> {
    console.log('📊 Analyzing performance trends...');
    
    const trends: Record<string, TrendAnalysis> = {};
    
    // Group by marketplace for trend analysis
    const byMarketplace = this.groupByMarketplace(analytics);
    
    for (const [marketplace, records] of Object.entries(byMarketplace)) {
      if (records.length < this.TREND_MIN_POINTS) continue;
      
      const timeSeries = this.createTimeSeries(records, 'success_score');
      const trend = this.calculateTrend(timeSeries);
      
      if (trend) {
        trends[marketplace] = trend;
      }
    }
    
    // Overall trend across all marketplaces
    if (analytics.length >= this.TREND_MIN_POINTS) {
      const overallSeries = this.createTimeSeries(analytics, 'success_score');
      const overallTrend = this.calculateTrend(overallSeries);
      if (overallTrend) {
        trends['overall'] = overallTrend;
      }
    }
    
    console.log(`📈 Analyzed trends for ${Object.keys(trends).length} categories`);
    
    return trends;
  }

  /**
   * Perform market segmentation analysis
   */
  async performSegmentation(analytics: PostingSuccessAnalytics[]): Promise<SegmentationResult> {
    console.log('🎯 Performing market segmentation...');
    
    // Define segmentation criteria
    const segments = this.createSegments(analytics);
    
    // Analyze performance for each segment
    const segmentResults = segments.map(segment => {
      const segmentData = analytics.filter(record => this.matchesSegment(record, segment.criteria));
      
      if (segmentData.length === 0) return null;
      
      const performance = this.calculateSegmentPerformance(segmentData);
      const recommendations = this.generateSegmentRecommendations(segment, performance);
      
      return {
        ...segment,
        performance,
        recommendations
      };
    }).filter(Boolean) as any[];
    
    // Identify best and worst performing segments
    const sortedSegments = segmentResults.sort((a, b) => b.performance.avgSuccessScore - a.performance.avgSuccessScore);
    const optimalSegment = sortedSegments[0]?.id || 'none';
    const underperformingSegments = sortedSegments
      .filter(s => s.performance.avgSuccessScore < 50)
      .slice(-3)
      .map(s => s.id);
    
    console.log(`🔍 Created ${segmentResults.length} market segments`);
    
    return {
      segments: segmentResults,
      optimalSegment,
      underperformingSegments
    };
  }

  // Helper methods for statistical calculations

  private extractNumericalVariables(analytics: PostingSuccessAnalytics[]): Record<string, number[]> {
    const variables: Record<string, number[]> = {};
    
    const fields = ['success_score', 'engagement_score', 'views', 'likes', 'messages', 'hourOfDay', 'dayOfWeek'];
    
    fields.forEach(field => {
      variables[field] = analytics.map(record => {
        const value = (record as any)[field];
        if (typeof value === 'string') return parseFloat(value);
        if (typeof value === 'number') return value;
        return 0;
      }).filter(v => !isNaN(v));
    });
    
    return variables;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0; // Not enough data
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateSignificance(correlation: number, sampleSize: number): number {
    if (sampleSize < 3) return 1;
    
    const t = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    // Simplified p-value approximation
    return Math.max(0, 1 - Math.abs(t) / (Math.abs(t) + sampleSize - 2));
  }

  private classifyCorrelationStrength(correlation: number): 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak' {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'very_strong';
    if (abs >= 0.6) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.2) return 'weak';
    return 'very_weak';
  }

  private createTimeSeries(analytics: PostingSuccessAnalytics[], field: string): TimeSeries[] {
    // Group by date and average the values
    const byDate = analytics.reduce((acc, record) => {
      const date = format(new Date(record.postedAt), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      
      const value = (record as any)[field];
      const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : 0);
      acc[date].push(numValue);
      
      return acc;
    }, {} as Record<string, number[]>);
    
    return Object.entries(byDate)
      .map(([date, values]) => ({
        date,
        value: values.reduce((sum, v) => sum + v, 0) / values.length,
        metadata: { count: values.length, sum: values.reduce((sum, v) => sum + v, 0) }
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private detectOutliers(series: TimeSeries[], metric: string): AnomalyResult[] {
    const values = series.map(s => s.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
    
    const outliers: AnomalyResult[] = [];
    
    series.forEach((point, index) => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      
      if (zScore > this.ANOMALY_THRESHOLD) {
        outliers.push({
          id: `outlier_${metric}_${index}`,
          type: 'outlier',
          score: Math.min(100, zScore * 20), // Scale to 0-100
          description: `${metric} value ${point.value.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from normal`,
          impact: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
          recommendations: [
            zScore > 3 
              ? `Investigate what caused extreme ${metric} on ${point.date}` 
              : `Monitor ${metric} patterns around ${point.date}`
          ]
        });
      }
    });
    
    return outliers;
  }

  private detectTrendBreaks(series: TimeSeries[], metric: string): AnomalyResult[] {
    if (series.length < 10) return [];
    
    const breaks: AnomalyResult[] = [];
    const windowSize = 5;
    
    for (let i = windowSize; i < series.length - windowSize; i++) {
      const beforeWindow = series.slice(i - windowSize, i).map(s => s.value);
      const afterWindow = series.slice(i, i + windowSize).map(s => s.value);
      
      const beforeAvg = beforeWindow.reduce((sum, v) => sum + v, 0) / beforeWindow.length;
      const afterAvg = afterWindow.reduce((sum, v) => sum + v, 0) / afterWindow.length;
      
      const changePercent = Math.abs((afterAvg - beforeAvg) / beforeAvg) * 100;
      
      if (changePercent > 30) { // Significant change
        breaks.push({
          id: `trend_break_${metric}_${i}`,
          type: 'trend_break',
          score: Math.min(100, changePercent),
          description: `${metric} changed by ${changePercent.toFixed(1)}% around ${series[i].date}`,
          impact: changePercent > 50 ? 'high' : changePercent > 30 ? 'medium' : 'low',
          recommendations: [
            `Analyze what caused the ${changePercent.toFixed(1)}% change in ${metric}`,
            `Consider adjusting strategy based on this performance shift`
          ]
        });
      }
    }
    
    return breaks;
  }

  private detectSeasonalAnomalies(analytics: PostingSuccessAnalytics[]): AnomalyResult[] {
    // Group by day of week to detect weekly seasonal patterns
    const byDayOfWeek = analytics.reduce((acc, record) => {
      if (!acc[record.dayOfWeek]) acc[record.dayOfWeek] = [];
      acc[record.dayOfWeek].push(parseFloat(record.success_score || '0'));
      return acc;
    }, {} as Record<number, number[]>);
    
    // Calculate average performance per day
    const dayAverages = Object.entries(byDayOfWeek).map(([day, scores]) => ({
      day: parseInt(day),
      avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      count: scores.length
    }));
    
    const overallAvg = dayAverages.reduce((sum, d) => sum + d.avg * d.count, 0) / 
                      dayAverages.reduce((sum, d) => sum + d.count, 0);
    
    const anomalies: AnomalyResult[] = [];
    
    dayAverages.forEach(dayData => {
      const deviation = Math.abs(dayData.avg - overallAvg);
      const deviationPercent = (deviation / overallAvg) * 100;
      
      if (deviationPercent > 25) { // Significant seasonal deviation
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayData.day];
        
        anomalies.push({
          id: `seasonal_${dayData.day}`,
          type: 'seasonal_anomaly',
          score: Math.min(100, deviationPercent),
          description: `${dayName} performance deviates ${deviationPercent.toFixed(1)}% from average`,
          impact: deviationPercent > 40 ? 'high' : 'medium',
          recommendations: [
            dayData.avg > overallAvg 
              ? `Prioritize posting on ${dayName}s - ${deviationPercent.toFixed(1)}% above average`
              : `Consider avoiding ${dayName}s or adjust strategy - ${deviationPercent.toFixed(1)}% below average`
          ]
        });
      }
    });
    
    return anomalies;
  }

  private calculateTrend(series: TimeSeries[]): TrendAnalysis {
    if (series.length < this.TREND_MIN_POINTS) {
      throw new Error('Insufficient data for trend analysis');
    }
    
    // Simple linear regression for trend
    const n = series.length;
    const sumX = series.reduce((sum, _, i) => sum + i, 0);
    const sumY = series.reduce((sum, point) => sum + point.value, 0);
    const sumXY = series.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumX2 = series.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for trend strength
    const yMean = sumY / n;
    const totalSumSquares = series.reduce((sum, point) => sum + Math.pow(point.value - yMean, 2), 0);
    const residualSumSquares = series.reduce((sum, point, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(point.value - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    const strength = Math.max(0, Math.min(100, rSquared * 100));
    
    // Classify trend direction
    let direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.1) direction = 'stable';
    else if (slope > 0) direction = 'increasing';
    else direction = 'decreasing';
    
    // Check for volatility
    const volatility = this.calculateVolatility(series);
    if (volatility > 0.3) direction = 'volatile';
    
    // Detect seasonality (simplified)
    const seasonality = this.detectSeasonality(series);
    
    // Detect change points
    const changePoints = this.detectChangePoints(series);
    
    return {
      direction,
      strength,
      slope,
      confidence: Math.min(100, 50 + (n * 2) + strength),
      seasonality,
      changePoints
    };
  }

  private calculateVolatility(series: TimeSeries[]): number {
    if (series.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < series.length; i++) {
      const change = Math.abs(series[i].value - series[i-1].value) / series[i-1].value;
      changes.push(change);
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }

  private detectSeasonality(series: TimeSeries[]): { detected: boolean; period?: number; strength?: number } {
    // Simple autocorrelation-based seasonality detection
    if (series.length < 14) return { detected: false };
    
    const maxLag = Math.min(7, Math.floor(series.length / 3)); // Check up to 7-day cycles
    let bestCorrelation = 0;
    let bestPeriod = 0;
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const correlation = this.calculateAutocorrelation(series, lag);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = lag;
      }
    }
    
    const detected = bestCorrelation > 0.3;
    return {
      detected,
      period: detected ? bestPeriod : undefined,
      strength: detected ? Math.round(bestCorrelation * 100) : undefined
    };
  }

  private calculateAutocorrelation(series: TimeSeries[], lag: number): number {
    if (lag >= series.length) return 0;
    
    const n = series.length - lag;
    const values1 = series.slice(0, n).map(s => s.value);
    const values2 = series.slice(lag, lag + n).map(s => s.value);
    
    return this.calculatePearsonCorrelation(values1, values2);
  }

  private detectChangePoints(series: TimeSeries[]): Array<{
    date: string;
    significance: number;
    type: 'increase' | 'decrease' | 'volatility_change';
  }> {
    const changePoints: Array<{
      date: string;
      significance: number;
      type: 'increase' | 'decrease' | 'volatility_change';
    }> = [];
    
    const windowSize = Math.min(5, Math.floor(series.length / 4));
    
    for (let i = windowSize; i < series.length - windowSize; i++) {
      const beforeWindow = series.slice(i - windowSize, i);
      const afterWindow = series.slice(i, i + windowSize);
      
      const beforeAvg = beforeWindow.reduce((sum, s) => sum + s.value, 0) / beforeWindow.length;
      const afterAvg = afterWindow.reduce((sum, s) => sum + s.value, 0) / afterWindow.length;
      
      const change = (afterAvg - beforeAvg) / beforeAvg;
      const significance = Math.abs(change) * 100;
      
      if (significance > 20) { // Significant change point
        changePoints.push({
          date: series[i].date,
          significance: Math.round(significance),
          type: change > 0 ? 'increase' : 'decrease'
        });
      }
    }
    
    // Remove nearby change points (keep most significant)
    return changePoints
      .sort((a, b) => b.significance - a.significance)
      .filter((point, index, array) => {
        // Keep if no other point is within 3 days
        return !array.slice(0, index).some(other => 
          Math.abs(new Date(point.date).getTime() - new Date(other.date).getTime()) < 3 * 24 * 60 * 60 * 1000
        );
      });
  }

  private groupByMarketplace(analytics: PostingSuccessAnalytics[]): Record<string, PostingSuccessAnalytics[]> {
    return analytics.reduce((acc, record) => {
      if (!acc[record.marketplace]) acc[record.marketplace] = [];
      acc[record.marketplace].push(record);
      return acc;
    }, {} as Record<string, PostingSuccessAnalytics[]>);
  }

  private createSegments(analytics: PostingSuccessAnalytics[]): Array<{
    id: string;
    name: string;
    criteria: Record<string, any>;
  }> {
    return [
      {
        id: 'high_engagement',
        name: 'High Engagement Posts',
        criteria: { engagement_score_min: 70 }
      },
      {
        id: 'weekend_posts',
        name: 'Weekend Posts',
        criteria: { dayOfWeek_in: [0, 6] }
      },
      {
        id: 'evening_posts',
        name: 'Evening Posts',
        criteria: { hourOfDay_min: 17, hourOfDay_max: 22 }
      },
      {
        id: 'high_price_range',
        name: 'High Price Range',
        criteria: { priceRange: 'high' }
      },
      {
        id: 'fashion_category',
        name: 'Fashion Category',
        criteria: { category_includes: ['fashion', 'clothing', 'accessories'] }
      },
      {
        id: 'electronics_category',
        name: 'Electronics Category',
        criteria: { category_includes: ['electronics', 'tech', 'gadgets'] }
      }
    ];
  }

  private matchesSegment(record: PostingSuccessAnalytics, criteria: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      const [field, operator] = key.split('_');
      const recordValue = (record as any)[field];
      
      switch (operator) {
        case 'min':
          if (parseFloat(recordValue || '0') < value) return false;
          break;
        case 'max':
          if (parseFloat(recordValue || '0') > value) return false;
          break;
        case 'in':
          if (!value.includes(recordValue)) return false;
          break;
        case 'includes':
          if (!value.some((term: string) => (recordValue || '').toLowerCase().includes(term))) return false;
          break;
        default:
          if (recordValue !== value) return false;
      }
    }
    
    return true;
  }

  private calculateSegmentPerformance(data: PostingSuccessAnalytics[]): {
    avgSuccessScore: number;
    conversionRate: number;
    avgEngagement: number;
    count: number;
  } {
    const count = data.length;
    const avgSuccessScore = data.reduce((sum, d) => sum + parseFloat(d.success_score || '0'), 0) / count;
    const conversionRate = (data.filter(d => d.sold).length / count) * 100;
    const avgEngagement = data.reduce((sum, d) => sum + parseFloat(d.engagement_score || '0'), 0) / count;
    
    return { avgSuccessScore, conversionRate, avgEngagement, count };
  }

  private generateSegmentRecommendations(segment: any, performance: any): string[] {
    const recommendations: string[] = [];
    
    if (performance.avgSuccessScore > 70) {
      recommendations.push(`${segment.name} performs well - prioritize this segment`);
    } else if (performance.avgSuccessScore < 40) {
      recommendations.push(`${segment.name} underperforms - consider strategy adjustments`);
    }
    
    if (performance.conversionRate > 15) {
      recommendations.push(`High conversion rate in ${segment.name} - scale up efforts`);
    }
    
    if (performance.avgEngagement > 60) {
      recommendations.push(`Strong engagement in ${segment.name} - good content-market fit`);
    }
    
    return recommendations;
  }

  private calculateOverallConfidence(sampleSize: number, significantPatterns: number): number {
    const sampleConfidence = Math.min(90, 30 + sampleSize * 0.5);
    const patternConfidence = Math.min(90, significantPatterns * 10);
    return Math.round((sampleConfidence + patternConfidence) / 2);
  }

  private generateSummaryRecommendations(results: any): string[] {
    const recommendations: string[] = [];
    
    // From correlations
    if (results.correlations?.length > 0) {
      const strongCorrelations = results.correlations.filter((c: CorrelationResult) => 
        Math.abs(c.correlation) > 0.6
      );
      strongCorrelations.forEach((corr: CorrelationResult) => {
        recommendations.push(
          `Strong ${corr.correlation > 0 ? 'positive' : 'negative'} relationship between ${corr.variable1} and ${corr.variable2}`
        );
      });
    }
    
    // From trends  
    if (results.trends) {
      Object.entries(results.trends).forEach(([marketplace, trend]: [string, any]) => {
        if (trend.direction === 'increasing' && trend.strength > 60) {
          recommendations.push(`${marketplace} shows strong upward trend - capitalize on momentum`);
        } else if (trend.direction === 'decreasing' && trend.strength > 60) {
          recommendations.push(`${marketplace} declining - investigate and adjust strategy`);
        }
      });
    }
    
    // From segmentation
    if (results.segmentation?.optimalSegment) {
      const optimal = results.segmentation.segments.find((s: any) => s.id === results.segmentation.optimalSegment);
      if (optimal) {
        recommendations.push(`Focus on ${optimal.name} - highest performing segment`);
      }
    }
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Real-time pattern monitoring - detect patterns as they emerge
   */
  async monitorRealTimePatterns(userId: string, newRecord: PostingSuccessAnalytics): Promise<{
    alerts: string[];
    opportunities: string[];
    confidence: number;
  }> {
    // Get recent data for comparison
    const recentData = await storage.getPostingSuccessAnalytics(userId, {
      startDate: subDays(new Date(), 30)
    });
    
    const alerts: string[] = [];
    const opportunities: string[] = [];
    
    // Check if new record is an outlier
    const marketplace = newRecord.marketplace;
    const marketplaceData = recentData.filter(r => r.marketplace === marketplace);
    
    if (marketplaceData.length > 10) {
      const avgSuccess = marketplaceData.reduce((sum, r) => sum + parseFloat(r.success_score || '0'), 0) / marketplaceData.length;
      const currentSuccess = parseFloat(newRecord.success_score || '0');
      
      const deviationPercent = Math.abs(currentSuccess - avgSuccess) / avgSuccess * 100;
      
      if (deviationPercent > 50) {
        if (currentSuccess > avgSuccess) {
          opportunities.push(`Exceptional performance on ${marketplace} - ${deviationPercent.toFixed(1)}% above average`);
        } else {
          alerts.push(`Poor performance on ${marketplace} - ${deviationPercent.toFixed(1)}% below average`);
        }
      }
    }
    
    return {
      alerts,
      opportunities,
      confidence: marketplaceData.length > 20 ? 85 : 60
    };
  }

  /**
   * Analyze patterns specific to batch operations
   */
  async analyzeBatchPatterns(userId: string, batchType: string): Promise<{
    correlations: CorrelationResult[];
    recommendations: string[];
    optimalBatchSize?: number;
    bestTimeSlots?: Array<{ hour: number; success_rate: number }>;
    marketplacePreferences?: Array<{ marketplace: string; preference_score: number }>;
  }> {
    console.log(`🔍 Analyzing batch patterns for user ${userId}, type: ${batchType}`);
    
    try {
      // Get historical batch performance data
      const analytics = await storage.getPostingSuccessAnalytics(userId, {
        startDate: subDays(new Date(), 90)
      });
      
      if (analytics.length < 5) {
        return {
          correlations: [],
          recommendations: ['Insufficient data for batch pattern analysis'],
          optimalBatchSize: 10
        };
      }
      
      // Analyze time-based patterns
      const timeSlots = analytics.reduce((acc, record) => {
        const hour = record.hourOfDay;
        const success = parseFloat(record.success_score || '0');
        if (!acc[hour]) acc[hour] = { total: 0, count: 0 };
        acc[hour].total += success;
        acc[hour].count += 1;
        return acc;
      }, {} as Record<number, { total: number; count: number }>);
      
      const bestTimeSlots = Object.entries(timeSlots)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          success_rate: data.total / data.count
        }))
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 6);
      
      // Analyze marketplace preferences
      const marketplaceStats = analytics.reduce((acc, record) => {
        const marketplace = record.marketplace;
        const success = parseFloat(record.success_score || '0');
        if (!acc[marketplace]) acc[marketplace] = { total: 0, count: 0 };
        acc[marketplace].total += success;
        acc[marketplace].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: 0 }>);
      
      const marketplacePreferences = Object.entries(marketplaceStats)
        .map(([marketplace, data]) => ({
          marketplace,
          preference_score: data.total / data.count
        }))
        .sort((a, b) => b.preference_score - a.preference_score);
      
      // Generate correlations
      const correlations = await this.analyzeCorrelations(analytics);
      
      // Generate recommendations
      const recommendations = [
        `Optimal batch processing times: ${bestTimeSlots.slice(0, 3).map(t => `${t.hour}:00`).join(', ')}`,
        `Top performing marketplaces: ${marketplacePreferences.slice(0, 3).map(m => m.marketplace).join(', ')}`,
        `Recommended batch size: ${Math.min(50, Math.max(10, analytics.length / 10))} items`
      ];
      
      return {
        correlations,
        recommendations,
        optimalBatchSize: Math.min(50, Math.max(10, analytics.length / 10)),
        bestTimeSlots,
        marketplacePreferences
      };
      
    } catch (error) {
      console.error('Error analyzing batch patterns:', error);
      return {
        correlations: [],
        recommendations: ['Error analyzing batch patterns'],
        optimalBatchSize: 20
      };
    }
  }
}

export const patternAnalysisService = new PatternAnalysisService();