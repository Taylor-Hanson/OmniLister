import { PriceAdjustmentType, PriceRange } from './types';
import { PRICING } from './constants';
import { numberUtils } from './utils';

export interface PriceAdjustment {
  type: PriceAdjustmentType;
  value: number;
  reason?: string;
}

export interface PricingRule {
  id: string;
  name: string;
  marketplace: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  adjustment: PriceAdjustment;
  isActive: boolean;
}

export interface PricingResult {
  originalPrice: number;
  adjustedPrice: number;
  adjustment: PriceAdjustment;
  margin: number;
  profit: number;
  fees: number;
  isProfitable: boolean;
}

export class PricingEngine {
  private rules: PricingRule[] = [];

  constructor(rules: PricingRule[] = []) {
    this.rules = rules;
  }

  /**
   * Calculate optimal price for listing
   */
  calculatePrice(
    basePrice: number,
    cost: number,
    marketplace: string,
    category?: string,
    brand?: string
  ): PricingResult {
    // Find applicable rules
    const applicableRules = this.getApplicableRules(marketplace, category, brand);
    
    // Apply adjustments
    let adjustedPrice = basePrice;
    let totalAdjustment: PriceAdjustment = { type: 'percentage', value: 0 };

    for (const rule of applicableRules) {
      if (this.isRuleApplicable(rule, basePrice, category, brand)) {
        const adjustment = this.applyAdjustment(adjustedPrice, rule.adjustment);
        adjustedPrice = adjustment.price;
        totalAdjustment = {
          type: rule.adjustment.type,
          value: totalAdjustment.value + rule.adjustment.value,
          reason: rule.name
        };
      }
    }

    // Calculate fees and profit
    const fees = this.calculateFees(adjustedPrice, marketplace);
    const profit = adjustedPrice - cost - fees;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;
    const isProfitable = profit > 0;

    return {
      originalPrice: basePrice,
      adjustedPrice: numberUtils.round(adjustedPrice, 2),
      adjustment: totalAdjustment,
      margin: numberUtils.round(margin, 2),
      profit: numberUtils.round(profit, 2),
      fees: numberUtils.round(fees, 2),
      isProfitable
    };
  }

  /**
   * Get applicable pricing rules
   */
  private getApplicableRules(marketplace: string, category?: string, brand?: string): PricingRule[] {
    return this.rules.filter(rule => 
      rule.isActive &&
      rule.marketplace === marketplace &&
      (!rule.category || rule.category === category) &&
      (!rule.brand || rule.brand === brand)
    );
  }

  /**
   * Check if rule is applicable to price range
   */
  private isRuleApplicable(rule: PricingRule, price: number, category?: string, brand?: string): boolean {
    if (rule.minPrice && price < rule.minPrice) return false;
    if (rule.maxPrice && price > rule.maxPrice) return false;
    return true;
  }

  /**
   * Apply price adjustment
   */
  private applyAdjustment(price: number, adjustment: PriceAdjustment): { price: number; adjustment: PriceAdjustment } {
    let newPrice = price;

    if (adjustment.type === 'percentage') {
      newPrice = price * (1 + adjustment.value / 100);
    } else if (adjustment.type === 'fixed_amount') {
      newPrice = price + adjustment.value;
    }

    // Ensure minimum price
    newPrice = Math.max(newPrice, PRICING.MIN_PRICE_THRESHOLD);

    return {
      price: newPrice,
      adjustment
    };
  }

  /**
   * Calculate marketplace fees
   */
  private calculateFees(price: number, marketplace: string): number {
    const feeRates: Record<string, number> = {
      ebay: 0.1, // 10%
      poshmark: 0.2, // 20%
      mercari: 0.1, // 10%
      depop: 0.1, // 10%
      grailed: 0.09, // 9%
      shopify: 0.029 + 0.30, // 2.9% + $0.30
      amazon: 0.15, // 15%
      default: 0.15 // 15% default
    };

    const rate = feeRates[marketplace] || feeRates.default;
    return price * rate;
  }

  /**
   * Add pricing rule
   */
  addRule(rule: PricingRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove pricing rule
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
}

// Pricing utilities
export const pricingUtils = {
  /**
   * Calculate markup percentage
   */
  calculateMarkup: (sellingPrice: number, cost: number): number => {
    if (cost === 0) return 0;
    return ((sellingPrice - cost) / cost) * 100;
  },

  /**
   * Calculate margin percentage
   */
  calculateMargin: (sellingPrice: number, cost: number): number => {
    if (sellingPrice === 0) return 0;
    return ((sellingPrice - cost) / sellingPrice) * 100;
  },

  /**
   * Calculate break-even price
   */
  calculateBreakEven: (cost: number, feeRate: number): number => {
    return cost / (1 - feeRate);
  },

  /**
   * Calculate target profit price
   */
  calculateTargetPrice: (cost: number, targetMargin: number, feeRate: number): number => {
    return cost / (1 - targetMargin / 100 - feeRate);
  },

  /**
   * Determine price range category
   */
  getPriceRange: (price: number): PriceRange => {
    if (price < 25) return 'low';
    if (price < 100) return 'medium';
    return 'high';
  },

  /**
   * Format price for display
   */
  formatPrice: (price: number, currency: string = 'USD'): string => {
    return numberUtils.formatCurrency(price, currency);
  },

  /**
   * Validate price
   */
  isValidPrice: (price: number): boolean => {
    return price > 0 && price <= 1000000; // Max $1M
  },

  /**
   * Round price to nearest cent
   */
  roundPrice: (price: number): number => {
    return numberUtils.round(price, 2);
  }
};

// Default pricing rules
export const defaultPricingRules: PricingRule[] = [
  {
    id: 'default-markup',
    name: 'Default 20% Markup',
    marketplace: 'default',
    adjustment: { type: 'percentage', value: 20 },
    isActive: true
  },
  {
    id: 'poshmark-fee-adjustment',
    name: 'Poshmark Fee Adjustment',
    marketplace: 'poshmark',
    adjustment: { type: 'percentage', value: 25 }, // Higher markup for 20% fees
    isActive: true
  },
  {
    id: 'luxury-premium',
    name: 'Luxury Brand Premium',
    marketplace: 'default',
    brand: 'luxury',
    adjustment: { type: 'percentage', value: 30 },
    isActive: true
  }
];
