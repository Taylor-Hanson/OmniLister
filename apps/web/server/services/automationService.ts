import { 
  type AutomationRule, type InsertAutomationRule,
  type AutomationSchedule, type InsertAutomationSchedule,
  type AutomationLog, type InsertAutomationLog,
  type User
} from "../shared/schema.ts";
import { storage } from "../storage";
import { poshmarkAutomationEngine } from "./poshmarkAutomationEngine";
import { mercariAutomationEngine } from "./mercariAutomationEngine";
import { depopAutomationEngine } from "./depopAutomationEngine";
import { grailedAutomationEngine } from "./grailedAutomationEngine";
import { automationSafetyService } from "./automationSafetyService";
import { automationSchedulerService } from "./automationSchedulerService";
import { queueService } from "./queueService";

export interface MarketplaceAutomationEngine {
  marketplace: string;
  executeAutomation(rule: AutomationRule, user: User): Promise<void>;
  validateRule(rule: AutomationRule): Promise<boolean>;
  getAvailableActions(): string[];
  getDefaultConfig(actionType: string): any;
}

export interface AutomationExecutionResult {
  success: boolean;
  executionId: string;
  itemsProcessed: number;
  itemsFailed?: number;
  errors?: string[];
  nextScheduledRun?: Date;
  metrics?: {
    duration: number;
    rateLimitHits: number;
    apiCalls: number;
  };
}

export class AutomationService {
  private engines: Map<string, MarketplaceAutomationEngine> = new Map();
  private activeAutomations: Map<string, NodeJS.Timer> = new Map();
  private emergencyStopFlag: boolean = false;

  constructor() {
    // Register marketplace-specific engines
    this.registerEngine("poshmark", poshmarkAutomationEngine);
    this.registerEngine("mercari", mercariAutomationEngine);
    this.registerEngine("depop", depopAutomationEngine);
    this.registerEngine("grailed", grailedAutomationEngine);
    
    // Initialize scheduled automation check every minute
    setInterval(() => this.checkScheduledAutomations(), 60000);
  }

  /**
   * Register a marketplace automation engine
   */
  registerEngine(marketplace: string, engine: MarketplaceAutomationEngine): void {
    this.engines.set(marketplace, engine);
    console.log(`[AutomationService] Registered engine for ${marketplace}`);
  }

  /**
   * Create a new automation rule
   */
  async createAutomationRule(
    userId: string,
    rule: InsertAutomationRule
  ): Promise<AutomationRule> {
    // Validate rule with marketplace engine
    const engine = this.engines.get(rule.marketplace);
    if (!engine) {
      throw new Error(`No automation engine available for ${rule.marketplace}`);
    }

    // Check if user has permissions for this automation type
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate with safety service
    const safetyCheck = await automationSafetyService.validateRuleCreation(rule, user);
    if (!safetyCheck.allowed) {
      throw new Error(`Rule creation denied: ${safetyCheck.reason}`);
    }

    // Create the rule
    const createdRule = await storage.createAutomationRule(userId, rule);

    // Create default schedule if requested
    if (rule.isEnabled) {
      await this.createDefaultSchedule(createdRule);
    }

    // Log creation
    await this.logAutomation(userId, createdRule.id, "rule_created", "success", {
      ruleName: createdRule.ruleName,
      ruleType: createdRule.ruleType,
    });

    return createdRule;
  }

  /**
   * Update an existing automation rule
   */
  async updateAutomationRule(
    ruleId: string,
    updates: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    const existingRule = await storage.getAutomationRule(ruleId);
    if (!existingRule) {
      throw new Error("Automation rule not found");
    }

    // Validate updates with safety service
    const safetyCheck = await automationSafetyService.validateRuleUpdate(existingRule, updates);
    if (!safetyCheck.allowed) {
      throw new Error(`Rule update denied: ${safetyCheck.reason}`);
    }

    // Update the rule
    const updatedRule = await storage.updateAutomationRule(ruleId, updates);

    // Handle enable/disable state changes
    if (updates.isEnabled !== undefined) {
      if (updates.isEnabled) {
        await this.enableAutomation(updatedRule);
      } else {
        await this.disableAutomation(updatedRule);
      }
    }

    // Log update
    await this.logAutomation(existingRule.userId, ruleId, "rule_updated", "success", {
      updates,
    });

    return updatedRule;
  }

  /**
   * Execute an automation rule
   */
  async executeAutomation(
    ruleId: string,
    triggeredBy: "manual" | "scheduled" | "event" = "manual"
  ): Promise<AutomationExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Check emergency stop
      if (this.emergencyStopFlag) {
        throw new Error("Emergency stop is active");
      }

      // Get rule and user
      const rule = await storage.getAutomationRule(ruleId);
      if (!rule || !rule.isEnabled) {
        throw new Error("Rule not found or disabled");
      }

      const user = await storage.getUser(rule.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check rate limits and safety
      const safetyCheck = await automationSafetyService.checkExecutionSafety(rule, user);
      if (!safetyCheck.allowed) {
        await this.logAutomation(rule.userId, ruleId, rule.ruleType, "rate_limited", {
          reason: safetyCheck.reason,
          retryAfter: safetyCheck.retryAfter,
        });
        
        throw new Error(`Execution blocked: ${safetyCheck.reason}`);
      }

      // Get marketplace engine
      const engine = this.engines.get(rule.marketplace);
      if (!engine) {
        throw new Error(`No engine for marketplace: ${rule.marketplace}`);
      }

      // Apply pre-execution delay for human-like behavior
      const delay = await automationSafetyService.getHumanLikeDelay(rule.ruleType);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Execute automation
      await engine.executeAutomation(rule, user);

      // Update rule execution stats
      await storage.updateAutomationRule(ruleId, {
        totalExecutions: (rule.totalExecutions || 0) + 1,
        successfulExecutions: (rule.successfulExecutions || 0) + 1,
        lastExecutedAt: new Date(),
      });

      // Calculate next scheduled run if applicable
      const nextRun = await automationSchedulerService.calculateNextRun(rule);

      // Log success
      await this.logAutomation(rule.userId, ruleId, rule.ruleType, "success", {
        executionId,
        triggeredBy,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        executionId,
        itemsProcessed: 1, // Will be updated by specific engines
        nextScheduledRun: nextRun || undefined,
        metrics: {
          duration: Date.now() - startTime,
          rateLimitHits: 0,
          apiCalls: 0,
        },
      };

    } catch (error) {
      // Log failure
      const rule = await storage.getAutomationRule(ruleId);
      if (rule) {
        await storage.updateAutomationRule(ruleId, {
          failedExecutions: (rule.failedExecutions || 0) + 1,
          lastExecutedAt: new Date(),
          lastError: error instanceof Error ? error.message : String(error),
        });

        await this.logAutomation(rule.userId, ruleId, rule.ruleType, "failed", {
          executionId,
          error: error instanceof Error ? error.message : String(error),
          triggeredBy,
        });
      }

      return {
        success: false,
        executionId,
        itemsProcessed: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        metrics: {
          duration: Date.now() - startTime,
          rateLimitHits: 0,
          apiCalls: 0,
        },
      };
    }
  }

  /**
   * Enable an automation rule
   */
  private async enableAutomation(rule: AutomationRule): Promise<void> {
    // Create schedule if it doesn't exist
    const schedules = await storage.getAutomationSchedules(rule.id);
    if (schedules.length === 0) {
      await this.createDefaultSchedule(rule);
    }

    // Activate schedules
    await automationSchedulerService.activateSchedule(rule.id);
  }

  /**
   * Disable an automation rule
   */
  private async disableAutomation(rule: AutomationRule): Promise<void> {
    // Deactivate schedules
    await automationSchedulerService.deactivateSchedule(rule.id);
    
    // Clear any active timers
    const timerKey = `${rule.id}`;
    if (this.activeAutomations.has(timerKey)) {
      clearInterval(this.activeAutomations.get(timerKey) as any);
      this.activeAutomations.delete(timerKey);
    }
  }

  /**
   * Create default schedule for a rule
   */
  private async createDefaultSchedule(rule: AutomationRule): Promise<void> {
    // Determine schedule type based on rule type
    let scheduleConfig: InsertAutomationSchedule = {
      ruleId: rule.id,
      scheduleType: "interval",
      scheduleExpression: "0 */4 * * *", // Every 4 hours by default
      isActive: true,
      timezone: "UTC",
    };

    // Customize based on rule type
    switch (rule.ruleType) {
      case "auto_share":
        scheduleConfig.scheduleExpression = "0 8,12,16,20 * * *"; // 4 times a day
        break;
      case "auto_follow":
        scheduleConfig.scheduleExpression = "0 */6 * * *"; // Every 6 hours
        break;
      case "auto_offer":
        scheduleConfig.scheduleExpression = "0 10 * * *"; // Once daily at 10 AM
        break;
      case "auto_bump":
        scheduleConfig.scheduleExpression = "0 */2 * * *"; // Every 2 hours
        break;
      case "bundle_offer":
        scheduleConfig.scheduleType = "continuous";
        // scheduleConfig.intervalSeconds = 1800; // Every 30 minutes - not in schema
        break;
    }

    await storage.createAutomationSchedule(scheduleConfig);
  }

  /**
   * Check and execute scheduled automations
   */
  private async checkScheduledAutomations(): Promise<void> {
    if (this.emergencyStopFlag) {
      return;
    }

    try {
      const dueAutomations = await automationSchedulerService.getDueAutomations();
      
      for (const schedule of dueAutomations) {
        // Queue the automation for execution
        // await queueService.createJob({
        //   userId: schedule.rule.userId,
        //   type: "automation_execute",
        //   status: "pending",
        //   data: {
        //     ruleId: schedule.ruleId,
        //     scheduleId: schedule.id,
        //     triggeredBy: "scheduled",
        //   },
        //   priority: schedule.priority,
        //   scheduledFor: new Date(),
        // });
        console.log(`[AutomationService] Would queue automation for rule ${schedule.rule.id}`);
      }
    } catch (error) {
      console.error("[AutomationService] Error checking scheduled automations:", error);
    }
  }

  /**
   * Emergency stop all automations
   */
  async emergencyStop(reason: string): Promise<void> {
    console.log(`[AutomationService] EMERGENCY STOP triggered: ${reason}`);
    this.emergencyStopFlag = true;

    // Clear all active timers
    for (const [key, timer] of Array.from(this.activeAutomations.entries())) {
      clearInterval(timer as any);
      this.activeAutomations.delete(key);
    }

    // Deactivate all schedules
    await automationSchedulerService.deactivateAllSchedules();

    // Log emergency stop
    await storage.createAuditLog({
      userId: "system",
      action: "emergency_stop",
      entityType: "automation",
      entityId: "all",
      metadata: { reason },
      ipAddress: null,
      userAgent: null,
    });
  }

  /**
   * Resume automations after emergency stop
   */
  async resumeAutomations(): Promise<void> {
    console.log("[AutomationService] Resuming automations");
    this.emergencyStopFlag = false;

    // Reactivate schedules
    await automationSchedulerService.reactivateAllSchedules();

    // Log resume
    await storage.createAuditLog({
      userId: "system",
      action: "automation_resumed",
      entityType: "automation",
      entityId: "all",
      metadata: {},
      ipAddress: null,
      userAgent: null,
    });
  }

  /**
   * Get automation status for a user
   */
  async getUserAutomationStatus(userId: string): Promise<{
    activeRules: number;
    totalExecutions: number;
    successRate: number;
    nextScheduledRuns: Array<{ ruleId: string; ruleName: string; nextRun: Date }>;
  }> {
    const rules = await storage.getUserAutomationRules(userId);
    const activeRules = rules.filter(r => r.isEnabled).length;
    
    let totalExecutions = 0;
    let successfulExecutions = 0;
    const nextRuns = [];

    for (const rule of rules) {
      totalExecutions += rule.totalExecutions || 0;
      successfulExecutions += rule.successfulExecutions || 0;

      if (rule.isEnabled) {
        const nextRun = await automationSchedulerService.calculateNextRun(rule);
        if (nextRun) {
          nextRuns.push({
            ruleId: rule.id,
            ruleName: rule.ruleName,
            nextRun,
          });
        }
      }
    }

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      activeRules,
      totalExecutions,
      successRate: Math.round(successRate * 100) / 100,
      nextScheduledRuns: nextRuns.sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime()),
    };
  }

  /**
   * Log automation activity
   */
  private async logAutomation(
    userId: string,
    ruleId: string | null,
    actionType: string,
    status: string,
    details: any
  ): Promise<void> {
    try {
      await storage.createAutomationLog({
        userId,
        ruleId,
        scheduleId: details.scheduleId || null,
        actionType,
        marketplace: details.marketplace || "system",
        status,
        // targetItems: details.targetItems || [], // Not in schema
        // processedItems: details.processedItems || 0, // Not in schema
        // successCount: status === "success" ? 1 : 0, // Not in schema
        // failureCount: status === "failed" ? 1 : 0, // Not in schema
        errorMessage: details.error || null,
        errorDetails: details.errorDetails || null,
        executionTime: details.duration || 0,
        // metadata: details, // Not in schema
      });
    } catch (error) {
      console.error("[AutomationService] Failed to log automation:", error);
    }
  }

  /**
   * Get available automation types for a marketplace
   */
  getAvailableAutomations(marketplace: string): string[] {
    const engine = this.engines.get(marketplace);
    return engine ? engine.getAvailableActions() : [];
  }

  /**
   * Get default configuration for an automation type
   */
  getDefaultAutomationConfig(marketplace: string, actionType: string): any {
    const engine = this.engines.get(marketplace);
    return engine ? engine.getDefaultConfig(actionType) : {};
  }

  /**
   * Get marketplace automation engine
   */
  getEngine(marketplace: string): MarketplaceAutomationEngine | undefined {
    return this.engines.get(marketplace);
  }

  /**
   * Get list of supported marketplaces with automation
   */
  getSupportedMarketplaces(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Validate if marketplace supports automation
   */
  supportsAutomation(marketplace: string): boolean {
    return this.engines.has(marketplace);
  }
}

// Export singleton instance
export const automationService = new AutomationService();