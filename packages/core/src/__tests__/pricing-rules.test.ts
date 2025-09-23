import { PricingRulesEngine, PricingRule, ListingData } from '../pricing-rules';

describe('PricingRulesEngine', () => {
  let engine: PricingRulesEngine;
  let mockListing: ListingData;

  beforeEach(() => {
    engine = new PricingRulesEngine();
    mockListing = {
      id: '1',
      title: 'Test Item',
      description: 'A test item',
      price: 100,
      category: 'Clothing',
      brand: 'Nike',
      condition: 'NEW',
      marketplace: 'eBay',
      daysListed: 30,
      images: ['image1.jpg'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
  });

  describe('Rule Management', () => {
    it('should add a new rule', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Test Rule',
        description: 'A test rule',
        enabled: true,
        conditions: {
          marketplace: 'eBay',
          daysListed: 30,
        },
        actions: {
          type: 'adjust_price',
          value: -10,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const rules = engine.getRules();
      
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(rule);
    });

    it('should sort rules by priority', () => {
      const rule1: PricingRule = {
        id: '1',
        name: 'Low Priority',
        description: 'Low priority rule',
        enabled: true,
        conditions: {},
        actions: { type: 'adjust_price', value: -5, percentage: true },
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rule2: PricingRule = {
        id: '2',
        name: 'High Priority',
        description: 'High priority rule',
        enabled: true,
        conditions: {},
        actions: { type: 'adjust_price', value: -10, percentage: true },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      const rules = engine.getRules();
      
      expect(rules[0].priority).toBe(1);
      expect(rules[1].priority).toBe(2);
    });

    it('should update an existing rule', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Test Rule',
        description: 'A test rule',
        enabled: true,
        conditions: {},
        actions: { type: 'adjust_price', value: -10, percentage: true },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      engine.updateRule('1', { enabled: false });
      
      const rules = engine.getRules();
      expect(rules[0].enabled).toBe(false);
    });

    it('should remove a rule', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Test Rule',
        description: 'A test rule',
        enabled: true,
        conditions: {},
        actions: { type: 'adjust_price', value: -10, percentage: true },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      engine.removeRule('1');
      
      const rules = engine.getRules();
      expect(rules).toHaveLength(0);
    });
  });

  describe('Rule Evaluation', () => {
    it('should match rule with marketplace condition', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'eBay Rule',
        description: 'Rule for eBay',
        enabled: true,
        conditions: {
          marketplace: 'eBay',
        },
        actions: {
          type: 'adjust_price',
          value: -10,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
      expect(results[0].newPrice).toBe(90); // 100 - 10%
    });

    it('should not match rule with different marketplace', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Poshmark Rule',
        description: 'Rule for Poshmark',
        enabled: true,
        conditions: {
          marketplace: 'Poshmark',
        },
        actions: {
          type: 'adjust_price',
          value: -10,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(false);
    });

    it('should match rule with days listed condition', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Stale Item Rule',
        description: 'Rule for stale items',
        enabled: true,
        conditions: {
          daysListed: 30,
        },
        actions: {
          type: 'adjust_price',
          value: -15,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
      expect(results[0].newPrice).toBe(85); // 100 - 15%
    });

    it('should not match rule with insufficient days listed', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Stale Item Rule',
        description: 'Rule for stale items',
        enabled: true,
        conditions: {
          daysListed: 60,
        },
        actions: {
          type: 'adjust_price',
          value: -15,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(false);
    });

    it('should handle delist action', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Delist Rule',
        description: 'Rule to delist items',
        enabled: true,
        conditions: {
          daysListed: 90,
        },
        actions: {
          type: 'delist',
          value: 0,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const staleListing = { ...mockListing, daysListed: 90 };
      engine.addRule(rule);
      const results = engine.evaluateListing(staleListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
      expect(results[0].action?.type).toBe('delist');
    });

    it('should handle set_price action', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Set Price Rule',
        description: 'Rule to set specific price',
        enabled: true,
        conditions: {
          category: 'Clothing',
        },
        actions: {
          type: 'set_price',
          value: 75,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
      expect(results[0].newPrice).toBe(75);
    });

    it('should handle adjust_price with fixed amount', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Fixed Discount Rule',
        description: 'Rule with fixed discount',
        enabled: true,
        conditions: {
          marketplace: 'eBay',
        },
        actions: {
          type: 'adjust_price',
          value: -20,
          percentage: false,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const results = engine.evaluateListing(mockListing);
      
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
      expect(results[0].newPrice).toBe(80); // 100 - 20
    });
  });

  describe('Rule Application', () => {
    it('should apply rules to a listing', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Test Rule',
        description: 'A test rule',
        enabled: true,
        conditions: {
          marketplace: 'eBay',
        },
        actions: {
          type: 'adjust_price',
          value: -10,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule);
      const { listing, results } = engine.applyRules(mockListing);
      
      expect(listing.price).toBe(90);
      expect(results).toHaveLength(1);
      expect(results[0].matched).toBe(true);
    });

    it('should apply rules to multiple listings', () => {
      const rule: PricingRule = {
        id: '1',
        name: 'Test Rule',
        description: 'A test rule',
        enabled: true,
        conditions: {
          marketplace: 'eBay',
        },
        actions: {
          type: 'adjust_price',
          value: -10,
          percentage: true,
        },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listings = [mockListing, { ...mockListing, id: '2', price: 200 }];
      engine.addRule(rule);
      const { listings: updatedListings, results } = engine.applyRulesBatch(listings);
      
      expect(updatedListings[0].price).toBe(90);
      expect(updatedListings[1].price).toBe(180);
      expect(results.size).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should return rule statistics', () => {
      const rule1: PricingRule = {
        id: '1',
        name: 'Rule 1',
        description: 'First rule',
        enabled: true,
        conditions: {},
        actions: { type: 'adjust_price', value: -10, percentage: true },
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rule2: PricingRule = {
        id: '2',
        name: 'Rule 2',
        description: 'Second rule',
        enabled: false,
        conditions: {},
        actions: { type: 'delist', value: 0 },
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      engine.addRule(rule1);
      engine.addRule(rule2);
      const stats = engine.getRuleStatistics();
      
      expect(stats.totalRules).toBe(2);
      expect(stats.enabledRules).toBe(1);
      expect(stats.disabledRules).toBe(1);
      expect(stats.rulesByType.adjust_price).toBe(1);
      expect(stats.rulesByType.delist).toBe(1);
    });
  });
});
