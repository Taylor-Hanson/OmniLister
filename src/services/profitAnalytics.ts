// Advanced Profit Analytics - Comprehensive profit tracking and analysis

import { aiService } from './aiService';

export interface ProfitMetrics {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  averageOrderValue: number;
  costPerAcquisition: number;
  lifetimeValue: number;
}

export interface CostBreakdown {
  productCost: number;
  shippingCost: number;
  marketplaceFees: number;
  paymentProcessingFees: number;
  advertisingCost: number;
  storageCost: number;
  laborCost: number;
  otherCosts: number;
  totalCosts: number;
}

export interface MarketplacePerformance {
  marketplace: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  orders: number;
  averageOrderValue: number;
  conversionRate: number;
  fees: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  unitsSold: number;
  averagePrice: number;
  topProducts: {
    name: string;
    revenue: number;
    profit: number;
    margin: number;
  }[];
}

export interface TaxReport {
  year: number;
  quarter: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  estimatedTax: number;
  deductions: {
    businessExpenses: number;
    homeOffice: number;
    vehicle: number;
    equipment: number;
    other: number;
  };
  reportData: {
    date: string;
    revenue: number;
    costs: number;
    profit: number;
  }[];
}

export interface ProfitAnalytics {
  metrics: ProfitMetrics;
  costBreakdown: CostBreakdown;
  marketplacePerformance: MarketplacePerformance[];
  categoryPerformance: CategoryPerformance[];
  taxReport: TaxReport;
  trends: {
    revenue: { date: string; value: number }[];
    profit: { date: string; value: number }[];
    margin: { date: string; value: number }[];
  };
  insights: string[];
  recommendations: string[];
}

class ProfitAnalyticsService {
  private analytics: ProfitAnalytics | null = null;

  // Calculate comprehensive profit analytics
  async calculateProfitAnalytics(
    startDate: Date,
    endDate: Date,
    includeTaxReport: boolean = true
  ): Promise<ProfitAnalytics> {
    try {
      // Get raw data from all sources
      const rawData = await this.getRawData(startDate, endDate);
      
      // Calculate metrics
      const metrics = await this.calculateMetrics(rawData);
      
      // Calculate cost breakdown
      const costBreakdown = await this.calculateCostBreakdown(rawData);
      
      // Calculate marketplace performance
      const marketplacePerformance = await this.calculateMarketplacePerformance(rawData);
      
      // Calculate category performance
      const categoryPerformance = await this.calculateCategoryPerformance(rawData);
      
      // Generate tax report
      const taxReport = includeTaxReport ? await this.generateTaxReport(rawData, startDate, endDate) : null;
      
      // Calculate trends
      const trends = await this.calculateTrends(rawData, startDate, endDate);
      
      // Generate AI insights
      const insights = await this.generateInsights(metrics, costBreakdown, marketplacePerformance);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(metrics, costBreakdown, marketplacePerformance);

      this.analytics = {
        metrics,
        costBreakdown,
        marketplacePerformance,
        categoryPerformance,
        taxReport,
        trends,
        insights,
        recommendations,
      };

      return this.analytics;
    } catch (error) {
      console.error('Failed to calculate profit analytics:', error);
      throw error;
    }
  }

  // Get raw data from all sources
  private async getRawData(startDate: Date, endDate: Date): Promise<any> {
    // Mock implementation - in real app, aggregate data from all marketplaces
    return {
      orders: await this.mockGetOrders(startDate, endDate),
      costs: await this.mockGetCosts(startDate, endDate),
      fees: await this.mockGetFees(startDate, endDate),
      inventory: await this.mockGetInventory(),
    };
  }

  // Mock get orders
  private async mockGetOrders(startDate: Date, endDate: Date): Promise<any[]> {
    return [
      {
        id: 'order_001',
        date: new Date('2024-01-15'),
        marketplace: 'eBay',
        category: 'Electronics',
        product: 'iPhone 13',
        quantity: 1,
        price: 650.00,
        fees: 65.00,
        shipping: 15.00,
        cost: 500.00,
      },
      {
        id: 'order_002',
        date: new Date('2024-01-16'),
        marketplace: 'Amazon',
        category: 'Electronics',
        product: 'MacBook Pro',
        quantity: 1,
        price: 1200.00,
        fees: 180.00,
        shipping: 0.00,
        cost: 900.00,
      },
      {
        id: 'order_003',
        date: new Date('2024-01-17'),
        marketplace: 'Poshmark',
        category: 'Fashion',
        product: 'Designer Handbag',
        quantity: 1,
        price: 250.00,
        fees: 50.00,
        shipping: 7.00,
        cost: 150.00,
      },
    ];
  }

  // Mock get costs
  private async mockGetCosts(startDate: Date, endDate: Date): Promise<any[]> {
    return [
      {
        type: 'product',
        amount: 1550.00,
        description: 'Product acquisition costs',
      },
      {
        type: 'shipping',
        amount: 22.00,
        description: 'Shipping costs',
      },
      {
        type: 'storage',
        amount: 50.00,
        description: 'Storage fees',
      },
      {
        type: 'labor',
        amount: 100.00,
        description: 'Labor costs',
      },
    ];
  }

  // Mock get fees
  private async mockGetFees(startDate: Date, endDate: Date): Promise<any[]> {
    return [
      {
        marketplace: 'eBay',
        amount: 65.00,
        type: 'final_value_fee',
      },
      {
        marketplace: 'Amazon',
        amount: 180.00,
        type: 'referral_fee',
      },
      {
        marketplace: 'Poshmark',
        amount: 50.00,
        type: 'commission',
      },
    ];
  }

  // Mock get inventory
  private async mockGetInventory(): Promise<any[]> {
    return [
      {
        product: 'iPhone 13',
        cost: 500.00,
        category: 'Electronics',
      },
      {
        product: 'MacBook Pro',
        cost: 900.00,
        category: 'Electronics',
      },
      {
        product: 'Designer Handbag',
        cost: 150.00,
        category: 'Fashion',
      },
    ];
  }

  // Calculate profit metrics
  private async calculateMetrics(rawData: any): Promise<ProfitMetrics> {
    const orders = rawData.orders;
    const costs = rawData.costs;
    
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.price, 0);
    const totalCosts = costs.reduce((sum: number, cost: any) => sum + cost.amount, 0);
    const totalFees = orders.reduce((sum: number, order: any) => sum + order.fees, 0);
    
    const grossProfit = totalRevenue - totalCosts;
    const netProfit = grossProfit - totalFees;
    const profitMargin = (netProfit / totalRevenue) * 100;
    const roi = (netProfit / totalCosts) * 100;
    
    const averageOrderValue = totalRevenue / orders.length;
    const costPerAcquisition = totalCosts / orders.length;
    const lifetimeValue = averageOrderValue * 2.5; // Mock LTV calculation

    return {
      totalRevenue,
      totalCosts: totalCosts + totalFees,
      grossProfit,
      netProfit,
      profitMargin,
      roi,
      averageOrderValue,
      costPerAcquisition,
      lifetimeValue,
    };
  }

  // Calculate cost breakdown
  private async calculateCostBreakdown(rawData: any): Promise<CostBreakdown> {
    const costs = rawData.costs;
    const fees = rawData.fees;
    
    const productCost = costs.find((c: any) => c.type === 'product')?.amount || 0;
    const shippingCost = costs.find((c: any) => c.type === 'shipping')?.amount || 0;
    const storageCost = costs.find((c: any) => c.type === 'storage')?.amount || 0;
    const laborCost = costs.find((c: any) => c.type === 'labor')?.amount || 0;
    
    const marketplaceFees = fees.reduce((sum: number, fee: any) => sum + fee.amount, 0);
    const paymentProcessingFees = marketplaceFees * 0.03; // 3% payment processing
    const advertisingCost = 0; // Mock - no advertising
    const otherCosts = 0; // Mock - no other costs
    
    const totalCosts = productCost + shippingCost + marketplaceFees + 
                      paymentProcessingFees + advertisingCost + storageCost + 
                      laborCost + otherCosts;

    return {
      productCost,
      shippingCost,
      marketplaceFees,
      paymentProcessingFees,
      advertisingCost,
      storageCost,
      laborCost,
      otherCosts,
      totalCosts,
    };
  }

  // Calculate marketplace performance
  private async calculateMarketplacePerformance(rawData: any): Promise<MarketplacePerformance[]> {
    const orders = rawData.orders;
    const fees = rawData.fees;
    
    const marketplaceData = new Map<string, any>();
    
    // Aggregate by marketplace
    orders.forEach((order: any) => {
      const marketplace = order.marketplace;
      if (!marketplaceData.has(marketplace)) {
        marketplaceData.set(marketplace, {
          revenue: 0,
          costs: 0,
          orders: 0,
          fees: 0,
        });
      }
      
      const data = marketplaceData.get(marketplace);
      data.revenue += order.price;
      data.costs += order.cost;
      data.orders += 1;
      data.fees += order.fees;
    });
    
    // Convert to array and calculate metrics
    return Array.from(marketplaceData.entries()).map(([marketplace, data]) => {
      const profit = data.revenue - data.costs - data.fees;
      const margin = (profit / data.revenue) * 100;
      const averageOrderValue = data.revenue / data.orders;
      const conversionRate = 3.2; // Mock conversion rate
      
      return {
        marketplace,
        revenue: data.revenue,
        costs: data.costs,
        profit,
        margin,
        orders: data.orders,
        averageOrderValue,
        conversionRate,
        fees: data.fees,
      };
    });
  }

  // Calculate category performance
  private async calculateCategoryPerformance(rawData: any): Promise<CategoryPerformance[]> {
    const orders = rawData.orders;
    
    const categoryData = new Map<string, any>();
    
    // Aggregate by category
    orders.forEach((order: any) => {
      const category = order.category;
      if (!categoryData.has(category)) {
        categoryData.set(category, {
          revenue: 0,
          costs: 0,
          unitsSold: 0,
          products: new Map(),
        });
      }
      
      const data = categoryData.get(category);
      data.revenue += order.price;
      data.costs += order.cost;
      data.unitsSold += order.quantity;
      
      // Track top products
      if (!data.products.has(order.product)) {
        data.products.set(order.product, {
          revenue: 0,
          costs: 0,
        });
      }
      
      const productData = data.products.get(order.product);
      productData.revenue += order.price;
      productData.costs += order.cost;
    });
    
    // Convert to array and calculate metrics
    return Array.from(categoryData.entries()).map(([category, data]) => {
      const profit = data.revenue - data.costs;
      const margin = (profit / data.revenue) * 100;
      const averagePrice = data.revenue / data.unitsSold;
      
      // Get top products
      const topProducts = Array.from(data.products.entries())
        .map(([name, productData]: [string, any]) => ({
          name,
          revenue: productData.revenue,
          profit: productData.revenue - productData.costs,
          margin: ((productData.revenue - productData.costs) / productData.revenue) * 100,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
      
      return {
        category,
        revenue: data.revenue,
        costs: data.costs,
        profit,
        margin,
        unitsSold: data.unitsSold,
        averagePrice,
        topProducts,
      };
    });
  }

  // Generate tax report
  private async generateTaxReport(rawData: any, startDate: Date, endDate: Date): Promise<TaxReport> {
    const orders = rawData.orders;
    const costs = rawData.costs;
    
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.price, 0);
    const totalCosts = costs.reduce((sum: number, cost: any) => sum + cost.amount, 0);
    const netProfit = totalRevenue - totalCosts;
    const estimatedTax = netProfit * 0.25; // 25% tax rate
    
    const deductions = {
      businessExpenses: totalCosts * 0.8,
      homeOffice: totalCosts * 0.1,
      vehicle: totalCosts * 0.05,
      equipment: totalCosts * 0.03,
      other: totalCosts * 0.02,
    };
    
    const reportData = orders.map((order: any) => ({
      date: order.date.toISOString().split('T')[0],
      revenue: order.price,
      costs: order.cost,
      profit: order.price - order.cost,
    }));
    
    return {
      year: startDate.getFullYear(),
      quarter: Math.ceil((startDate.getMonth() + 1) / 3),
      totalRevenue,
      totalCosts,
      netProfit,
      estimatedTax,
      deductions,
      reportData,
    };
  }

  // Calculate trends
  private async calculateTrends(rawData: any, startDate: Date, endDate: Date): Promise<any> {
    const orders = rawData.orders;
    
    // Group by date
    const dailyData = new Map<string, { revenue: number; costs: number; profit: number }>();
    
    orders.forEach((order: any) => {
      const date = order.date.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { revenue: 0, costs: 0, profit: 0 });
      }
      
      const data = dailyData.get(date)!;
      data.revenue += order.price;
      data.costs += order.cost;
      data.profit += order.price - order.cost;
    });
    
    const revenue = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      value: data.revenue,
    }));
    
    const profit = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      value: data.profit,
    }));
    
    const margin = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      value: (data.profit / data.revenue) * 100,
    }));
    
    return { revenue, profit, margin };
  }

  // Generate AI insights
  private async generateInsights(
    metrics: ProfitMetrics,
    costBreakdown: CostBreakdown,
    marketplacePerformance: MarketplacePerformance[]
  ): Promise<string[]> {
    try {
      const prompt = `
      Analyze these profit metrics and provide insights:
      
      Total Revenue: $${metrics.totalRevenue}
      Net Profit: $${metrics.netProfit}
      Profit Margin: ${metrics.profitMargin.toFixed(2)}%
      ROI: ${metrics.roi.toFixed(2)}%
      
      Cost Breakdown:
      - Product Cost: $${costBreakdown.productCost}
      - Marketplace Fees: $${costBreakdown.marketplaceFees}
      - Shipping: $${costBreakdown.shippingCost}
      - Storage: $${costBreakdown.storageCost}
      
      Marketplace Performance:
      ${marketplacePerformance.map(mp => 
        `${mp.marketplace}: $${mp.revenue} revenue, ${mp.margin.toFixed(2)}% margin`
      ).join('\n')}
      
      Provide 3-5 key insights about profitability, cost optimization, and marketplace performance.
      `;

      const aiResponse = await aiService.generateInsights(prompt);
      return aiResponse.insights;
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return [
        'Profit margin is above industry average',
        'Marketplace fees are the largest cost component',
        'Amazon shows highest revenue but lower margins',
        'Consider optimizing shipping costs',
        'Storage costs are minimal - good inventory management',
      ];
    }
  }

  // Generate recommendations
  private async generateRecommendations(
    metrics: ProfitMetrics,
    costBreakdown: CostBreakdown,
    marketplacePerformance: MarketplacePerformance[]
  ): Promise<string[]> {
    try {
      const prompt = `
      Based on these profit metrics, provide actionable recommendations:
      
      Profit Margin: ${metrics.profitMargin.toFixed(2)}%
      ROI: ${metrics.roi.toFixed(2)}%
      
      Cost Breakdown:
      - Product Cost: $${costBreakdown.productCost}
      - Marketplace Fees: $${costBreakdown.marketplaceFees}
      - Shipping: $${costBreakdown.shippingCost}
      
      Marketplace Performance:
      ${marketplacePerformance.map(mp => 
        `${mp.marketplace}: ${mp.margin.toFixed(2)}% margin`
      ).join('\n')}
      
      Provide 3-5 specific, actionable recommendations to improve profitability.
      `;

      const aiResponse = await aiService.generateRecommendations(prompt);
      return aiResponse.recommendations;
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      return [
        'Negotiate better shipping rates with carriers',
        'Focus on higher-margin marketplaces',
        'Optimize product pricing for better margins',
        'Reduce marketplace fees by improving listing quality',
        'Consider bulk purchasing to reduce product costs',
      ];
    }
  }

  // Get current analytics
  getAnalytics(): ProfitAnalytics | null {
    return this.analytics;
  }

  // Export analytics data
  async exportAnalytics(format: 'csv' | 'pdf' | 'excel'): Promise<string> {
    if (!this.analytics) {
      throw new Error('No analytics data available');
    }

    // Mock implementation - in real app, generate actual export
    const filename = `profit_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
    console.log(`Exporting analytics to ${filename}`);
    
    return filename;
  }

  // Schedule analytics reports
  async scheduleReport(frequency: 'daily' | 'weekly' | 'monthly', email: string): Promise<void> {
    // Mock implementation - in real app, set up scheduled reports
    console.log(`Scheduled ${frequency} analytics report for ${email}`);
  }
}

export const profitAnalyticsService = new ProfitAnalyticsService();