import {
  type AutomationRule,
  type InsertAutomationRule,
  type User,
  type AutomationLog
} from "../shared/schema.ts";
import { storage } from "../storage";
import { rateLimitService } from "./rateLimitService";
import { circuitBreakerService } from "./circuitBreakerService";

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: Date;
  suggestedDelay?: number;
}

export interface ActivityPattern {
  hour: number;
  activityLevel: number; // 0-100
}

export interface MarketplaceSafetyConfig {
  marketplace: string;
  dailyLimits: Record<string, number>;
  hourlyLimits: Record<string, number>;
  minDelaySeconds: Record<string, number>;
  maxDelaySeconds: Record<string, number>;
  blackoutHours: number[]; // Hours when automation should not run (0-23)
  maxConsecutiveActions: number;
  breakDurationSeconds: number;
}

export class AutomationSafetyService {
  private emergencyStop: boolean = false;
  private userActionCounters: Map<string, Map<string, { count: number; resetAt: Date }>> = new Map();
  private lastActionTimes: Map<string, Date> = new Map();
  private consecutiveActionCounts: Map<string, number> = new Map();

  // Default safety ruleConfigs per marketplace
  private readonly safetyConfigs: Record<string, MarketplaceSafetyConfig> = {
    poshmark: {
      marketplace: "poshmark",
      dailyLimits: {
        auto_share: 5000,
        auto_follow: 500,
        auto_unfollow: 500,
        auto_offer: 100,
        party_share: 200,
        bundle_offer: 50,
      },
      hourlyLimits: {
        auto_share: 500,
        auto_follow: 50,
        auto_unfollow: 50,
        auto_offer: 20,
        party_share: 100,
        bundle_offer: 10,
      },
      minDelaySeconds: {
        auto_share: 3,
        auto_follow: 5,
        auto_unfollow: 3,
        auto_offer: 10,
        party_share: 2,
        bundle_offer: 15,
      },
      maxDelaySeconds: {
        auto_share: 10,
        auto_follow: 15,
        auto_unfollow: 8,
        auto_offer: 25,
        party_share: 5,
        bundle_offer: 30,
      },
      blackoutHours: [1, 2, 3, 4, 5], // 1 AM - 5 AM
      maxConsecutiveActions: 30,
      breakDurationSeconds: 60,
    },
    mercari: {
      marketplace: "mercari",
      dailyLimits: {
        auto_share: 1000,
        auto_follow: 200,
        auto_offer: 50,
      },
      hourlyLimits: {
        auto_share: 100,
        auto_follow: 20,
        auto_offer: 10,
      },
      minDelaySeconds: {
        auto_share: 5,
        auto_follow: 8,
        auto_offer: 15,
      },
      maxDelaySeconds: {
        auto_share: 15,
        auto_follow: 20,
        auto_offer: 30,
      },
      blackoutHours: [2, 3, 4, 5],
      maxConsecutiveActions: 20,
      breakDurationSeconds: 90,
    },
    depop: {
      marketplace: "depop",
      dailyLimits: {
        auto_share: 500,
        auto_follow: 150,
        auto_offer: 30,
      },
      hourlyLimits: {
        auto_share: 50,
        auto_follow: 15,
        auto_offer: 5,
      },
      minDelaySeconds: {
        auto_share: 8,
        auto_follow: 10,
        auto_offer: 20,
      },
      maxDelaySeconds: {
        auto_share: 20,
        auto_follow: 25,
        auto_offer: 40,
      },
      blackoutHours: [1, 2, 3, 4, 5, 6],
      maxConsecutiveActions: 15,
      breakDurationSeconds: 120,
    },
  };

  // Human-like activity patterns (hour -> activity level)
  private readonly activityPatterns: ActivityPattern[] = [
    { hour: 0, activityLevel: 10 },
    { hour: 1, activityLevel: 5 },
    { hour: 2, activityLevel: 3 },
    { hour: 3, activityLevel: 2 },
    { hour: 4, activityLevel: 2 },
    { hour: 5, activityLevel: 5 },
    { hour: 6, activityLevel: 15 },
    { hour: 7, activityLevel: 30 },
    { hour: 8, activityLevel: 50 },
    { hour: 9, activityLevel: 70 },
    { hour: 10, activityLevel: 80 },
    { hour: 11, activityLevel: 85 },
    { hour: 12, activityLevel: 75 },
    { hour: 13, activityLevel: 80 },
    { hour: 14, activityLevel: 85 },
    { hour: 15, activityLevel: 90 },
    { hour: 16, activityLevel: 85 },
    { hour: 17, activityLevel: 80 },
    { hour: 18, activityLevel: 75 },
    { hour: 19, activityLevel: 70 },
    { hour: 20, activityLevel: 65 },
    { hour: 21, activityLevel: 55 },
    { hour: 22, activityLevel: 35 },
    { hour: 23, activityLevel: 20 },
  ];

  /**
   * Validate rule creation
   */
  async validateRuleCreation(
    rule: InsertAutomationRule,
    user: User
  ): Promise<SafetyCheckResult> {
    // Check if marketplace is supported
    if (!this.safetyConfigs[rule.marketplace]) {
      return {
        allowed: false,
        reason: `Automation not supported for marketplace: ${rule.marketplace}`,
      };
    }

    // Check user plan limits
    const planCheck = await this.checkUserPlanLimits(user, rule);
    if (!planCheck.allowed) {
      return planCheck;
    }

    // Check if rule ruleConfig is safe
    const configCheck = this.validateRuleConfiguration(rule);
    if (!configCheck.allowed) {
      return configCheck;
    }

    // Check for duplicate rules
    const duplicateCheck = await this.checkForDuplicateRule(user.id, rule);
    if (!duplicateCheck.allowed) {
      return duplicateCheck;
    }

    return { allowed: true };
  }

  /**
   * Validate rule update
   */
  async validateRuleUpdate(
    existingRule: AutomationRule,
    updates: Partial<AutomationRule>
  ): Promise<SafetyCheckResult> {
    // Don't allow changing marketplace
    if (updates.marketplace && updates.marketplace !== existingRule.marketplace) {
      return {
        allowed: false,
        reason: "Cannot change marketplace for existing rule",
      };
    }

    // Validate new ruleConfig if provided
    if (updates.ruleConfig) {
      const configCheck = this.validateRuleConfiguration({
        ...existingRule,
        ruleConfig: updates.ruleConfig,
      });
      if (!configCheck.allowed) {
        return configCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * Check if automation execution is safe
   */
  async checkExecutionSafety(
    rule: AutomationRule,
    user: User
  ): Promise<SafetyCheckResult> {
    // Check emergency stop
    if (this.emergencyStop) {
      return {
        allowed: false,
        reason: "Emergency stop is active",
      };
    }

    // Check blackout hours
    const blackoutCheck = this.checkBlackoutHours(rule);
    if (!blackoutCheck.allowed) {
      return blackoutCheck;
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimits(rule, user);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck;
    }

    // Check daily/hourly limits
    const limitsCheck = await this.checkActionLimits(rule, user);
    if (!limitsCheck.allowed) {
      return limitsCheck;
    }

    // Check consecutive actions
    const consecutiveCheck = this.checkConsecutiveActions(rule, user);
    if (!consecutiveCheck.allowed) {
      return consecutiveCheck;
    }

    // Check circuit breaker
    const circuitBreakerState = await circuitBreakerService.getState(rule.marketplace);
    if (circuitBreakerState === "open") {
      return {
        allowed: false,
        reason: "Circuit breaker is open for this marketplace",
        retryAfter: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    }

    return { allowed: true };
  }

  /**
   * Get human-like delay for an action
   */
  async getHumanLikeDelay(actionType: string, marketplace: string = "poshmark"): Promise<number> {
    const config = this.safetyConfigs[marketplace];
    if (!config) return 5000; // Default 5 seconds

    const minDelay = (config.minDelaySeconds[actionType] || 5) * 1000;
    const maxDelay = (config.maxDelaySeconds[actionType] || 15) * 1000;

    // Base delay with randomization
    let delay = Math.random() * (maxDelay - minDelay) + minDelay;

    // Add jitter based on time of day
    const hour = new Date().getHours();
    const activityLevel = this.activityPatterns.find(p => p.hour === hour)?.activityLevel || 50;
    
    // Lower activity = longer delays
    const activityMultiplier = 2 - (activityLevel / 100); // 1.0 to 2.0
    delay *= activityMultiplier;

    // Add random micro-variations
    const jitter = (Math.random() - 0.5) * 2000; // +/- 1 second
    delay += jitter;

    // Add fatigue factor (longer delays over time)
    const fatigueKey = `fatigue_${marketplace}_${actionType}`;
    const lastAction = this.lastActionTimes.get(fatigueKey);
    if (lastAction) {
      const timeSinceLastAction = Date.now() - lastAction.getTime();
      if (timeSinceLastAction < 60000) { // Within last minute
        delay *= 1.2; // 20% longer delay
      }
    }
    this.lastActionTimes.set(fatigueKey, new Date());

    // Ensure minimum delay
    return Math.max(2000, Math.round(delay));
  }

  /**
   * Check if user plan allows this automation
   */
  private async checkUserPlanLimits(
    user: User,
    rule: InsertAutomationRule
  ): Promise<SafetyCheckResult> {
    // Check plan-based limits
    const planLimits = this.getPlanLimits(user.plan);
    
    // Count existing rules
    const existingRules = await storage.getUserAutomationRules(user.id);
    const activeRules = existingRules.filter(r => r.isEnabled).length;

    if (activeRules >= planLimits.maxActiveRules) {
      return {
        allowed: false,
        reason: `Your ${user.plan} plan allows maximum ${planLimits.maxActiveRules} active automation rules`,
      };
    }

    // Check if action type is allowed for plan
    if (!this.isActionAllowedForPlan(rule.ruleType, user.plan)) {
      return {
        allowed: false,
        reason: `${rule.ruleType} automation requires a higher plan`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate rule ruleConfig
   */
  private validateRuleConfiguration(
    rule: InsertAutomationRule | AutomationRule
  ): SafetyCheckResult {
    const config = rule.ruleConfig as any;
    const safetyConfig = this.safetyConfigs[rule.marketplace];

    if (!safetyConfig) {
      return {
        allowed: false,
        reason: "Invalid marketplace",
      };
    }

    // Check if limits are reasonable
    const dailyLimit = safetyConfig.dailyLimits[rule.ruleType];
    if (config.maxItems && config.maxItems > dailyLimit) {
      return {
        allowed: false,
        reason: `Maximum items cannot exceed daily limit of ${dailyLimit}`,
      };
    }

    // Validate delay settings if provided
    if (config.minDelay && config.minDelay < safetyConfig.minDelaySeconds[rule.ruleType]) {
      return {
        allowed: false,
        reason: `Minimum delay must be at least ${safetyConfig.minDelaySeconds[rule.ruleType]} seconds`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check for duplicate rules
   */
  private async checkForDuplicateRule(
    userId: string,
    rule: InsertAutomationRule
  ): Promise<SafetyCheckResult> {
    const existingRules = await storage.getUserAutomationRules(userId);
    
    const duplicate = existingRules.find(
      r => r.marketplace === rule.marketplace && 
           r.ruleType === rule.ruleType &&
           r.isEnabled
    );

    if (duplicate) {
      return {
        allowed: false,
        reason: `You already have an active ${rule.ruleType} rule for ${rule.marketplace}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check blackout hours
   */
  private checkBlackoutHours(rule: AutomationRule): SafetyCheckResult {
    const config = this.safetyConfigs[rule.marketplace];
    if (!config) return { allowed: true };

    const currentHour = new Date().getHours();
    
    // Check marketplace blackout hours
    if (config.blackoutHours.includes(currentHour)) {
      const nextAvailableHour = config.blackoutHours.reduce((next, hour) => {
        if (hour > currentHour) return Math.min(next, hour);
        return next;
      }, 24);

      const retryAfter = new Date();
      retryAfter.setHours(nextAvailableHour, 0, 0, 0);
      if (nextAvailableHour < currentHour) {
        retryAfter.setDate(retryAfter.getDate() + 1);
      }

      return {
        allowed: false,
        reason: "Automation paused during blackout hours",
        retryAfter,
      };
    }

    // Check user-defined blackout dates
    if (rule.blackoutDates && Array.isArray(rule.blackoutDates)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (const blackoutDate of rule.blackoutDates) {
        const date = new Date(blackoutDate);
        date.setHours(0, 0, 0, 0);
        
        if (date.getTime() === today.getTime()) {
          return {
            allowed: false,
            reason: "Automation paused for user-defined blackout date",
            retryAfter: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Check rate limits
   */
  private async checkRateLimits(
    rule: AutomationRule,
    user: User
  ): Promise<SafetyCheckResult> {
    const rateLimitCheck = await rateLimitService.checkRateLimit(rule.marketplace, user.id);
    
    if (!rateLimitCheck.allowed) {
      return {
        allowed: false,
        reason: rateLimitCheck.reasoning,
        retryAfter: new Date(Date.now() + (rateLimitCheck.waitTime || 60000)),
      };
    }

    return { allowed: true };
  }

  /**
   * Check daily and hourly action limits
   */
  private async checkActionLimits(
    rule: AutomationRule,
    user: User
  ): Promise<SafetyCheckResult> {
    const config = this.safetyConfigs[rule.marketplace];
    if (!config) return { allowed: true };

    const userKey = `${user.id}_${rule.marketplace}`;
    
    // Initialize counters if not exists
    if (!this.userActionCounters.has(userKey)) {
      this.userActionCounters.set(userKey, new Map());
    }
    
    const counters = this.userActionCounters.get(userKey)!;

    // Check hourly limit
    const hourlyKey = `${rule.ruleType}_hourly`;
    const hourlyCounter = counters.get(hourlyKey);
    const hourlyLimit = config.hourlyLimits[rule.ruleType] || 100;

    if (hourlyCounter && hourlyCounter.resetAt > new Date()) {
      if (hourlyCounter.count >= hourlyLimit) {
        return {
          allowed: false,
          reason: `Hourly limit reached (${hourlyLimit} ${rule.ruleType} actions)`,
          retryAfter: hourlyCounter.resetAt,
        };
      }
    } else {
      // Reset hourly counter
      counters.set(hourlyKey, {
        count: 0,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    }

    // Check daily limit
    const dailyKey = `${rule.ruleType}_daily`;
    const dailyCounter = counters.get(dailyKey);
    const dailyLimit = config.dailyLimits[rule.ruleType] || 1000;

    if (dailyCounter && dailyCounter.resetAt > new Date()) {
      if (dailyCounter.count >= dailyLimit) {
        return {
          allowed: false,
          reason: `Daily limit reached (${dailyLimit} ${rule.ruleType} actions)`,
          retryAfter: dailyCounter.resetAt,
        };
      }
    } else {
      // Reset daily counter
      const resetAt = new Date();
      resetAt.setHours(0, 0, 0, 0);
      resetAt.setDate(resetAt.getDate() + 1);
      
      counters.set(dailyKey, {
        count: 0,
        resetAt,
      });
    }

    return { allowed: true };
  }

  /**
   * Check consecutive actions and enforce breaks
   */
  private checkConsecutiveActions(
    rule: AutomationRule,
    user: User
  ): SafetyCheckResult {
    const config = this.safetyConfigs[rule.marketplace];
    if (!config) return { allowed: true };

    const key = `${user.id}_${rule.marketplace}`;
    const consecutiveCount = this.consecutiveActionCounts.get(key) || 0;

    if (consecutiveCount >= config.maxConsecutiveActions) {
      // Force a break
      const breakUntil = new Date(Date.now() + config.breakDurationSeconds * 1000);
      
      // Reset counter after break
      setTimeout(() => {
        this.consecutiveActionCounts.delete(key);
      }, config.breakDurationSeconds * 1000);

      return {
        allowed: false,
        reason: `Taking a break after ${consecutiveCount} consecutive actions`,
        retryAfter: breakUntil,
        suggestedDelay: config.breakDurationSeconds * 1000,
      };
    }

    // Increment counter
    this.consecutiveActionCounts.set(key, consecutiveCount + 1);

    return { allowed: true };
  }

  /**
   * Increment action counters after successful execution
   */
  async incrementActionCounters(
    userId: string,
    marketplace: string,
    actionType: string
  ): Promise<void> {
    const userKey = `${userId}_${marketplace}`;
    
    if (!this.userActionCounters.has(userKey)) {
      this.userActionCounters.set(userKey, new Map());
    }
    
    const counters = this.userActionCounters.get(userKey)!;

    // Increment hourly counter
    const hourlyKey = `${actionType}_hourly`;
    const hourlyCounter = counters.get(hourlyKey);
    if (hourlyCounter && hourlyCounter.resetAt > new Date()) {
      hourlyCounter.count++;
    }

    // Increment daily counter
    const dailyKey = `${actionType}_daily`;
    const dailyCounter = counters.get(dailyKey);
    if (dailyCounter && dailyCounter.resetAt > new Date()) {
      dailyCounter.count++;
    }
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: string): {
    maxActiveRules: number;
    allowedActionTypes: string[];
  } {
    switch (plan) {
      case "free":
        return {
          maxActiveRules: 1,
          allowedActionTypes: ["auto_share"],
        };
      case "starter":
        return {
          maxActiveRules: 3,
          allowedActionTypes: ["auto_share", "auto_follow"],
        };
      case "growth":
        return {
          maxActiveRules: 5,
          allowedActionTypes: ["auto_share", "auto_follow", "auto_unfollow", "auto_offer"],
        };
      case "professional":
        return {
          maxActiveRules: 10,
          allowedActionTypes: ["auto_share", "auto_follow", "auto_unfollow", "auto_offer", "party_share", "bundle_offer"],
        };
      case "unlimited":
        return {
          maxActiveRules: 999,
          allowedActionTypes: ["auto_share", "auto_follow", "auto_unfollow", "auto_offer", "party_share", "bundle_offer"],
        };
      default:
        return {
          maxActiveRules: 1,
          allowedActionTypes: ["auto_share"],
        };
    }
  }

  /**
   * Check if action is allowed for plan
   */
  private isActionAllowedForPlan(actionType: string, plan: string): boolean {
    const planLimits = this.getPlanLimits(plan);
    return planLimits.allowedActionTypes.includes(actionType);
  }

  /**
   * Activate emergency stop
   */
  activateEmergencyStop(): void {
    this.emergencyStop = true;
    console.log("[AutomationSafety] Emergency stop activated");
  }

  /**
   * Deactivate emergency stop
   */
  deactivateEmergencyStop(): void {
    this.emergencyStop = false;
    console.log("[AutomationSafety] Emergency stop deactivated");
  }

  /**
   * Reset all counters for a user
   */
  resetUserCounters(userId: string): void {
    // Clear all counters for user
    for (const [key] of Array.from(this.userActionCounters.entries())) {
      if (key.startsWith(userId)) {
        this.userActionCounters.delete(key);
      }
    }
    
    for (const [key] of Array.from(this.consecutiveActionCounts.entries())) {
      if (key.startsWith(userId)) {
        this.consecutiveActionCounts.delete(key);
      }
    }
  }
}

// Export singleton instance
export const automationSafetyService = new AutomationSafetyService();