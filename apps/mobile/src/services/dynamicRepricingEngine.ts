// Dynamic Repricing Engine - Real-time competitor price monitoring and automatic adjustments

import { aiService } from './aiService';

export interface CompetitorPrice {
  marketplace: string;
  seller: string;
  price: number;
  shipping: number;
  totalPrice: number;
  condition: string;
  lastUpdated: Date;
  url: string;
}

export interface RepricingRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    marketplace: string[];
    category: string[];
    minPrice: number;
    maxPrice: number;
    competitorCount: number;
  };
  actions: {
    type: 'beat_by_percentage' | 'beat_by_amount' | 'match' | 'undercut';
    value: number;
    minMargin: number;
    maxAdjustment: number;
  };
  schedule: {
    frequency: 'realtime' | 'hourly' | 'daily';
    timeRange: {
      start: string;
      end: string;
    };
  };
}

export interface RepricingResult {
  listingId: string;
  currentPrice: number;
  newPrice: number;
  reason: string;
  competitors: CompetitorPrice[];
  margin: number;
  confidence: number;
  applied: boolean;
  timestamp: Date;
}

export interface RepricingAnalytics {
  totalListings: number;
  repricedListings: number;
  averagePriceChange: number;
  totalRevenueImpact: number;
  topPerformingRules: {
    ruleId: string;
    ruleName: string;
    applications: number;
    revenueImpact: number;
  }[];
  marketplacePerformance: {
    marketplace: string;
    repricedCount: number;
    averageChange: number;
    revenueImpact: number;
  }[];
}

class DynamicRepricingEngine {
  private isRunning: boolean = false;
  private repricingRules: RepricingRule[] = [];
  private repricingResults: RepricingResult[] = [];
  private competitorData: Map<string, CompetitorPrice[]> = new Map();

  // Initialize repricing engine
  async initialize() {
    try {
      // Load default repricing rules
      await this.loadDefaultRules();
      
      // Start competitor monitoring
      await this.startCompetitorMonitoring();
      
      console.log('Dynamic repricing engine initialized');
    } catch (error) {
      console.error('Failed to initialize repricing engine:', error);
    }
  }

  // Load default repricing rules
  private async loadDefaultRules(): Promise<void> {
    this.repricingRules = [
      {
        id: 'rule_001',
        name: 'Beat Competitors by 5%',
        enabled: true,
        conditions: {
          marketplace: ['eBay', 'Amazon', 'Walmart'],
          category: ['Electronics', 'Fashion'],
          minPrice: 10,
          maxPrice: 1000,
          competitorCount: 3,
        },
        actions: {
          type: 'beat_by_percentage',
          value: 5,
          minMargin: 20,
          maxAdjustment: 50,
        },
        schedule: {
          frequency: 'hourly',
          timeRange: {
            start: '09:00',
            end: '21:00',
          },
        },
      },
      {
        id: 'rule_002',
        name: 'Match Lowest Price',
        enabled: true,
        conditions: {
          marketplace: ['Poshmark', 'Mercari'],
          category: ['Fashion', 'Accessories'],
          minPrice: 5,
          maxPrice: 500,
          competitorCount: 1,
        },
        actions: {
          type: 'match',
          value: 0,
          minMargin: 15,
          maxAdjustment: 25,
        },
        schedule: {
          frequency: 'daily',
          timeRange: {
            start: '10:00',
            end: '18:00',
          },
        },
      },
    ];
  }

  // Start competitor monitoring
  private async startCompetitorMonitoring(): Promise<void> {
    // Mock implementation - in real app, set up real-time monitoring
    setInterval(async () => {
      if (this.isRunning) {
        await this.monitorCompetitors();
      }
    }, 60000); // Check every minute
  }

  // Monitor competitors
  private async monitorCompetitors(): Promise<void> {
    try {
      // Mock competitor data - in real app, scrape competitor prices
      const mockCompetitors = await this.mockGetCompetitorPrices();
      
      // Update competitor data
      mockCompetitors.forEach(competitor => {
        const key = `${competitor.marketplace}_${competitor.seller}`;
        if (!this.competitorData.has(key)) {
          this.competitorData.set(key, []);
        }
        this.competitorData.get(key)!.push(competitor);
      });
      
      // Run repricing if enabled
      if (this.isRunning) {
        await this.runRepricing();
      }
    } catch (error) {
      console.error('Failed to monitor competitors:', error);
    }
  }

  // Mock get competitor prices
  private async mockGetCompetitorPrices(): Promise<CompetitorPrice[]> {
    return [
      {
        marketplace: 'eBay',
        seller: 'competitor1',
        price: 95.00,
        shipping: 5.00,
        totalPrice: 100.00,
        condition: 'New',
        lastUpdated: new Date(),
        url: 'https://ebay.com/item1',
      },
      {
        marketplace: 'Amazon',
        seller: 'competitor2',
        price: 98.00,
        shipping: 0.00,
        totalPrice: 98.00,
        condition: 'New',
        lastUpdated: new Date(),
        url: 'https://amazon.com/item1',
      },
      {
        marketplace: 'Walmart',
        seller: 'competitor3',
        price: 102.00,
        shipping: 0.00,
        totalPrice: 102.00,
        condition: 'New',
        lastUpdated: new Date(),
        url: 'https://walmart.com/item1',
      },
    ];
  }

  // Start repricing engine
  async startRepricing(): Promise<boolean> {
    try {
      this.isRunning = true;
      await this.runRepricing();
      console.log('Repricing engine started');
      return true;
    } catch (error) {
      console.error('Failed to start repricing engine:', error);
      return false;
    }
  }

  // Stop repricing engine
  async stopRepricing(): Promise<void> {
    this.isRunning = false;
    console.log('Repricing engine stopped');
  }

  // Run repricing
  private async runRepricing(): Promise<void> {
    try {
      const listings = await this.getActiveListings();
      
      for (const listing of listings) {
        const applicableRules = this.getApplicableRules(listing);
        
        for (const rule of applicableRules) {
          const result = await this.applyRepricingRule(listing, rule);
          if (result) {
            this.repricingResults.push(result);
          }
        }
      }
    } catch (error) {
      console.error('Failed to run repricing:', error);
    }
  }

  // Get active listings
  private async getActiveListings(): Promise<any[]> {
    // Mock implementation - in real app, get from database
    return [
      {
        id: 'listing_001',
        title: 'iPhone 13 128GB',
        price: 105.00,
        marketplace: 'eBay',
        category: 'Electronics',
        cost: 80.00,
        margin: 23.8,
      },
      {
        id: 'listing_002',
        title: 'Designer Handbag',
        price: 75.00,
        marketplace: 'Poshmark',
        category: 'Fashion',
        cost: 50.00,
        margin: 33.3,
      },
    ];
  }

  // Get applicable rules for listing
  private getApplicableRules(listing: any): RepricingRule[] {
    return this.repricingRules.filter(rule => {
      if (!rule.enabled) return false;
      
      const conditions = rule.conditions;
      
      // Check marketplace
      if (!conditions.marketplace.includes(listing.marketplace)) return false;
      
      // Check category
      if (!conditions.category.includes(listing.category)) return false;
      
      // Check price range
      if (listing.price < conditions.minPrice || listing.price > conditions.maxPrice) return false;
      
      // Check if within schedule
      if (!this.isWithinSchedule(rule.schedule)) return false;
      
      return true;
    });
  }

  // Check if within schedule
  private isWithinSchedule(schedule: RepricingRule['schedule']): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const startTime = this.parseTime(schedule.timeRange.start);
    const endTime = this.parseTime(schedule.timeRange.end);
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Parse time string (HH:MM) to minutes
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Apply repricing rule
  private async applyRepricingRule(listing: any, rule: RepricingRule): Promise<RepricingResult | null> {
    try {
      // Get competitors for this listing
      const competitors = await this.getCompetitorsForListing(listing);
      
      if (competitors.length < rule.conditions.competitorCount) {
        return null; // Not enough competitors
      }
      
      // Calculate new price
      const newPrice = await this.calculateNewPrice(listing, competitors, rule);
      
      if (!newPrice || newPrice === listing.price) {
        return null; // No price change needed
      }
      
      // Check margin requirements
      const newMargin = ((newPrice - listing.cost) / newPrice) * 100;
      if (newMargin < rule.actions.minMargin) {
        return null; // Would violate minimum margin
      }
      
      // Check maximum adjustment
      const priceChange = Math.abs(newPrice - listing.price);
      if (priceChange > rule.actions.maxAdjustment) {
        return null; // Would exceed maximum adjustment
      }
      
      // Apply repricing
      const applied = await this.applyPriceChange(listing.id, newPrice);
      
      const result: RepricingResult = {
        listingId: listing.id,
        currentPrice: listing.price,
        newPrice,
        reason: this.generateReason(rule, competitors),
        competitors,
        margin: newMargin,
        confidence: this.calculateConfidence(competitors, rule),
        applied,
        timestamp: new Date(),
      };
      
      return result;
    } catch (error) {
      console.error('Failed to apply repricing rule:', error);
      return null;
    }
  }

  // Get competitors for listing
  private async getCompetitorsForListing(listing: any): Promise<CompetitorPrice[]> {
    // Mock implementation - in real app, find competitors by title/similarity
    return [
      {
        marketplace: 'eBay',
        seller: 'competitor1',
        price: 95.00,
        shipping: 5.00,
        totalPrice: 100.00,
        condition: 'New',
        lastUpdated: new Date(),
        url: 'https://ebay.com/item1',
      },
      {
        marketplace: 'Amazon',
        seller: 'competitor2',
        price: 98.00,
        shipping: 0.00,
        totalPrice: 98.00,
        condition: 'New',
        lastUpdated: new Date(),
        url: 'https://amazon.com/item1',
      },
    ];
  }

  // Calculate new price
  private async calculateNewPrice(listing: any, competitors: CompetitorPrice[], rule: RepricingRule): Promise<number | null> {
    try {
      const lowestPrice = Math.min(...competitors.map(c => c.totalPrice));
      const actions = rule.actions;
      
      let newPrice: number;
      
      switch (actions.type) {
        case 'beat_by_percentage':
          newPrice = lowestPrice * (1 - actions.value / 100);
          break;
        case 'beat_by_amount':
          newPrice = lowestPrice - actions.value;
          break;
        case 'match':
          newPrice = lowestPrice;
          break;
        case 'undercut':
          newPrice = lowestPrice - 0.01;
          break;
        default:
          return null;
      }
      
      // Round to 2 decimal places
      return Math.round(newPrice * 100) / 100;
    } catch (error) {
      console.error('Failed to calculate new price:', error);
      return null;
    }
  }

  // Apply price change
  private async applyPriceChange(listingId: string, newPrice: number): Promise<boolean> {
    try {
      // Mock implementation - in real app, update price on marketplace
      console.log(`Updating listing ${listingId} price to $${newPrice}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Failed to apply price change:', error);
      return false;
    }
  }

  // Generate reason for repricing
  private generateReason(rule: RepricingRule, competitors: CompetitorPrice[]): string {
    const lowestPrice = Math.min(...competitors.map(c => c.totalPrice));
    const lowestCompetitor = competitors.find(c => c.totalPrice === lowestPrice);
    
    switch (rule.actions.type) {
      case 'beat_by_percentage':
        return `Beat ${lowestCompetitor?.marketplace} competitor by ${rule.actions.value}%`;
      case 'beat_by_amount':
        return `Beat ${lowestCompetitor?.marketplace} competitor by $${rule.actions.value}`;
      case 'match':
        return `Match ${lowestCompetitor?.marketplace} competitor price`;
      case 'undercut':
        return `Undercut ${lowestCompetitor?.marketplace} competitor by $0.01`;
      default:
        return 'Price adjustment applied';
    }
  }

  // Calculate confidence score
  private calculateConfidence(competitors: CompetitorPrice[], rule: RepricingRule): number {
    let confidence = 0.5; // Base confidence
    
    // More competitors = higher confidence
    confidence += Math.min(competitors.length / 10, 0.3);
    
    // Recent data = higher confidence
    const now = new Date();
    const recentCompetitors = competitors.filter(c => 
      (now.getTime() - c.lastUpdated.getTime()) < 24 * 60 * 60 * 1000
    );
    confidence += (recentCompetitors.length / competitors.length) * 0.2;
    
    return Math.min(confidence, 1.0);
  }

  // Add repricing rule
  async addRepricingRule(rule: Omit<RepricingRule, 'id'>): Promise<string> {
    const newRule: RepricingRule = {
      ...rule,
      id: `rule_${Date.now()}`,
    };
    
    this.repricingRules.push(newRule);
    return newRule.id;
  }

  // Update repricing rule
  async updateRepricingRule(ruleId: string, updates: Partial<RepricingRule>): Promise<boolean> {
    const ruleIndex = this.repricingRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return false;
    
    this.repricingRules[ruleIndex] = { ...this.repricingRules[ruleIndex], ...updates };
    return true;
  }

  // Delete repricing rule
  async deleteRepricingRule(ruleId: string): Promise<boolean> {
    const ruleIndex = this.repricingRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return false;
    
    this.repricingRules.splice(ruleIndex, 1);
    return true;
  }

  // Get repricing rules
  getRepricingRules(): RepricingRule[] {
    return this.repricingRules;
  }

  // Get repricing results
  getRepricingResults(limit: number = 50): RepricingResult[] {
    return this.repricingResults
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get repricing analytics
  async getRepricingAnalytics(): Promise<RepricingAnalytics> {
    const results = this.repricingResults;
    const appliedResults = results.filter(r => r.applied);
    
    const totalListings = await this.getActiveListings().then(listings => listings.length);
    const repricedListings = appliedResults.length;
    const averagePriceChange = appliedResults.reduce((sum, r) => sum + (r.newPrice - r.currentPrice), 0) / repricedListings || 0;
    const totalRevenueImpact = appliedResults.reduce((sum, r) => sum + (r.newPrice - r.currentPrice), 0);
    
    // Mock analytics - in real app, calculate from actual data
    const topPerformingRules = [
      {
        ruleId: 'rule_001',
        ruleName: 'Beat Competitors by 5%',
        applications: 15,
        revenueImpact: 150.00,
      },
      {
        ruleId: 'rule_002',
        ruleName: 'Match Lowest Price',
        applications: 8,
        revenueImpact: 75.00,
      },
    ];
    
    const marketplacePerformance = [
      {
        marketplace: 'eBay',
        repricedCount: 12,
        averageChange: -5.50,
        revenueImpact: -66.00,
      },
      {
        marketplace: 'Amazon',
        repricedCount: 8,
        averageChange: -3.25,
        revenueImpact: -26.00,
      },
    ];
    
    return {
      totalListings,
      repricedListings,
      averagePriceChange,
      totalRevenueImpact,
      topPerformingRules,
      marketplacePerformance,
    };
  }

  // Get engine status
  getEngineStatus(): { isRunning: boolean; rulesCount: number; lastRun: Date | null } {
    return {
      isRunning: this.isRunning,
      rulesCount: this.repricingRules.length,
      lastRun: this.repricingResults.length > 0 ? this.repricingResults[0].timestamp : null,
    };
  }
}

export const dynamicRepricingEngine = new DynamicRepricingEngine();
