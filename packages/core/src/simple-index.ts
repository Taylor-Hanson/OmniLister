// Simple exports for testing
export function flag(name: string): boolean {
  console.log(`Checking flag: ${name}`);
  return true; // Mock implementation
}

// Simple mock services for testing
export const entitlementsService = {
  async hasEntitlement(userId: string, entitlement: string): Promise<boolean> {
    console.log(`Checking entitlement ${entitlement} for user ${userId}`);
    return true; // Mock implementation
  },
  
  async getUserEntitlements(userId: string): Promise<any[]> {
    console.log(`Getting entitlements for user ${userId}`);
    return []; // Mock implementation
  },
  
  async grantTrialEntitlements(userId: string): Promise<void> {
    console.log(`Granting trial entitlements for user ${userId}`);
  }
};

export const pricingRulesEngine = {
  rules: [] as any[],
  
  getRules(): any[] {
    console.log('Getting pricing rules');
    return this.rules;
  },
  
  addRule(rule: any): void {
    console.log('Adding pricing rule:', rule.name);
    this.rules.push(rule);
  },
  
  removeRule(ruleId: string): void {
    console.log('Removing pricing rule:', ruleId);
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  },
  
  evaluateListing(listing: any): any[] {
    console.log('Evaluating listing:', listing.id);
    return [{ ruleId: 'test-rule', matched: true, action: { type: 'adjust_price', value: -10 } }];
  }
};

export const analyticsService = {
  async getOverview(dateRange: any): Promise<any> {
    console.log('Getting analytics overview');
    return {
      totalListings: 100,
      activeListings: 80,
      soldListings: 20,
      totalRevenue: 5000,
      averageSellingPrice: 250,
      sellThroughRate: 20,
      averageDaysToSell: 15
    };
  },
  
  async getSalesMetrics(dateRange: any): Promise<any[]> {
    console.log('Getting sales metrics');
    return []; // Mock implementation
  },
  
  async getInventoryMetrics(): Promise<any[]> {
    console.log('Getting inventory metrics');
    return []; // Mock implementation
  },
  
  async getMarketplaceMetrics(dateRange: any): Promise<any[]> {
    console.log('Getting marketplace metrics');
    return []; // Mock implementation
  }
};
