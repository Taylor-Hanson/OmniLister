// A/B Testing Service - Framework for testing different versions

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  variants: ABTestVariant[];
  metrics: ABTestMetric[];
  targetAudience: {
    segments: string[];
    minUsers?: number;
    maxUsers?: number;
  };
  results?: ABTestResults;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of users (0-100)
  configuration: any;
  isControl: boolean;
}

export interface ABTestMetric {
  id: string;
  name: string;
  description: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'retention';
  target: number;
  primary: boolean;
}

export interface ABTestResults {
  totalUsers: number;
  variants: {
    variantId: string;
    users: number;
    conversions: number;
    conversionRate: number;
    confidence: number;
    significance: boolean;
  }[];
  winner?: string;
  confidence: number;
  statisticalSignificance: boolean;
}

export interface ABTestEvent {
  testId: string;
  variantId: string;
  userId: string;
  event: string;
  timestamp: Date;
  metadata?: any;
}

class ABTestingService {
  private tests: Map<string, ABTest> = new Map();
  private events: ABTestEvent[] = [];
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId

  // Initialize A/B testing service
  async initialize() {
    try {
      await this.loadDefaultTests();
      console.log('A/B testing service initialized');
    } catch (error) {
      console.error('Failed to initialize A/B testing service:', error);
    }
  }

  // Load default tests
  private async loadDefaultTests(): Promise<void> {
    const defaultTests: ABTest[] = [
      {
        id: 'onboarding_flow',
        name: 'Onboarding Flow Optimization',
        description: 'Test different onboarding flows to improve user activation',
        status: 'running',
        startDate: new Date('2024-01-01'),
        variants: [
          {
            id: 'control',
            name: 'Current Flow',
            description: 'Existing 4-step onboarding',
            weight: 50,
            configuration: {
              steps: 4,
              skipEnabled: true,
              progressBar: true,
            },
            isControl: true,
          },
          {
            id: 'simplified',
            name: 'Simplified Flow',
            description: '3-step onboarding with focus on value',
            weight: 50,
            configuration: {
              steps: 3,
              skipEnabled: false,
              progressBar: true,
              valueFocus: true,
            },
            isControl: false,
          },
        ],
        metrics: [
          {
            id: 'completion_rate',
            name: 'Onboarding Completion Rate',
            description: 'Percentage of users who complete onboarding',
            type: 'conversion',
            target: 80,
            primary: true,
          },
          {
            id: 'time_to_complete',
            name: 'Time to Complete',
            description: 'Average time to complete onboarding',
            type: 'engagement',
            target: 300, // seconds
            primary: false,
          },
        ],
        targetAudience: {
          segments: ['new_user'],
        },
      },
      {
        id: 'pricing_page',
        name: 'Pricing Page Optimization',
        description: 'Test different pricing page layouts and messaging',
        status: 'running',
        startDate: new Date('2024-01-15'),
        variants: [
          {
            id: 'control',
            name: 'Current Layout',
            description: 'Existing pricing page layout',
            weight: 50,
            configuration: {
              layout: 'grid',
              highlight: 'pro',
              guarantee: true,
            },
            isControl: true,
          },
          {
            id: 'value_focused',
            name: 'Value-Focused Layout',
            description: 'Emphasize value proposition and savings',
            weight: 50,
            configuration: {
              layout: 'comparison',
              highlight: 'savings',
              guarantee: true,
              competitorComparison: true,
            },
            isControl: false,
          },
        ],
        metrics: [
          {
            id: 'conversion_rate',
            name: 'Pricing Page Conversion',
            description: 'Percentage of users who subscribe',
            type: 'conversion',
            target: 15,
            primary: true,
          },
          {
            id: 'time_on_page',
            name: 'Time on Page',
            description: 'Average time spent on pricing page',
            type: 'engagement',
            target: 120, // seconds
            primary: false,
          },
        ],
        targetAudience: {
          segments: ['reseller', 'business'],
        },
      },
      {
        id: 'feature_discovery',
        name: 'Feature Discovery',
        description: 'Test different ways to surface new features',
        status: 'running',
        startDate: new Date('2024-02-01'),
        variants: [
          {
            id: 'control',
            name: 'Current Approach',
            description: 'Standard feature announcements',
            weight: 50,
            configuration: {
              method: 'announcement',
              frequency: 'weekly',
              placement: 'top',
            },
            isControl: true,
          },
          {
            id: 'contextual',
            name: 'Contextual Discovery',
            description: 'Show features based on user behavior',
            weight: 50,
            configuration: {
              method: 'contextual',
              frequency: 'real-time',
              placement: 'inline',
              personalization: true,
            },
            isControl: false,
          },
        ],
        metrics: [
          {
            id: 'feature_adoption',
            name: 'Feature Adoption Rate',
            description: 'Percentage of users who try new features',
            type: 'conversion',
            target: 25,
            primary: true,
          },
          {
            id: 'feature_usage',
            name: 'Feature Usage',
            description: 'Average usage of new features',
            type: 'engagement',
            target: 3, // times per week
            primary: false,
          },
        ],
        targetAudience: {
          segments: ['reseller', 'business', 'enterprise'],
        },
      },
    ];

    defaultTests.forEach(test => {
      this.tests.set(test.id, test);
    });
  }

  // Get user variant for test
  getUserVariant(testId: string, userId: string): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Check if user is already assigned
    const userTests = this.userAssignments.get(userId);
    if (userTests && userTests.has(testId)) {
      return userTests.get(testId)!;
    }

    // Assign user to variant based on weights
    const variant = this.assignUserToVariant(test, userId);
    
    // Store assignment
    if (!userTests) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(testId, variant.id);

    return variant.id;
  }

  // Assign user to variant
  private assignUserToVariant(test: ABTest, userId: string): ABTestVariant {
    // Use consistent hashing based on user ID and test ID
    const hash = this.hashUserId(userId + test.id);
    const random = hash % 100;
    
    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random < cumulativeWeight) {
        return variant;
      }
    }
    
    // Fallback to control variant
    return test.variants.find(v => v.isControl) || test.variants[0];
  }

  // Hash user ID for consistent assignment
  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Track A/B test event
  async trackEvent(testId: string, variantId: string, userId: string, event: string, metadata?: any): Promise<void> {
    try {
      const eventData: ABTestEvent = {
        testId,
        variantId,
        userId,
        event,
        timestamp: new Date(),
        metadata,
      };

      this.events.push(eventData);
      
      // Check if test should be completed
      await this.checkTestCompletion(testId);
    } catch (error) {
      console.error('Failed to track A/B test event:', error);
    }
  }

  // Check if test should be completed
  private async checkTestCompletion(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return;

    const testEvents = this.events.filter(e => e.testId === testId);
    const totalUsers = new Set(testEvents.map(e => e.userId)).size;

    // Complete test if we have enough users or time has passed
    if (totalUsers >= 1000 || (test.endDate && new Date() >= test.endDate)) {
      await this.completeTest(testId);
    }
  }

  // Complete A/B test
  private async completeTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) return;

    const results = await this.calculateTestResults(testId);
    test.results = results;
    test.status = 'completed';
    test.endDate = new Date();

    this.tests.set(testId, test);
    
    console.log(`A/B test ${testId} completed with results:`, results);
  }

  // Calculate test results
  private async calculateTestResults(testId: string): Promise<ABTestResults> {
    const test = this.tests.get(testId);
    if (!test) throw new Error('Test not found');

    const testEvents = this.events.filter(e => e.testId === testId);
    const totalUsers = new Set(testEvents.map(e => e.userId)).size;

    const variantResults = test.variants.map(variant => {
      const variantUsers = new Set(
        testEvents.filter(e => e.variantId === variant.id).map(e => e.userId)
      ).size;

      const conversions = testEvents.filter(
        e => e.variantId === variant.id && e.event === 'conversion'
      ).length;

      const conversionRate = variantUsers > 0 ? (conversions / variantUsers) * 100 : 0;
      const confidence = this.calculateConfidence(variantUsers, conversions);

      return {
        variantId: variant.id,
        users: variantUsers,
        conversions,
        conversionRate,
        confidence,
        significance: confidence >= 95,
      };
    });

    // Determine winner
    const winner = variantResults.reduce((prev, current) => 
      current.conversionRate > prev.conversionRate ? current : prev
    );

    const statisticalSignificance = winner.confidence >= 95;

    return {
      totalUsers,
      variants: variantResults,
      winner: statisticalSignificance ? winner.variantId : undefined,
      confidence: winner.confidence,
      statisticalSignificance,
    };
  }

  // Calculate confidence interval
  private calculateConfidence(users: number, conversions: number): number {
    if (users === 0) return 0;

    const p = conversions / users;
    const n = users;
    const z = 1.96; // 95% confidence interval

    const marginOfError = z * Math.sqrt((p * (1 - p)) / n);
    const confidence = (p - marginOfError) * 100;

    return Math.max(0, confidence);
  }

  // Get A/B test
  getTest(testId: string): ABTest | null {
    return this.tests.get(testId) || null;
  }

  // Get all tests
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  // Get running tests
  getRunningTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'running');
  }

  // Create new A/B test
  async createTest(test: Omit<ABTest, 'id' | 'results'>): Promise<string> {
    const testId = `test_${Date.now()}`;
    const newTest: ABTest = {
      ...test,
      id: testId,
    };

    this.tests.set(testId, newTest);
    return testId;
  }

  // Update A/B test
  async updateTest(testId: string, updates: Partial<ABTest>): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) return false;

    const updatedTest = { ...test, ...updates };
    this.tests.set(testId, updatedTest);
    return true;
  }

  // Start A/B test
  async startTest(testId: string): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) return false;

    test.status = 'running';
    test.startDate = new Date();
    this.tests.set(testId, test);
    return true;
  }

  // Pause A/B test
  async pauseTest(testId: string): Promise<boolean> {
    const test = this.tests.get(testId);
    if (!test) return false;

    test.status = 'paused';
    this.tests.set(testId, test);
    return true;
  }

  // Get test analytics
  getTestAnalytics(testId: string): any {
    const test = this.tests.get(testId);
    if (!test) return null;

    const testEvents = this.events.filter(e => e.testId === testId);
    const totalUsers = new Set(testEvents.map(e => e.userId)).size;

    const variantAnalytics = test.variants.map(variant => {
      const variantEvents = testEvents.filter(e => e.variantId === variant.id);
      const variantUsers = new Set(variantEvents.map(e => e.userId)).size;
      
      const eventsByType = variantEvents.reduce((acc, event) => {
        acc[event.event] = (acc[event.event] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        variantId: variant.id,
        variantName: variant.name,
        users: variantUsers,
        events: eventsByType,
        conversionRate: variantUsers > 0 ? ((eventsByType.conversion || 0) / variantUsers) * 100 : 0,
      };
    });

    return {
      testId,
      testName: test.name,
      status: test.status,
      totalUsers,
      variants: variantAnalytics,
      startDate: test.startDate,
      endDate: test.endDate,
    };
  }

  // Get user's test assignments
  getUserAssignments(userId: string): Map<string, string> {
    return this.userAssignments.get(userId) || new Map();
  }

  // Check if user is eligible for test
  isUserEligible(testId: string, userId: string, userSegment: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    // Check if user segment is targeted
    if (test.targetAudience.segments.length > 0 && 
        !test.targetAudience.segments.includes(userSegment)) {
      return false;
    }

    // Check user limits
    const testEvents = this.events.filter(e => e.testId === testId);
    const totalUsers = new Set(testEvents.map(e => e.userId)).size;

    if (test.targetAudience.maxUsers && totalUsers >= test.targetAudience.maxUsers) {
      return false;
    }

    return true;
  }
}

export const abTestingService = new ABTestingService();
