import { z } from 'zod';

// Analytics schemas
export const SalesMetricsSchema = z.object({
  date: z.date(),
  revenue: z.number(),
  units: z.number(),
  averagePrice: z.number(),
  marketplace: z.string().optional(),
  category: z.string().optional(),
});

export const InventoryMetricsSchema = z.object({
  category: z.string(),
  total: z.number(),
  active: z.number(),
  sold: z.number(),
  stale: z.number(),
  averagePrice: z.number(),
  sellThroughRate: z.number(),
});

export const MarketplaceMetricsSchema = z.object({
  marketplace: z.string(),
  listings: z.number(),
  revenue: z.number(),
  sellThroughRate: z.number(),
  averagePrice: z.number(),
  averageDaysToSell: z.number(),
  totalViews: z.number().optional(),
  conversionRate: z.number().optional(),
});

export const AnalyticsOverviewSchema = z.object({
  totalListings: z.number(),
  activeListings: z.number(),
  soldListings: z.number(),
  totalRevenue: z.number(),
  averageSellingPrice: z.number(),
  sellThroughRate: z.number(),
  averageDaysToSell: z.number(),
  totalViews: z.number().optional(),
  conversionRate: z.number().optional(),
});

export type SalesMetrics = z.infer<typeof SalesMetricsSchema>;
export type InventoryMetrics = z.infer<typeof InventoryMetricsSchema>;
export type MarketplaceMetrics = z.infer<typeof MarketplaceMetricsSchema>;
export type AnalyticsOverview = z.infer<typeof AnalyticsOverviewSchema>;

// Analytics service interface
export interface AnalyticsService {
  getOverview(dateRange: DateRange): Promise<AnalyticsOverview>;
  getSalesMetrics(dateRange: DateRange, filters?: AnalyticsFilters): Promise<SalesMetrics[]>;
  getInventoryMetrics(filters?: AnalyticsFilters): Promise<InventoryMetrics[]>;
  getMarketplaceMetrics(dateRange: DateRange, filters?: AnalyticsFilters): Promise<MarketplaceMetrics[]>;
  getTrends(metric: string, dateRange: DateRange): Promise<TrendData[]>;
  exportData(type: string, dateRange: DateRange, filters?: AnalyticsFilters): Promise<ExportData>;
}

// Supporting types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  marketplace?: string;
  category?: string;
  brand?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  condition?: string;
}

export interface TrendData {
  date: Date;
  value: number;
  change: number;
  changePercentage: number;
}

export interface ExportData {
  data: any[];
  format: 'csv' | 'json' | 'xlsx';
  filename: string;
  url: string;
}

// Mock implementation
export class MockAnalyticsService implements AnalyticsService {
  async getOverview(dateRange: DateRange): Promise<AnalyticsOverview> {
    // Mock data - in real implementation, this would query the database
    return {
      totalListings: 1250,
      activeListings: 890,
      soldListings: 360,
      totalRevenue: 45230,
      averageSellingPrice: 125.64,
      sellThroughRate: 28.8,
      averageDaysToSell: 23,
      totalViews: 15600,
      conversionRate: 2.3,
    };
  }

  async getSalesMetrics(dateRange: DateRange, filters?: AnalyticsFilters): Promise<SalesMetrics[]> {
    // Mock data - in real implementation, this would query the database
    const mockData: SalesMetrics[] = [
      {
        date: new Date('2024-01-01'),
        revenue: 1200,
        units: 8,
        averagePrice: 150,
        marketplace: 'eBay',
        category: 'Clothing',
      },
      {
        date: new Date('2024-01-02'),
        revenue: 950,
        units: 6,
        averagePrice: 158.33,
        marketplace: 'Poshmark',
        category: 'Electronics',
      },
      {
        date: new Date('2024-01-03'),
        revenue: 1800,
        units: 12,
        averagePrice: 150,
        marketplace: 'Mercari',
        category: 'Home & Garden',
      },
    ];

    // Apply filters if provided
    if (filters) {
      return mockData.filter(metric => {
        if (filters.marketplace && metric.marketplace !== filters.marketplace) return false;
        if (filters.category && metric.category !== filters.category) return false;
        return true;
      });
    }

    return mockData;
  }

  async getInventoryMetrics(filters?: AnalyticsFilters): Promise<InventoryMetrics[]> {
    // Mock data - in real implementation, this would query the database
    const mockData: InventoryMetrics[] = [
      {
        category: 'Clothing',
        total: 650,
        active: 480,
        sold: 170,
        stale: 45,
        averagePrice: 85.50,
        sellThroughRate: 26.2,
      },
      {
        category: 'Electronics',
        total: 320,
        active: 210,
        sold: 110,
        stale: 25,
        averagePrice: 145.20,
        sellThroughRate: 34.4,
      },
      {
        category: 'Home & Garden',
        total: 280,
        active: 200,
        sold: 80,
        stale: 15,
        averagePrice: 95.75,
        sellThroughRate: 28.6,
      },
    ];

    // Apply filters if provided
    if (filters) {
      return mockData.filter(metric => {
        if (filters.category && metric.category !== filters.category) return false;
        return true;
      });
    }

    return mockData;
  }

  async getMarketplaceMetrics(dateRange: DateRange, filters?: AnalyticsFilters): Promise<MarketplaceMetrics[]> {
    // Mock data - in real implementation, this would query the database
    const mockData: MarketplaceMetrics[] = [
      {
        marketplace: 'eBay',
        listings: 450,
        revenue: 18500,
        sellThroughRate: 32.1,
        averagePrice: 128.50,
        averageDaysToSell: 21,
        totalViews: 8500,
        conversionRate: 2.8,
      },
      {
        marketplace: 'Poshmark',
        listings: 320,
        revenue: 15200,
        sellThroughRate: 28.5,
        averagePrice: 118.75,
        averageDaysToSell: 25,
        totalViews: 4200,
        conversionRate: 2.1,
      },
      {
        marketplace: 'Mercari',
        listings: 280,
        revenue: 11530,
        sellThroughRate: 25.2,
        averagePrice: 105.20,
        averageDaysToSell: 28,
        totalViews: 2900,
        conversionRate: 1.9,
      },
    ];

    // Apply filters if provided
    if (filters) {
      return mockData.filter(metric => {
        if (filters.marketplace && metric.marketplace !== filters.marketplace) return false;
        return true;
      });
    }

    return mockData;
  }

  async getTrends(metric: string, dateRange: DateRange): Promise<TrendData[]> {
    // Mock data - in real implementation, this would query the database
    const mockData: TrendData[] = [
      {
        date: new Date('2024-01-01'),
        value: 1200,
        change: 50,
        changePercentage: 4.3,
      },
      {
        date: new Date('2024-01-02'),
        value: 950,
        change: -250,
        changePercentage: -20.8,
      },
      {
        date: new Date('2024-01-03'),
        value: 1800,
        change: 850,
        changePercentage: 89.5,
      },
    ];

    return mockData;
  }

  async exportData(type: string, dateRange: DateRange, filters?: AnalyticsFilters): Promise<ExportData> {
    // Mock implementation - in real implementation, this would generate actual export files
    const filename = `analytics-${type}-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.csv`;
    
    return {
      data: [],
      format: 'csv',
      filename,
      url: `/exports/${filename}`,
    };
  }
}

// Analytics utilities
export class AnalyticsUtils {
  /**
   * Calculate sell-through rate
   */
  static calculateSellThroughRate(sold: number, total: number): number {
    if (total === 0) return 0;
    return (sold / total) * 100;
  }

  /**
   * Calculate average selling price
   */
  static calculateAverageSellingPrice(revenue: number, units: number): number {
    if (units === 0) return 0;
    return revenue / units;
  }

  /**
   * Calculate conversion rate
   */
  static calculateConversionRate(conversions: number, views: number): number {
    if (views === 0) return 0;
    return (conversions / views) * 100;
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Generate date range for common periods
   */
  static getDateRange(period: '7d' | '30d' | '90d' | '1y'): DateRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  }
}

// Export singleton instance
export const analyticsService = new MockAnalyticsService();

// Export types for use in other modules
export type { AnalyticsService, DateRange, AnalyticsFilters, TrendData, ExportData };
