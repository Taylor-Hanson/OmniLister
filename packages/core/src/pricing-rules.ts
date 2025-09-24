import { z } from 'zod';

// Pricing rule schemas
export const PricingRuleConditionSchema = z.object({
  marketplace: z.string().optional(),
  category: z.string().optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  daysListed: z.number().optional(),
  brand: z.string().optional(),
  condition: z.string().optional(),
});

export const PricingRuleActionSchema = z.object({
  type: z.enum(['adjust_price', 'set_price', 'delist']),
  value: z.number(),
  percentage: z.boolean().optional(),
});

export const PricingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  conditions: PricingRuleConditionSchema,
  actions: PricingRuleActionSchema,
  priority: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PricingRuleCondition = z.infer<typeof PricingRuleConditionSchema>;
export type PricingRuleAction = z.infer<typeof PricingRuleActionSchema>;
export type PricingRule = z.infer<typeof PricingRuleSchema>;

// Listing data for rule evaluation
export const ListingDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  brand: z.string().optional(),
  condition: z.string(),
  marketplace: z.string(),
  daysListed: z.number(),
  images: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ListingData = z.infer<typeof ListingDataSchema>;

// Rule evaluation result
export const RuleEvaluationResultSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  matched: z.boolean(),
  action: PricingRuleActionSchema.optional(),
  newPrice: z.number().optional(),
  reason: z.string(),
});

export type RuleEvaluationResult = z.infer<typeof RuleEvaluationResultSchema>;

// Pricing rules engine
export class PricingRulesEngine {
  private rules: PricingRule[] = [];

  constructor(rules: PricingRule[] = []) {
    this.rules = rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add a new pricing rule
   */
  addRule(rule: PricingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update an existing pricing rule
   */
  updateRule(ruleId: string, updates: Partial<PricingRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates, updatedAt: new Date() };
      this.rules.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * Remove a pricing rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): PricingRule[] {
    return [...this.rules];
  }

  /**
   * Get enabled rules
   */
  getEnabledRules(): PricingRule[] {
    return this.rules.filter(rule => rule.enabled);
  }

  /**
   * Evaluate rules against a listing
   */
  evaluateListing(listing: ListingData): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      const result = this.evaluateRule(rule, listing);
      results.push(result);

      // If rule matched and action is delist, stop processing
      if (result.matched && result.action?.type === 'delist') {
        break;
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against a listing
   */
  private evaluateRule(rule: PricingRule, listing: ListingData): RuleEvaluationResult {
    const conditions = rule.conditions;
    let matched = true;
    const reasons: string[] = [];

    // Check marketplace condition
    if (conditions.marketplace && conditions.marketplace !== listing.marketplace) {
      matched = false;
      reasons.push(`Marketplace mismatch: expected ${conditions.marketplace}, got ${listing.marketplace}`);
    }

    // Check category condition
    if (conditions.category && conditions.category !== listing.category) {
      matched = false;
      reasons.push(`Category mismatch: expected ${conditions.category}, got ${listing.category}`);
    }

    // Check price range condition
    if (conditions.priceRange) {
      if (listing.price < conditions.priceRange.min || listing.price > conditions.priceRange.max) {
        matched = false;
        reasons.push(`Price out of range: ${listing.price} not in [${conditions.priceRange.min}, ${conditions.priceRange.max}]`);
      }
    }

    // Check days listed condition
    if (conditions.daysListed && listing.daysListed < conditions.daysListed) {
      matched = false;
      reasons.push(`Days listed insufficient: ${listing.daysListed} < ${conditions.daysListed}`);
    }

    // Check brand condition
    if (conditions.brand && conditions.brand !== listing.brand) {
      matched = false;
      reasons.push(`Brand mismatch: expected ${conditions.brand}, got ${listing.brand}`);
    }

    // Check condition condition
    if (conditions.condition && conditions.condition !== listing.condition) {
      matched = false;
      reasons.push(`Condition mismatch: expected ${conditions.condition}, got ${listing.condition}`);
    }

    let newPrice: number | undefined;
    let action: PricingRuleAction | undefined;

    if (matched) {
      action = rule.actions;
      newPrice = this.calculateNewPrice(listing.price, rule.actions);
      reasons.push(`Rule matched: ${rule.name}`);
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched,
      action,
      newPrice,
      reason: reasons.join('; '),
    };
  }

  /**
   * Calculate new price based on action
   */
  private calculateNewPrice(currentPrice: number, action: PricingRuleAction): number {
    switch (action.type) {
      case 'set_price':
        return action.value;
      
      case 'adjust_price':
        if (action.percentage) {
          return currentPrice * (1 + action.value / 100);
        } else {
          return currentPrice + action.value;
        }
      
      case 'delist':
        return 0; // Price doesn't matter for delisting
      
      default:
        return currentPrice;
    }
  }

  /**
   * Apply rules to a listing and return the updated listing
   */
  applyRules(listing: ListingData): { listing: ListingData; results: RuleEvaluationResult[] } {
    const results = this.evaluateListing(listing);
    let updatedListing = { ...listing };

    // Apply the first matching rule's action
    const firstMatch = results.find(result => result.matched);
    if (firstMatch && firstMatch.action) {
      if (firstMatch.action.type === 'delist') {
        // Mark as delisted (you might want to add a status field to ListingData)
        updatedListing = { ...updatedListing, price: 0 };
      } else if (firstMatch.newPrice !== undefined) {
        updatedListing = { ...updatedListing, price: firstMatch.newPrice };
      }
    }

    return { listing: updatedListing, results };
  }

  /**
   * Batch apply rules to multiple listings
   */
  applyRulesBatch(listings: ListingData[]): { listings: ListingData[]; results: Map<string, RuleEvaluationResult[]> } {
    const results = new Map<string, RuleEvaluationResult[]>();
    const updatedListings: ListingData[] = [];

    for (const listing of listings) {
      const { listing: updatedListing, results: listingResults } = this.applyRules(listing);
      updatedListings.push(updatedListing);
      results.set(listing.id, listingResults);
    }

    return { listings: updatedListings, results };
  }

  /**
   * Get rule statistics
   */
  getRuleStatistics(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    rulesByType: Record<string, number>;
  } {
    const enabledRules = this.rules.filter(rule => rule.enabled);
    const disabledRules = this.rules.filter(rule => !rule.enabled);
    
    const rulesByType = this.rules.reduce((acc, rule) => {
      const type = rule.actions.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: this.rules.length,
      enabledRules: enabledRules.length,
      disabledRules: disabledRules.length,
      rulesByType,
    };
  }
}

// Export singleton instance
export const pricingRulesEngine = new PricingRulesEngine();
