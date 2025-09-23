import { PriceCheckAnalytics, ClickThrough } from '../types/ebay';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AnalyticsService {
  private static readonly ANALYTICS_KEY = 'price_check_analytics';
  private static readonly MAX_ANALYTICS_ENTRIES = 1000;

  // Track a price check query
  static async trackPriceCheck(analytics: PriceCheckAnalytics): Promise<void> {
    try {
      const existingAnalytics = await this.getAnalytics();
      existingAnalytics.push(analytics);
      
      // Keep only the most recent entries
      if (existingAnalytics.length > this.MAX_ANALYTICS_ENTRIES) {
        existingAnalytics.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        existingAnalytics.splice(this.MAX_ANALYTICS_ENTRIES);
      }
      
      await AsyncStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(existingAnalytics));
    } catch (error) {
      console.error('Error tracking price check:', error);
    }
  }

  // Track click-through events
  static async trackClickThrough(queryId: string, type: 'ebay_item' | 'ebay_search' | 'save_query', target: string): Promise<void> {
    try {
      const existingAnalytics = await this.getAnalytics();
      const analyticsEntry = existingAnalytics.find(a => a.queryId === queryId);
      
      if (analyticsEntry) {
        const clickThrough: ClickThrough = {
          type,
          target,
          timestamp: new Date(),
        };
        
        analyticsEntry.clickThroughs.push(clickThrough);
        await AsyncStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(existingAnalytics));
      }
    } catch (error) {
      console.error('Error tracking click-through:', error);
    }
  }

  // Get analytics data
  static async getAnalytics(): Promise<PriceCheckAnalytics[]> {
    try {
      const data = await AsyncStorage.getItem(this.ANALYTICS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  // Get analytics summary
  static async getAnalyticsSummary(): Promise<{
    totalQueries: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    mostSearchedItems: Array<{ query: string; count: number }>;
    clickThroughRate: number;
    timeRange: { start: Date; end: Date };
  }> {
    try {
      const analytics = await this.getAnalytics();
      
      if (analytics.length === 0) {
        return {
          totalQueries: 0,
          averageProcessingTime: 0,
          cacheHitRate: 0,
          mostSearchedItems: [],
          clickThroughRate: 0,
          timeRange: { start: new Date(), end: new Date() },
        };
      }

      const totalQueries = analytics.length;
      const averageProcessingTime = analytics.reduce((sum, a) => sum + a.processingTime, 0) / totalQueries;
      const cacheHits = analytics.filter(a => a.cacheHit).length;
      const cacheHitRate = cacheHits / totalQueries;
      
      // Count query frequencies
      const queryCounts: Record<string, number> = {};
      analytics.forEach(a => {
        queryCounts[a.query] = (queryCounts[a.query] || 0) + 1;
      });
      
      const mostSearchedItems = Object.entries(queryCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Calculate click-through rate
      const totalClickThroughs = analytics.reduce((sum, a) => sum + a.clickThroughs.length, 0);
      const clickThroughRate = totalClickThroughs / totalQueries;
      
      // Get time range
      const timestamps = analytics.map(a => new Date(a.timestamp));
      const timeRange = {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime()))),
      };

      return {
        totalQueries,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        mostSearchedItems,
        clickThroughRate: Math.round(clickThroughRate * 100) / 100,
        timeRange,
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {
        totalQueries: 0,
        averageProcessingTime: 0,
        cacheHitRate: 0,
        mostSearchedItems: [],
        clickThroughRate: 0,
        timeRange: { start: new Date(), end: new Date() },
      };
    }
  }

  // Clear analytics data
  static async clearAnalytics(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ANALYTICS_KEY);
    } catch (error) {
      console.error('Error clearing analytics:', error);
    }
  }

  // Export analytics data
  static async exportAnalytics(): Promise<string> {
    try {
      const analytics = await this.getAnalytics();
      return JSON.stringify(analytics, null, 2);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      return '[]';
    }
  }
}
