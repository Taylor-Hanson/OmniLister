import { storage } from "../storage";
import type { AnalyticsEvent, SalesMetrics, InventoryMetrics, MarketplaceMetrics, Listing } from "@shared/schema";
import { subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { crossPlatformSyncService } from "./crossPlatformSyncService";

export class AnalyticsService {
  // Track user events and actions
  async trackEvent(userId: string, eventType: string, eventData: any, marketplace?: string, listingId?: string, revenue?: number, profit?: number) {
    return await storage.createAnalyticsEvent(userId, {
      eventType,
      eventData,
      marketplace: marketplace || null,
      listingId: listingId || null,
      revenue: revenue?.toString() || null,
      profit: profit?.toString() || null,
    });
  }

  // Track sale metrics
  async trackSale(userId: string, listing: Listing, marketplace: string, salePrice: number, fees: number, saleData?: any) {
    const profit = salePrice - fees;
    const margin = (profit / salePrice) * 100;
    const daysToSell = listing.createdAt ? differenceInDays(new Date(), new Date(listing.createdAt)) : null;

    await storage.createSalesMetrics(userId, {
      listingId: listing.id,
      salePrice: salePrice.toString(),
      fees: fees.toString(),
      profit: profit.toString(),
      margin: margin.toString(),
      daysToSell,
      marketplace,
      category: listing.category || null,
      brand: listing.brand || null,
    });

    // Also track as an event
    await this.trackEvent(userId, 'listing_sold', {
      listingId: listing.id,
      marketplace,
      salePrice,
      fees,
      profit,
    }, marketplace, listing.id, salePrice, profit);

    // Update listing status
    await storage.updateListing(listing.id, { status: 'sold' });

    // TRIGGER CROSS-PLATFORM SYNC - Automatically delist from other marketplaces
    try {
      console.log(`🚀 Triggering cross-platform sync for listing ${listing.id} sold on ${marketplace}`);
      
      const syncResult = await crossPlatformSyncService.triggerSaleSync(
        userId, 
        listing, 
        marketplace, 
        salePrice, 
        {
          ...saleData,
          fees,
          profit,
          margin,
          trackingSource: 'analytics_service',
          triggerTime: new Date().toISOString()
        }
      );

      console.log(`✅ Cross-platform sync completed for listing ${listing.id}:`, {
        syncJobId: syncResult.syncJobId,
        totalMarketplaces: syncResult.totalMarketplaces,
        successful: syncResult.successful,
        failed: syncResult.failed,
        status: syncResult.status,
        duration: `${syncResult.duration}ms`
      });

      // Track sync event for analytics
      await this.trackEvent(userId, 'cross_platform_sync_triggered', {
        listingId: listing.id,
        soldMarketplace: marketplace,
        syncJobId: syncResult.syncJobId,
        totalMarketplaces: syncResult.totalMarketplaces,
        successful: syncResult.successful,
        failed: syncResult.failed,
        status: syncResult.status,
        syncDuration: syncResult.duration
      }, marketplace, listing.id);

    } catch (syncError: any) {
      console.error(`❌ Cross-platform sync failed for listing ${listing.id}:`, syncError);
      
      // Track sync failure event
      await this.trackEvent(userId, 'cross_platform_sync_failed', {
        listingId: listing.id,
        soldMarketplace: marketplace,
        error: syncError.message,
        errorDetails: {
          name: syncError.name,
          stack: syncError.stack?.substring(0, 500) // Limit stack trace length
        }
      }, marketplace, listing.id);

      // Don't throw the error - sale tracking should still complete even if sync fails
      // This ensures that the core sale recording isn't disrupted by sync issues
    }
  }

  // Calculate overview metrics
  async getOverviewMetrics(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const [salesMetrics, listings, events, inventoryMetrics] = await Promise.all([
      storage.getSalesMetrics(userId, { startDate, endDate }),
      storage.getListings(userId),
      storage.getAnalyticsEvents(userId, { startDate, endDate }),
      storage.getInventoryMetrics(userId),
    ]);

    const activeListings = listings.filter(l => l.status === 'active').length;
    const soldListings = salesMetrics.length;
    const totalRevenue = salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.salePrice), 0);
    const totalProfit = salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const totalFees = salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.fees), 0);
    const avgDaysToSell = salesMetrics.length > 0 
      ? salesMetrics.reduce((sum, sale) => sum + (sale.daysToSell || 0), 0) / salesMetrics.length 
      : 0;
    const conversionRate = listings.length > 0 ? (soldListings / listings.length) * 100 : 0;
    const avgMargin = salesMetrics.length > 0
      ? salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.margin || '0'), 0) / salesMetrics.length
      : 0;

    // Calculate sales velocity (items per day/week/month)
    const salesPerDay = soldListings / days;
    const salesPerWeek = salesPerDay * 7;
    const salesPerMonth = salesPerDay * 30;

    // Get stale inventory (unsold for 30+ days)
    const staleInventory = inventoryMetrics.filter(item => 
      item.status === 'active' && (item.ageInDays || 0) >= 30
    ).length;

    return {
      activeListings,
      soldListings,
      totalRevenue,
      totalProfit,
      totalFees,
      avgDaysToSell,
      conversionRate,
      avgMargin,
      salesVelocity: {
        daily: salesPerDay,
        weekly: salesPerWeek,
        monthly: salesPerMonth,
      },
      staleInventory,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }

  // Get revenue analytics
  async getRevenueAnalytics(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const salesMetrics = await storage.getSalesMetrics(userId, { startDate, endDate });

    // Group by date for time series
    const revenueByDate = new Map<string, { revenue: number; profit: number; fees: number }>();
    salesMetrics.forEach(sale => {
      if (sale.soldAt) {
        const date = new Date(sale.soldAt).toISOString().split('T')[0];
        const existing = revenueByDate.get(date) || { revenue: 0, profit: 0, fees: 0 };
        revenueByDate.set(date, {
          revenue: existing.revenue + parseFloat(sale.salePrice),
          profit: existing.profit + parseFloat(sale.profit),
          fees: existing.fees + parseFloat(sale.fees),
        });
      }
    });

    // Group by marketplace
    const revenueByMarketplace = new Map<string, number>();
    const profitByMarketplace = new Map<string, number>();
    salesMetrics.forEach(sale => {
      const currentRevenue = revenueByMarketplace.get(sale.marketplace) || 0;
      const currentProfit = profitByMarketplace.get(sale.marketplace) || 0;
      revenueByMarketplace.set(sale.marketplace, currentRevenue + parseFloat(sale.salePrice));
      profitByMarketplace.set(sale.marketplace, currentProfit + parseFloat(sale.profit));
    });

    // Group by category
    const revenueByCategory = new Map<string, number>();
    salesMetrics.forEach(sale => {
      const category = sale.category || 'Other';
      const current = revenueByCategory.get(category) || 0;
      revenueByCategory.set(category, current + parseFloat(sale.salePrice));
    });

    // Calculate ROI
    const totalInvestment = salesMetrics.reduce((sum, sale) => {
      return sum + (parseFloat(sale.salePrice) - parseFloat(sale.profit));
    }, 0);
    const roi = totalInvestment > 0 ? (salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.profit), 0) / totalInvestment) * 100 : 0;

    return {
      timeSeries: Array.from(revenueByDate.entries()).map(([date, data]) => ({
        date,
        ...data,
      })),
      byMarketplace: Array.from(revenueByMarketplace.entries()).map(([marketplace, revenue]) => ({
        marketplace,
        revenue,
        profit: profitByMarketplace.get(marketplace) || 0,
      })),
      byCategory: Array.from(revenueByCategory.entries()).map(([category, revenue]) => ({
        category,
        revenue,
      })),
      roi,
      totalRevenue: salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.salePrice), 0),
      totalProfit: salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
      totalFees: salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.fees), 0),
    };
  }

  // Get inventory analytics
  async getInventoryAnalytics(userId: string) {
    const [inventoryMetrics, listings] = await Promise.all([
      storage.getInventoryMetrics(userId),
      storage.getListings(userId, { status: 'active' }),
    ]);

    // Update age of inventory
    for (const metric of inventoryMetrics) {
      if (metric.listDate) {
        const ageInDays = differenceInDays(new Date(), new Date(metric.listDate));
        await storage.updateInventoryMetrics(metric.id, { ageInDays });
      }
    }

    // Categorize by age
    const agingReport = {
      fresh: inventoryMetrics.filter(m => (m.ageInDays || 0) < 30).length,
      stale: inventoryMetrics.filter(m => (m.ageInDays || 0) >= 30 && (m.ageInDays || 0) < 60).length,
      aged: inventoryMetrics.filter(m => (m.ageInDays || 0) >= 60 && (m.ageInDays || 0) < 90).length,
      dead: inventoryMetrics.filter(m => (m.ageInDays || 0) >= 90).length,
    };

    // Calculate turnover by category
    const turnoverByCategory = new Map<string, { items: number; avgAge: number; turnoverRate: number }>();
    inventoryMetrics.forEach(metric => {
      const category = metric.category || 'Other';
      const current = turnoverByCategory.get(category) || { items: 0, avgAge: 0, turnoverRate: 0 };
      turnoverByCategory.set(category, {
        items: current.items + 1,
        avgAge: (current.avgAge * current.items + (metric.ageInDays || 0)) / (current.items + 1),
        turnoverRate: parseFloat(metric.turnoverRate || '0'),
      });
    });

    // Identify dead stock
    const deadStock = inventoryMetrics
      .filter(m => (m.ageInDays || 0) >= 90)
      .map(m => {
        const listing = listings.find(l => l.id === m.listingId);
        return {
          listingId: m.listingId,
          title: listing?.title || 'Unknown',
          category: m.category,
          ageInDays: m.ageInDays,
          suggestedAction: m.ageInDays! > 120 ? 'Consider deep discount or removal' : 'Reduce price by 20-30%',
        };
      });

    return {
      agingReport,
      turnoverByCategory: Array.from(turnoverByCategory.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
      deadStock,
      totalInventoryValue: listings.reduce((sum, listing) => sum + parseFloat(listing.price) * (listing.quantity || 1), 0),
      avgInventoryAge: inventoryMetrics.length > 0
        ? inventoryMetrics.reduce((sum, m) => sum + (m.ageInDays || 0), 0) / inventoryMetrics.length
        : 0,
    };
  }

  // Get marketplace performance analytics
  async getMarketplaceAnalytics(userId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    const [salesMetrics, marketplaceMetrics, listings] = await Promise.all([
      storage.getSalesMetrics(userId, { startDate, endDate }),
      storage.getMarketplaceMetrics(userId),
      storage.getListings(userId),
    ]);

    // Calculate metrics per marketplace
    const marketplacePerformance = new Map<string, any>();
    
    // Group sales by marketplace
    salesMetrics.forEach(sale => {
      const current = marketplacePerformance.get(sale.marketplace) || {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalFees: 0,
        avgDaysToSell: 0,
        avgMargin: 0,
        items: [],
      };

      current.totalSales++;
      current.totalRevenue += parseFloat(sale.salePrice);
      current.totalProfit += parseFloat(sale.profit);
      current.totalFees += parseFloat(sale.fees);
      current.items.push(sale);
      
      marketplacePerformance.set(sale.marketplace, current);
    });

    // Calculate averages and scores
    const results = Array.from(marketplacePerformance.entries()).map(([marketplace, data]) => {
      const avgDaysToSell = data.items.reduce((sum: number, item: any) => sum + (item.daysToSell || 0), 0) / data.items.length;
      const avgMargin = data.items.reduce((sum: number, item: any) => sum + parseFloat(item.margin || '0'), 0) / data.items.length;
      const feePercentage = data.totalRevenue > 0 ? (data.totalFees / data.totalRevenue) * 100 : 0;
      
      // Calculate performance score (0-100)
      let score = 100;
      score -= Math.min(avgDaysToSell * 0.5, 30); // Penalize slow sales
      score -= Math.min(feePercentage * 0.8, 40); // Penalize high fees
      score += Math.min(avgMargin * 0.3, 30); // Reward high margins
      score = Math.max(0, Math.min(100, score));

      return {
        marketplace,
        totalSales: data.totalSales,
        totalRevenue: data.totalRevenue,
        totalProfit: data.totalProfit,
        totalFees: data.totalFees,
        avgDaysToSell,
        avgMargin,
        feePercentage,
        performanceScore: Math.round(score),
      };
    });

    // Sort by performance score
    results.sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      marketplaces: results,
      bestMarketplace: results[0]?.marketplace || null,
      worstMarketplace: results[results.length - 1]?.marketplace || null,
    };
  }

  // Generate forecasts using simple moving average
  async generateForecasts(userId: string, daysToForecast: number = 30) {
    const historicalDays = 90;
    const startDate = startOfDay(subDays(new Date(), historicalDays));
    const endDate = endOfDay(new Date());

    const salesMetrics = await storage.getSalesMetrics(userId, { startDate, endDate });

    // Calculate daily averages
    const dailySales = new Map<string, number>();
    const dailyRevenue = new Map<string, number>();
    
    salesMetrics.forEach(sale => {
      if (sale.soldAt) {
        const date = new Date(sale.soldAt).toISOString().split('T')[0];
        dailySales.set(date, (dailySales.get(date) || 0) + 1);
        dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + parseFloat(sale.salePrice));
      }
    });

    // Calculate moving averages
    const salesValues = Array.from(dailySales.values());
    const revenueValues = Array.from(dailyRevenue.values());
    
    const avgDailySales = salesValues.length > 0 
      ? salesValues.reduce((sum, val) => sum + val, 0) / salesValues.length 
      : 0;
    const avgDailyRevenue = revenueValues.length > 0
      ? revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length
      : 0;

    // Generate forecast
    const forecast = [];
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Add some randomness for realistic forecast
      const salesVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const revenueVariation = (Math.random() - 0.5) * 0.3;
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedSales: Math.round(avgDailySales * (1 + salesVariation)),
        predictedRevenue: avgDailyRevenue * (1 + revenueVariation),
        confidence: 85 - (i * 0.5), // Confidence decreases with time
      });
    }

    return {
      forecast,
      historicalAverage: {
        dailySales: avgDailySales,
        dailyRevenue: avgDailyRevenue,
      },
      projectedMonthlyRevenue: avgDailyRevenue * 30,
      projectedMonthlySales: Math.round(avgDailySales * 30),
    };
  }

  // Analyze competition and market trends
  async analyzeCompetition(userId: string) {
    const [salesMetrics, listings] = await Promise.all([
      storage.getSalesMetrics(userId),
      storage.getListings(userId),
    ]);

    // Category performance
    const categoryPerformance = new Map<string, any>();
    
    salesMetrics.forEach(sale => {
      const category = sale.category || 'Other';
      const current = categoryPerformance.get(category) || {
        sales: 0,
        revenue: 0,
        avgPrice: 0,
        avgMargin: 0,
        items: [],
      };
      
      current.sales++;
      current.revenue += parseFloat(sale.salePrice);
      current.items.push(sale);
      
      categoryPerformance.set(category, current);
    });

    // Calculate averages and identify opportunities
    const categories = Array.from(categoryPerformance.entries()).map(([category, data]) => {
      const avgPrice = data.revenue / data.sales;
      const avgMargin = data.items.reduce((sum: number, item: any) => sum + parseFloat(item.margin || '0'), 0) / data.items.length;
      
      return {
        category,
        sales: data.sales,
        revenue: data.revenue,
        avgPrice,
        avgMargin,
        performance: avgMargin > 30 ? 'high' : avgMargin > 15 ? 'medium' : 'low',
      };
    });

    // Sort by revenue
    categories.sort((a, b) => b.revenue - a.revenue);

    // Identify trending categories (simplified - in real app would use time series)
    const trendingCategories = categories.slice(0, 3).map(c => c.category);
    const decliningCategories = categories.slice(-3).map(c => c.category);

    // Market position (simplified - would need market data in real app)
    const avgSellingPrice = salesMetrics.length > 0
      ? salesMetrics.reduce((sum, sale) => sum + parseFloat(sale.salePrice), 0) / salesMetrics.length
      : 0;
    const marketPosition = avgSellingPrice > 100 ? 'premium' : avgSellingPrice > 50 ? 'mid-market' : 'budget';

    return {
      categoryPerformance: categories,
      trendingCategories,
      decliningCategories,
      marketPosition,
      opportunities: categories.filter(c => c.avgMargin > 25).map(c => ({
        category: c.category,
        recommendation: `Focus on ${c.category} - high margin opportunity`,
      })),
    };
  }

  // Optimize pricing suggestions
  async optimizePricing(userId: string) {
    const salesMetrics = await storage.getSalesMetrics(userId);
    
    // Group by category to analyze pricing
    const pricingByCategory = new Map<string, any>();
    
    salesMetrics.forEach(sale => {
      const category = sale.category || 'Other';
      const current = pricingByCategory.get(category) || {
        prices: [],
        daysToSell: [],
      };
      
      current.prices.push(parseFloat(sale.salePrice));
      current.daysToSell.push(sale.daysToSell || 0);
      
      pricingByCategory.set(category, current);
    });

    const suggestions = Array.from(pricingByCategory.entries()).map(([category, data]) => {
      const avgPrice = data.prices.reduce((sum: number, p: number) => sum + p, 0) / data.prices.length;
      const avgDaysToSell = data.daysToSell.reduce((sum: number, d: number) => sum + d, 0) / data.daysToSell.length;
      
      let recommendation = '';
      if (avgDaysToSell > 30) {
        recommendation = `Consider reducing prices by 10-15% for faster sales`;
      } else if (avgDaysToSell < 7) {
        recommendation = `You might be underpricing - try increasing by 5-10%`;
      } else {
        recommendation = `Pricing appears optimal for current velocity`;
      }
      
      return {
        category,
        currentAvgPrice: avgPrice,
        avgDaysToSell,
        recommendation,
        suggestedPrice: avgDaysToSell > 30 ? avgPrice * 0.9 : avgDaysToSell < 7 ? avgPrice * 1.1 : avgPrice,
      };
    });

    return {
      pricingSuggestions: suggestions,
      overallRecommendation: suggestions.length > 0 ? suggestions[0].recommendation : 'Continue monitoring pricing performance',
    };
  }

  // Generate exportable report
  async generateReport(userId: string, format: 'json' | 'csv' = 'json') {
    const [overview, revenue, inventory, marketplace, forecast, competition] = await Promise.all([
      this.getOverviewMetrics(userId),
      this.getRevenueAnalytics(userId),
      this.getInventoryAnalytics(userId),
      this.getMarketplaceAnalytics(userId),
      this.generateForecasts(userId),
      this.analyzeCompetition(userId),
    ]);

    const report = {
      generatedAt: new Date().toISOString(),
      userId,
      overview,
      revenue,
      inventory,
      marketplace,
      forecast,
      competition,
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvRows = [
        ['Metric', 'Value'],
        ['Active Listings', overview.activeListings],
        ['Sold Listings', overview.soldListings],
        ['Total Revenue', overview.totalRevenue],
        ['Total Profit', overview.totalProfit],
        ['Conversion Rate', overview.conversionRate],
        ['Avg Days to Sell', overview.avgDaysToSell],
      ];
      
      return csvRows.map(row => row.join(',')).join('\n');
    }

    return report;
  }
}

export const analyticsService = new AnalyticsService();