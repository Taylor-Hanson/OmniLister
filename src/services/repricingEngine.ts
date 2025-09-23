// Dynamic Repricing Engine - Real-time competitor price monitoring

import { aiService } from './aiService';

export interface CompetitorPrice {
  marketplace: string;
  price: number;
  shipping: number;
  condition: string;
  sellerRating: number;
  lastUpdated: Date;
  url?: string;
}

export interface RepricingRule {
  id: string;
  name: string;
  category: string;
  minMargin: number;
  maxMargin: number;
  competitorThreshold: number;
  priceAdjustment: 'aggressive' | 'moderate' | 'conservative';
  enabled: boolean;
}

export interface RepricingResult {
  originalPrice: number;
  newPrice: number;
  adjustment: number;
  adjustmentPercent: number;
  reason: string;
  competitorData: CompetitorPrice[];
  marginProtected: boolean;
  confidence: number;
}

class RepricingEngine {
  private competitorData: Map<string, CompetitorPrice[]> = new Map();
  private repricingRules: RepricingRule[] = [];
  private isMonitoring: boolean = false;

  // Initialize repricing engine
  async initialize() {
    await this.loadRepricingRules();
    await this.startCompetitorMonitoring();
  }

  // Load repricing rules from storage/API
  private async loadRepricingRules() {
    // Mock data - in real app, load from API
    this.repricingRules = [
      {
        id: 'electronics',
        name: 'Electronics - Aggressive',
        category: 'Electronics',
        minMargin: 15,
        maxMargin: 35,
        competitorThreshold: 5,
        priceAdjustment: 'aggressive',
        enabled: true,
      },
      {
        id: 'clothing',
        name: 'Clothing - Moderate',
        category: 'Clothing',
        minMargin: 20,
        maxMargin: 50,
        competitorThreshold: 3,
        priceAdjustment: 'moderate',
        enabled: true,
      },
      {
        id: 'collectibles',
        name: 'Collectibles - Conservative',
        category: 'Collectibles',
        minMargin: 25,
        maxMargin: 100,
        competitorThreshold: 2,
        priceAdjustment: 'conservative',
        enabled: true,
      },
    ];
  }

  // Start monitoring competitor prices
  private async startCompetitorMonitoring() {
    this.isMonitoring = true;
    
    // Simulate real-time competitor monitoring
    setInterval(async () => {
      if (this.isMonitoring) {
        await this.updateCompetitorPrices();
      }
    }, 300000); // Update every 5 minutes
  }

  // Update competitor prices using AI and web scraping
  private async updateCompetitorPrices() {
    try {
      // Mock competitor data - in real app, use web scraping + AI
      const mockCompetitors: CompetitorPrice[] = [
        {
          marketplace: 'Amazon',
          price: 199.99,
          shipping: 0,
          condition: 'New',
          sellerRating: 4.8,
          lastUpdated: new Date(),
        },
        {
          marketplace: 'eBay',
          price: 185.50,
          shipping: 12.99,
          condition: 'New',
          sellerRating: 4.6,
          lastUpdated: new Date(),
        },
        {
          marketplace: 'Walmart',
          price: 210.00,
          shipping: 0,
          condition: 'New',
          sellerRating: 4.7,
          lastUpdated: new Date(),
        },
      ];

      // Store competitor data by product category
      this.competitorData.set('electronics', mockCompetitors);
    } catch (error) {
      console.error('Failed to update competitor prices:', error);
    }
  }

  // Calculate optimal price using AI
  async calculateOptimalPrice(
    productId: string,
    category: string,
    currentPrice: number,
    costBasis: number,
    marketplace: string
  ): Promise<RepricingResult> {
    try {
      // Get competitor data for category
      const competitors = this.competitorData.get(category) || [];
      
      // Get repricing rule for category
      const rule = this.repricingRules.find(r => r.category === category);
      if (!rule || !rule.enabled) {
        return {
          originalPrice: currentPrice,
          newPrice: currentPrice,
          adjustment: 0,
          adjustmentPercent: 0,
          reason: 'No repricing rule found or disabled',
          competitorData: competitors,
          marginProtected: true,
          confidence: 0,
        };
      }

      // Use AI to analyze market conditions and determine optimal price
      const aiAnalysis = await this.analyzeMarketConditions(
        competitors,
        currentPrice,
        costBasis,
        rule
      );

      // Calculate new price based on AI analysis
      const newPrice = this.calculateNewPrice(
        currentPrice,
        costBasis,
        rule,
        aiAnalysis
      );

      const adjustment = newPrice - currentPrice;
      const adjustmentPercent = (adjustment / currentPrice) * 100;

      return {
        originalPrice: currentPrice,
        newPrice,
        adjustment,
        adjustmentPercent,
        reason: aiAnalysis.reason,
        competitorData: competitors,
        marginProtected: newPrice >= costBasis * (1 + rule.minMargin / 100),
        confidence: aiAnalysis.confidence,
      };
    } catch (error) {
      console.error('Failed to calculate optimal price:', error);
      throw error;
    }
  }

  // AI analysis of market conditions
  private async analyzeMarketConditions(
    competitors: CompetitorPrice[],
    currentPrice: number,
    costBasis: number,
    rule: RepricingRule
  ) {
    // Use dual AI (GPT-5 + Claude) for market analysis
    const analysisPrompt = `
    Analyze market conditions for repricing:
    - Current price: $${currentPrice}
    - Cost basis: $${costBasis}
    - Competitor prices: ${competitors.map(c => `$${c.price} (${c.marketplace})`).join(', ')}
    - Min margin: ${rule.minMargin}%
    - Max margin: ${rule.maxMargin}%
    - Strategy: ${rule.priceAdjustment}
    
    Provide analysis and recommendation.
    `;

    try {
      const aiResponse = await aiService.analyzeMarketConditions(analysisPrompt);
      return {
        reason: aiResponse.reason,
        confidence: aiResponse.confidence,
        marketTrend: aiResponse.trend,
        recommendedAction: aiResponse.action,
      };
    } catch (error) {
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(competitors, currentPrice, costBasis, rule);
    }
  }

  // Fallback analysis when AI is unavailable
  private fallbackAnalysis(
    competitors: CompetitorPrice[],
    currentPrice: number,
    costBasis: number,
    rule: RepricingRule
  ) {
    const avgCompetitorPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
    const isAboveMarket = currentPrice > avgCompetitorPrice * 1.1;
    const isBelowMarket = currentPrice < avgCompetitorPrice * 0.9;

    let reason = 'Price analysis based on competitor data';
    let confidence = 0.7;

    if (isAboveMarket) {
      reason = 'Price above market average - consider reduction';
      confidence = 0.8;
    } else if (isBelowMarket) {
      reason = 'Price below market average - opportunity to increase';
      confidence = 0.6;
    }

    return {
      reason,
      confidence,
      marketTrend: isAboveMarket ? 'decreasing' : isBelowMarket ? 'increasing' : 'stable',
      recommendedAction: isAboveMarket ? 'decrease' : isBelowMarket ? 'increase' : 'maintain',
    };
  }

  // Calculate new price based on analysis
  private calculateNewPrice(
    currentPrice: number,
    costBasis: number,
    rule: RepricingRule,
    analysis: any
  ): number {
    const minPrice = costBasis * (1 + rule.minMargin / 100);
    const maxPrice = costBasis * (1 + rule.maxMargin / 100);

    let newPrice = currentPrice;

    switch (analysis.recommendedAction) {
      case 'decrease':
        newPrice = currentPrice * 0.95; // 5% decrease
        break;
      case 'increase':
        newPrice = currentPrice * 1.05; // 5% increase
        break;
      case 'maintain':
        newPrice = currentPrice;
        break;
    }

    // Ensure price stays within margin bounds
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));

    return Math.round(newPrice * 100) / 100; // Round to 2 decimal places
  }

  // Apply repricing to multiple listings
  async applyRepricingToListings(listingIds: string[]): Promise<RepricingResult[]> {
    const results: RepricingResult[] = [];

    for (const listingId of listingIds) {
      try {
        // Mock listing data - in real app, fetch from database
        const listing = {
          id: listingId,
          price: 199.99,
          costBasis: 120.00,
          category: 'Electronics',
          marketplace: 'Amazon',
        };

        const result = await this.calculateOptimalPrice(
          listing.id,
          listing.category,
          listing.price,
          listing.costBasis,
          listing.marketplace
        );

        results.push(result);
      } catch (error) {
        console.error(`Failed to repricing listing ${listingId}:`, error);
      }
    }

    return results;
  }

  // Get repricing rules
  getRepricingRules(): RepricingRule[] {
    return this.repricingRules;
  }

  // Update repricing rule
  async updateRepricingRule(rule: RepricingRule): Promise<void> {
    const index = this.repricingRules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.repricingRules[index] = rule;
    } else {
      this.repricingRules.push(rule);
    }
    
    // In real app, save to API
    console.log('Repricing rule updated:', rule);
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
  }

  // Get competitor data for category
  getCompetitorData(category: string): CompetitorPrice[] {
    return this.competitorData.get(category) || [];
  }
}

export const repricingEngine = new RepricingEngine();
