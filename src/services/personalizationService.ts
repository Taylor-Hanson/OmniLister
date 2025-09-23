// Personalization Service - Targeted experiences and user segmentation

import { aiService } from './aiService';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  segment: 'reseller' | 'business' | 'enterprise' | 'new_user';
  preferences: {
    marketplaces: string[];
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
    notificationSettings: {
      sales: boolean;
      offers: boolean;
      newFeatures: boolean;
      tips: boolean;
    };
    uiPreferences: {
      theme: 'dark' | 'light' | 'auto';
      language: string;
      currency: string;
    };
  };
  behavior: {
    loginFrequency: 'daily' | 'weekly' | 'monthly';
    primaryDevice: 'mobile' | 'desktop' | 'tablet';
    peakHours: string[];
    averageSessionDuration: number;
    featuresUsed: string[];
    lastActive: Date;
  };
  performance: {
    totalListings: number;
    totalSales: number;
    totalRevenue: number;
    averageRating: number;
    conversionRate: number;
  };
  goals: {
    monthlyRevenue: number;
    targetMarketplaces: string[];
    growthStrategy: 'volume' | 'margin' | 'diversification';
  };
}

export interface PersonalizedContent {
  id: string;
  type: 'tip' | 'feature' | 'promotion' | 'reminder' | 'achievement';
  title: string;
  description: string;
  actionText: string;
  actionUrl: string;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
  segment: string[];
  personalization: {
    userSegment: string[];
    behaviorTriggers: string[];
    performanceThresholds: {
      minRevenue?: number;
      maxRevenue?: number;
      minListings?: number;
      maxListings?: number;
    };
  };
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    minRevenue?: number;
    maxRevenue?: number;
    minListings?: number;
    maxListings?: number;
    marketplaces?: string[];
    behavior?: string[];
  };
  size: number;
  characteristics: string[];
  recommendations: string[];
}

export interface PersonalizationAnalytics {
  totalUsers: number;
  segments: {
    segment: string;
    count: number;
    percentage: number;
    avgRevenue: number;
    avgListings: number;
  }[];
  contentPerformance: {
    contentId: string;
    type: string;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
  }[];
  recommendations: {
    feature: string;
    users: number;
    successRate: number;
    revenueImpact: number;
  }[];
}

class PersonalizationService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private personalizedContent: PersonalizedContent[] = [];
  private userSegments: UserSegment[] = [];
  private analytics: PersonalizationAnalytics | null = null;

  // Initialize personalization service
  async initialize() {
    try {
      await this.loadUserSegments();
      await this.loadPersonalizedContent();
      await this.loadUserProfiles();
      await this.calculateAnalytics();
      
      console.log('Personalization service initialized');
    } catch (error) {
      console.error('Failed to initialize personalization service:', error);
    }
  }

  // Load user segments
  private async loadUserSegments(): Promise<void> {
    this.userSegments = [
      {
        id: 'new_user',
        name: 'New Users',
        description: 'Users who joined in the last 30 days',
        criteria: {
          maxListings: 10,
        },
        size: 0,
        characteristics: [
          'Learning the platform',
          'Need onboarding guidance',
          'Low activity levels',
          'High support needs',
        ],
        recommendations: [
          'Show onboarding tips',
          'Highlight key features',
          'Provide success stories',
          'Offer personalized setup',
        ],
      },
      {
        id: 'reseller',
        name: 'Resellers',
        description: 'Individual sellers with moderate volume',
        criteria: {
          minListings: 10,
          maxListings: 100,
          minRevenue: 100,
          maxRevenue: 5000,
        },
        size: 0,
        characteristics: [
          'Focus on profit margins',
          'Use multiple marketplaces',
          'Value automation',
          'Price-sensitive',
        ],
        recommendations: [
          'Show profit optimization tips',
          'Highlight automation features',
          'Suggest marketplace expansion',
          'Provide pricing strategies',
        ],
      },
      {
        id: 'business',
        name: 'Business Sellers',
        description: 'Established businesses with high volume',
        criteria: {
          minListings: 100,
          maxListings: 1000,
          minRevenue: 5000,
          maxRevenue: 50000,
        },
        size: 0,
        characteristics: [
          'Team collaboration needs',
          'Advanced analytics requirements',
          'API integration needs',
          'Growth-focused',
        ],
        recommendations: [
          'Show team management features',
          'Highlight advanced analytics',
          'Suggest API integrations',
          'Provide growth strategies',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Large businesses with enterprise needs',
        criteria: {
          minListings: 1000,
          minRevenue: 50000,
        },
        size: 0,
        characteristics: [
          'Custom integrations',
          'Dedicated support needs',
          'Compliance requirements',
          'Scale-focused',
        ],
        recommendations: [
          'Show enterprise features',
          'Highlight custom solutions',
          'Suggest white-label options',
          'Provide enterprise support',
        ],
      },
    ];
  }

  // Load personalized content
  private async loadPersonalizedContent(): Promise<void> {
    this.personalizedContent = [
      {
        id: 'tip_001',
        type: 'tip',
        title: 'Boost Your Sales with Dynamic Repricing',
        description: 'Automatically adjust your prices to stay competitive and maximize profits.',
        actionText: 'Enable Repricing',
        actionUrl: '/repricing',
        priority: 'high',
        segment: ['reseller', 'business'],
        personalization: {
          userSegment: ['reseller', 'business'],
          behaviorTriggers: ['low_conversion_rate', 'high_competition'],
          performanceThresholds: {
            minListings: 5,
            maxRevenue: 10000,
          },
        },
      },
      {
        id: 'feature_001',
        type: 'feature',
        title: 'Connect to Amazon Seller Central',
        description: 'Access the largest marketplace with our enterprise-level integration.',
        actionText: 'Connect Amazon',
        actionUrl: '/integrations/amazon',
        priority: 'high',
        segment: ['business', 'enterprise'],
        personalization: {
          userSegment: ['business', 'enterprise'],
          behaviorTriggers: ['high_volume', 'growth_focused'],
          performanceThresholds: {
            minListings: 50,
            minRevenue: 2000,
          },
        },
      },
      {
        id: 'promotion_001',
        type: 'promotion',
        title: 'Upgrade to Pro for Advanced Analytics',
        description: 'Get detailed profit tracking and AI-powered insights.',
        actionText: 'Upgrade Now',
        actionUrl: '/pricing',
        priority: 'medium',
        segment: ['reseller'],
        personalization: {
          userSegment: ['reseller'],
          behaviorTriggers: ['analytics_interest', 'profit_focused'],
          performanceThresholds: {
            minListings: 20,
            minRevenue: 500,
          },
        },
      },
      {
        id: 'reminder_001',
        type: 'reminder',
        title: 'Complete Your Profile Setup',
        description: 'Add your marketplace connections to get started.',
        actionText: 'Complete Setup',
        actionUrl: '/setup',
        priority: 'high',
        segment: ['new_user'],
        personalization: {
          userSegment: ['new_user'],
          behaviorTriggers: ['incomplete_setup', 'low_activity'],
          performanceThresholds: {
            maxListings: 5,
          },
        },
      },
    ];
  }

  // Load user profiles
  private async loadUserProfiles(): Promise<void> {
    // Mock implementation - in real app, load from database
    const mockProfiles: UserProfile[] = [
      {
        id: 'user_001',
        email: 'john@example.com',
        name: 'John Smith',
        segment: 'reseller',
        preferences: {
          marketplaces: ['eBay', 'Poshmark'],
          categories: ['Electronics', 'Fashion'],
          priceRange: { min: 10, max: 500 },
          notificationSettings: {
            sales: true,
            offers: true,
            newFeatures: false,
            tips: true,
          },
          uiPreferences: {
            theme: 'dark',
            language: 'en',
            currency: 'USD',
          },
        },
        behavior: {
          loginFrequency: 'daily',
          primaryDevice: 'mobile',
          peakHours: ['09:00', '18:00'],
          averageSessionDuration: 15,
          featuresUsed: ['listings', 'analytics', 'repricing'],
          lastActive: new Date(),
        },
        performance: {
          totalListings: 45,
          totalSales: 23,
          totalRevenue: 3450,
          averageRating: 4.8,
          conversionRate: 3.2,
        },
        goals: {
          monthlyRevenue: 2000,
          targetMarketplaces: ['eBay', 'Amazon', 'Poshmark'],
          growthStrategy: 'margin',
        },
      },
    ];

    mockProfiles.forEach(profile => {
      this.userProfiles.set(profile.id, profile);
    });
  }

  // Calculate analytics
  private async calculateAnalytics(): Promise<void> {
    const totalUsers = this.userProfiles.size;
    const segments = this.userSegments.map(segment => {
      const users = Array.from(this.userProfiles.values()).filter(
        user => user.segment === segment.id
      );
      
      const avgRevenue = users.reduce((sum, user) => sum + user.performance.totalRevenue, 0) / users.length || 0;
      const avgListings = users.reduce((sum, user) => sum + user.performance.totalListings, 0) / users.length || 0;
      
      return {
        segment: segment.name,
        count: users.length,
        percentage: (users.length / totalUsers) * 100,
        avgRevenue,
        avgListings,
      };
    });

    this.analytics = {
      totalUsers,
      segments,
      contentPerformance: [],
      recommendations: [],
    };
  }

  // Get user profile
  getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) return false;

      const updatedProfile = { ...profile, ...updates };
      this.userProfiles.set(userId, updatedProfile);
      
      // Recalculate segment
      await this.recalculateUserSegment(userId);
      
      return true;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return false;
    }
  }

  // Recalculate user segment
  private async recalculateUserSegment(userId: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    const newSegment = this.determineUserSegment(profile);
    if (newSegment !== profile.segment) {
      profile.segment = newSegment;
      this.userProfiles.set(userId, profile);
    }
  }

  // Determine user segment
  private determineUserSegment(profile: UserProfile): UserProfile['segment'] {
    const { performance } = profile;
    
    if (performance.totalListings >= 1000 || performance.totalRevenue >= 50000) {
      return 'enterprise';
    } else if (performance.totalListings >= 100 || performance.totalRevenue >= 5000) {
      return 'business';
    } else if (performance.totalListings >= 10 || performance.totalRevenue >= 100) {
      return 'reseller';
    } else {
      return 'new_user';
    }
  }

  // Get personalized content for user
  async getPersonalizedContent(userId: string): Promise<PersonalizedContent[]> {
    const profile = this.getUserProfile(userId);
    if (!profile) return [];

    const relevantContent = this.personalizedContent.filter(content => {
      // Check if content is relevant to user segment
      if (!content.personalization.userSegment.includes(profile.segment)) {
        return false;
      }

      // Check performance thresholds
      const thresholds = content.personalization.performanceThresholds;
      if (thresholds.minRevenue && profile.performance.totalRevenue < thresholds.minRevenue) {
        return false;
      }
      if (thresholds.maxRevenue && profile.performance.totalRevenue > thresholds.maxRevenue) {
        return false;
      }
      if (thresholds.minListings && profile.performance.totalListings < thresholds.minListings) {
        return false;
      }
      if (thresholds.maxListings && profile.performance.totalListings > thresholds.maxListings) {
        return false;
      }

      // Check if content has expired
      if (content.expiresAt && content.expiresAt < new Date()) {
        return false;
      }

      return true;
    });

    // Sort by priority and relevance
    return relevantContent.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Get user recommendations
  async getUserRecommendations(userId: string): Promise<string[]> {
    const profile = this.getUserProfile(userId);
    if (!profile) return [];

    const segment = this.userSegments.find(s => s.id === profile.segment);
    if (!segment) return [];

    // Use AI to generate personalized recommendations
    try {
      const prompt = `
      Generate personalized recommendations for this user:
      
      Segment: ${segment.name}
      Performance: ${profile.performance.totalListings} listings, $${profile.performance.totalRevenue} revenue
      Goals: $${profile.goals.monthlyRevenue} monthly revenue, ${profile.goals.growthStrategy} strategy
      Marketplaces: ${profile.preferences.marketplaces.join(', ')}
      Categories: ${profile.preferences.categories.join(', ')}
      
      Provide 3-5 specific, actionable recommendations to help this user achieve their goals.
      `;

      const aiResponse = await aiService.generateRecommendations(prompt);
      return aiResponse.recommendations;
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
      return segment.recommendations;
    }
  }

  // Track user behavior
  async trackUserBehavior(userId: string, behavior: {
    action: string;
    feature: string;
    duration?: number;
    metadata?: any;
  }): Promise<void> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) return;

      // Update behavior data
      profile.behavior.lastActive = new Date();
      
      if (!profile.behavior.featuresUsed.includes(behavior.feature)) {
        profile.behavior.featuresUsed.push(behavior.feature);
      }

      // Update session duration
      if (behavior.duration) {
        profile.behavior.averageSessionDuration = 
          (profile.behavior.averageSessionDuration + behavior.duration) / 2;
      }

      this.userProfiles.set(userId, profile);
      
      // Recalculate segment if needed
      await this.recalculateUserSegment(userId);
    } catch (error) {
      console.error('Failed to track user behavior:', error);
    }
  }

  // Get user segments
  getUserSegments(): UserSegment[] {
    return this.userSegments;
  }

  // Get personalization analytics
  getPersonalizationAnalytics(): PersonalizationAnalytics | null {
    return this.analytics;
  }

  // Create personalized onboarding
  async createPersonalizedOnboarding(userId: string): Promise<any> {
    const profile = this.getUserProfile(userId);
    if (!profile) return null;

    const segment = this.userSegments.find(s => s.id === profile.segment);
    if (!segment) return null;

    return {
      welcomeMessage: `Welcome to OmniLister, ${profile.name}!`,
      segment: segment.name,
      recommendedSteps: [
        'Connect your first marketplace',
        'Create your first listing',
        'Set up automation rules',
        'Explore analytics dashboard',
      ],
      tips: segment.recommendations,
      features: this.getRecommendedFeatures(profile.segment),
    };
  }

  // Get recommended features for segment
  private getRecommendedFeatures(segment: string): string[] {
    const featureMap = {
      new_user: ['marketplace_connection', 'listing_creation', 'basic_analytics'],
      reseller: ['repricing', 'automation', 'profit_tracking'],
      business: ['team_management', 'advanced_analytics', 'api_access'],
      enterprise: ['white_label', 'custom_integrations', 'dedicated_support'],
    };

    return featureMap[segment] || [];
  }

  // A/B test content
  async abTestContent(userId: string, testId: string, variants: any[]): Promise<any> {
    // Simple A/B testing based on user ID hash
    const hash = this.hashUserId(userId + testId);
    const variantIndex = hash % variants.length;
    
    return variants[variantIndex];
  }

  // Hash user ID for A/B testing
  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const personalizationService = new PersonalizationService();
