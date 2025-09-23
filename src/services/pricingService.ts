// Pricing Service - Competitive pricing strategy implementation

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    listings: number;
    marketplaces: number;
    teamMembers: number;
    apiCalls: number;
  };
  popular?: boolean;
  recommended?: boolean;
}

export interface PricingFeature {
  name: string;
  description: string;
  included: boolean;
  planIds: string[];
}

export interface MoneyBackGuarantee {
  enabled: boolean;
  days: number;
  description: string;
  terms: string[];
}

export interface PricingStrategy {
  plans: PricingPlan[];
  features: PricingFeature[];
  moneyBackGuarantee: MoneyBackGuarantee;
  noAddOnFees: boolean;
  competitiveAdvantages: string[];
}

class PricingService {
  private pricingStrategy: PricingStrategy;

  constructor() {
    this.initializePricingStrategy();
  }

  // Initialize competitive pricing strategy
  private initializePricingStrategy(): void {
    this.pricingStrategy = {
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'USD',
          interval: 'monthly',
          features: [
            '150 monthly listings',
            '5 marketplace connections',
            'Basic analytics',
            'Email support',
            'Mobile app access',
            'Basic automation',
          ],
          limits: {
            listings: 150,
            marketplaces: 5,
            teamMembers: 1,
            apiCalls: 1000,
          },
        },
        {
          id: 'starter',
          name: 'Starter',
          price: 17.99,
          currency: 'USD',
          interval: 'monthly',
          features: [
            '500 monthly listings',
            '10 marketplace connections',
            'Advanced analytics',
            'Priority support',
            'All mobile features',
            'Advanced automation',
            'Dynamic repricing',
            'Team collaboration (up to 3 members)',
          ],
          limits: {
            listings: 500,
            marketplaces: 10,
            teamMembers: 3,
            apiCalls: 5000,
          },
          popular: true,
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 27.99,
          currency: 'USD',
          interval: 'monthly',
          features: [
            '1,500 monthly listings',
            '15 marketplace connections',
            'Advanced profit analytics',
            '24/7 support',
            'All features included',
            'AI-powered optimization',
            'Team management (up to 10 members)',
            'API access',
            'Custom integrations',
          ],
          limits: {
            listings: 1500,
            marketplaces: 15,
            teamMembers: 10,
            apiCalls: 15000,
          },
          recommended: true,
        },
        {
          id: 'business',
          name: 'Business',
          price: 47.99,
          currency: 'USD',
          interval: 'monthly',
          features: [
            '5,000 monthly listings',
            'All marketplace connections',
            'Enterprise analytics',
            'Dedicated support',
            'All features included',
            'Advanced team management',
            'Custom workflows',
            'White-label options',
            'Priority API access',
            'Custom training',
          ],
          limits: {
            listings: 5000,
            marketplaces: 20,
            teamMembers: 25,
            apiCalls: 50000,
          },
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 0, // Custom pricing
          currency: 'USD',
          interval: 'monthly',
          features: [
            'Unlimited listings',
            'All marketplace connections',
            'Custom analytics',
            'Dedicated account manager',
            'All features included',
            'Unlimited team members',
            'Custom integrations',
            'On-premise deployment',
            'SLA guarantee',
            'Custom training',
          ],
          limits: {
            listings: -1, // Unlimited
            marketplaces: -1, // Unlimited
            teamMembers: -1, // Unlimited
            apiCalls: -1, // Unlimited
          },
        },
      ],
      features: [
        {
          name: 'Amazon Integration',
          description: 'Full Amazon Seller Central integration',
          included: true,
          planIds: ['starter', 'pro', 'business', 'enterprise'],
        },
        {
          name: 'Walmart Integration',
          description: 'Complete Walmart Marketplace integration',
          included: true,
          planIds: ['starter', 'pro', 'business', 'enterprise'],
        },
        {
          name: 'Dynamic Repricing',
          description: 'AI-powered automatic price optimization',
          included: true,
          planIds: ['starter', 'pro', 'business', 'enterprise'],
        },
        {
          name: 'Advanced Analytics',
          description: 'Comprehensive profit tracking and reporting',
          included: true,
          planIds: ['pro', 'business', 'enterprise'],
        },
        {
          name: 'Team Management',
          description: 'Multi-user collaboration and management',
          included: true,
          planIds: ['starter', 'pro', 'business', 'enterprise'],
        },
        {
          name: 'API Access',
          description: 'Full API access for custom integrations',
          included: true,
          planIds: ['pro', 'business', 'enterprise'],
        },
        {
          name: 'White-Label',
          description: 'Rebrand OmniLister for your business',
          included: true,
          planIds: ['business', 'enterprise'],
        },
        {
          name: 'Custom Integrations',
          description: 'Build custom marketplace integrations',
          included: true,
          planIds: ['pro', 'business', 'enterprise'],
        },
      ],
      moneyBackGuarantee: {
        enabled: true,
        days: 30,
        description: '30-day money-back guarantee - the longest in the market',
        terms: [
          'Full refund within 30 days of subscription',
          'No questions asked policy',
          'Keep all data and analytics',
          'Cancel anytime without penalty',
          'Pro-rated refunds for annual plans',
        ],
      },
      noAddOnFees: true,
      competitiveAdvantages: [
        'ALL features included - no add-on fees like Vendoo',
        '30-day money-back guarantee - longest in market',
        'Amazon & Walmart integration - only affordable option',
        'Dynamic repricing - enterprise feature at reseller price',
        'Advanced analytics - most comprehensive in market',
        'Team management - enterprise features for all plans',
        'API access included - not extra like competitors',
        'Mobile-first approach - native apps vs web-only',
        'AI-powered optimization - unique in market',
        'Usage-based pricing option - flexible for all users',
      ],
    };
  }

  // Get pricing strategy
  getPricingStrategy(): PricingStrategy {
    return this.pricingStrategy;
  }

  // Get pricing plans
  getPricingPlans(): PricingPlan[] {
    return this.pricingStrategy.plans;
  }

  // Get specific plan
  getPlan(planId: string): PricingPlan | null {
    return this.pricingStrategy.plans.find(plan => plan.id === planId) || null;
  }

  // Get plan features
  getPlanFeatures(planId: string): PricingFeature[] {
    const plan = this.getPlan(planId);
    if (!plan) return [];

    return this.pricingStrategy.features.filter(feature => 
      feature.planIds.includes(planId)
    );
  }

  // Compare with competitors
  getCompetitorComparison(): any {
    return {
      omniLister: {
        free: { listings: 150, price: 0 },
        starter: { listings: 500, price: 17.99 },
        pro: { listings: 1500, price: 27.99 },
        business: { listings: 5000, price: 47.99 },
        enterprise: { listings: 'unlimited', price: 'custom' },
      },
      vendoo: {
        free: { listings: 50, price: 0 },
        starter: { listings: 200, price: 22.96 }, // With required add-ons
        pro: { listings: 500, price: 39.96 }, // With required add-ons
        business: { listings: 1000, price: 69.96 }, // With required add-ons
      },
      crosslist: {
        free: { listings: 100, price: 0 },
        starter: { listings: 500, price: 29.99 },
        pro: { listings: 1500, price: 49.99 },
        business: { listings: 5000, price: 99.99 },
      },
      listPerfectly: {
        free: { listings: 100, price: 0 },
        starter: { listings: 500, price: 29 },
        pro: { listings: 1500, price: 49 },
        business: { listings: 5000, price: 99 },
      },
      zentail: {
        enterprise: { listings: 'unlimited', price: 199 },
      },
    };
  }

  // Calculate savings vs competitors
  calculateSavings(planId: string, competitor: string): number {
    const plan = this.getPlan(planId);
    if (!plan) return 0;

    const comparison = this.getCompetitorComparison();
    const competitorPlan = comparison[competitor]?.[planId];
    
    if (!competitorPlan || competitorPlan.price === 'custom') return 0;

    const savings = competitorPlan.price - plan.price;
    return Math.max(0, savings);
  }

  // Get money-back guarantee info
  getMoneyBackGuarantee(): MoneyBackGuarantee {
    return this.pricingStrategy.moneyBackGuarantee;
  }

  // Check if feature is included in plan
  isFeatureIncluded(planId: string, featureName: string): boolean {
    const feature = this.pricingStrategy.features.find(f => f.name === featureName);
    if (!feature) return false;

    return feature.planIds.includes(planId);
  }

  // Get plan recommendations based on usage
  getPlanRecommendation(usage: {
    listings: number;
    marketplaces: number;
    teamMembers: number;
    apiCalls: number;
  }): PricingPlan | null {
    const plans = this.pricingStrategy.plans.filter(plan => plan.id !== 'enterprise');

    for (const plan of plans) {
      if (
        usage.listings <= plan.limits.listings &&
        usage.marketplaces <= plan.limits.marketplaces &&
        usage.teamMembers <= plan.limits.teamMembers &&
        usage.apiCalls <= plan.limits.apiCalls
      ) {
        return plan;
      }
    }

    // If no plan fits, recommend enterprise
    return this.getPlan('enterprise');
  }

  // Calculate annual savings
  calculateAnnualSavings(planId: string): number {
    const plan = this.getPlan(planId);
    if (!plan) return 0;

    const monthlyPrice = plan.price;
    const annualPrice = monthlyPrice * 12;
    const annualDiscount = annualPrice * 0.2; // 20% discount for annual

    return annualDiscount;
  }

  // Get pricing highlights
  getPricingHighlights(): string[] {
    return [
      '50% more free listings than List Perfectly (150 vs 100)',
      'Undercuts Vendoo\'s true cost by $5+ per month',
      'Beats Crosslist and List Perfectly pricing',
      '75% cheaper than Zentail for enterprise features',
      'No add-on fees - everything included',
      '30-day money-back guarantee - longest in market',
      'Usage-based pricing option for flexibility',
      'API access included - not extra like competitors',
    ];
  }

  // Validate plan limits
  validatePlanLimits(planId: string, usage: {
    listings: number;
    marketplaces: number;
    teamMembers: number;
    apiCalls: number;
  }): { valid: boolean; exceeded: string[] } {
    const plan = this.getPlan(planId);
    if (!plan) return { valid: false, exceeded: ['plan_not_found'] };

    const exceeded: string[] = [];

    if (plan.limits.listings !== -1 && usage.listings > plan.limits.listings) {
      exceeded.push('listings');
    }

    if (plan.limits.marketplaces !== -1 && usage.marketplaces > plan.limits.marketplaces) {
      exceeded.push('marketplaces');
    }

    if (plan.limits.teamMembers !== -1 && usage.teamMembers > plan.limits.teamMembers) {
      exceeded.push('teamMembers');
    }

    if (plan.limits.apiCalls !== -1 && usage.apiCalls > plan.limits.apiCalls) {
      exceeded.push('apiCalls');
    }

    return {
      valid: exceeded.length === 0,
      exceeded,
    };
  }

  // Get upgrade recommendations
  getUpgradeRecommendations(planId: string, usage: {
    listings: number;
    marketplaces: number;
    teamMembers: number;
    apiCalls: number;
  }): PricingPlan[] {
    const currentPlan = this.getPlan(planId);
    if (!currentPlan) return [];

    const validation = this.validatePlanLimits(planId, usage);
    if (validation.valid) return [];

    const plans = this.pricingStrategy.plans;
    const currentIndex = plans.findIndex(plan => plan.id === planId);
    
    return plans.slice(currentIndex + 1).filter(plan => {
      const planValidation = this.validatePlanLimits(plan.id, usage);
      return planValidation.valid;
    });
  }
}

export const pricingService = new PricingService();
