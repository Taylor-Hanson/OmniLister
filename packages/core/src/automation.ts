import { AutomationRuleType, TriggerType, DayOfWeek } from './types';
import { AUTOMATION_LIMITS } from './constants';

export interface AutomationRule {
  id: string;
  userId: string;
  marketplace: string;
  ruleType: AutomationRuleType;
  ruleName: string;
  description?: string;
  isEnabled: boolean;
  priority: number;
  ruleConfig: Record<string, any>;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  actionConfig: Record<string, any>;
  targetCriteria: Record<string, any>;
  dailyLimit?: number;
  hourlyLimit?: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  humanizeActions: boolean;
  activeHours?: Array<{ start: string; end: string; timezone: string }>;
  activeDays?: DayOfWeek[];
  createdAt: number;
  updatedAt: number;
}

export interface AutomationSchedule {
  id: string;
  ruleId: string;
  scheduleType: 'cron' | 'interval' | 'time_of_day' | 'continuous';
  scheduleExpression?: string;
  intervalMinutes?: number;
  specificTimes?: string[];
  timezone: string;
  startDate?: number;
  endDate?: number;
  maxExecutions?: number;
  executionCount: number;
  isActive: boolean;
  isPaused: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AutomationLog {
  id: string;
  userId: string;
  ruleId?: string;
  scheduleId?: string;
  actionType: string;
  marketplace: string;
  status: 'success' | 'failed' | 'partial' | 'skipped' | 'rate_limited';
  targetType?: string;
  targetId?: string;
  targetDetails?: Record<string, any>;
  actionDetails?: Record<string, any>;
  triggerSource: 'scheduled' | 'manual' | 'event' | 'api';
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  executionTime?: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  retryAttempt: number;
  executedAt: number;
}

export class AutomationEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private schedules: Map<string, AutomationSchedule> = new Map();
  private logs: AutomationLog[] = [];

  constructor() {}

  /**
   * Add automation rule
   */
  addRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove automation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    // Remove associated schedules
    for (const [scheduleId, schedule] of this.schedules) {
      if (schedule.ruleId === ruleId) {
        this.schedules.delete(scheduleId);
      }
    }
  }

  /**
   * Get automation rule
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules for user
   */
  getUserRules(userId: string): AutomationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.userId === userId);
  }

  /**
   * Get rules for marketplace
   */
  getMarketplaceRules(marketplace: string): AutomationRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.marketplace === marketplace && rule.isEnabled
    );
  }

  /**
   * Add automation schedule
   */
  addSchedule(schedule: AutomationSchedule): void {
    this.schedules.set(schedule.id, schedule);
  }

  /**
   * Remove automation schedule
   */
  removeSchedule(scheduleId: string): void {
    this.schedules.delete(scheduleId);
  }

  /**
   * Get automation schedule
   */
  getSchedule(scheduleId: string): AutomationSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Get schedules for rule
   */
  getRuleSchedules(ruleId: string): AutomationSchedule[] {
    return Array.from(this.schedules.values()).filter(schedule => schedule.ruleId === ruleId);
  }

  /**
   * Get active schedules
   */
  getActiveSchedules(): AutomationSchedule[] {
    return Array.from(this.schedules.values()).filter(schedule => 
      schedule.isActive && !schedule.isPaused
    );
  }

  /**
   * Execute automation rule
   */
  async executeRule(ruleId: string, context: Record<string, any> = {}): Promise<AutomationLog> {
    const rule = this.getRule(ruleId);
    if (!rule) {
      throw new Error(`Automation rule not found: ${ruleId}`);
    }

    if (!rule.isEnabled) {
      throw new Error(`Automation rule is disabled: ${ruleId}`);
    }

    const startTime = Date.now();
    const log: AutomationLog = {
      id: this.generateId(),
      userId: rule.userId,
      ruleId: rule.id,
      actionType: rule.ruleType,
      marketplace: rule.marketplace,
      status: 'success',
      triggerSource: 'manual',
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: 0,
      retryAttempt: 0,
      executedAt: startTime
    };

    try {
      // Check rate limits
      if (!this.checkRateLimits(rule)) {
        log.status = 'rate_limited';
        log.errorMessage = 'Rate limit exceeded';
        this.addLog(log);
        return log;
      }

      // Execute rule-specific logic
      const result = await this.executeRuleAction(rule, context);
      
      log.itemsProcessed = result.itemsProcessed;
      log.itemsSucceeded = result.itemsSucceeded;
      log.itemsFailed = result.itemsFailed;
      log.status = result.itemsFailed > 0 ? 'partial' : 'success';
      log.executionTime = Date.now() - startTime;

    } catch (error) {
      log.status = 'failed';
      log.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.errorDetails = { error: String(error) };
      log.executionTime = Date.now() - startTime;
    }

    this.addLog(log);
    return log;
  }

  /**
   * Execute rule action
   */
  private async executeRuleAction(rule: AutomationRule, context: Record<string, any>): Promise<{
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
  }> {
    // This would contain the actual automation logic
    // For now, return mock data
    return {
      itemsProcessed: 1,
      itemsSucceeded: 1,
      itemsFailed: 0
    };
  }

  /**
   * Check rate limits for rule
   */
  private checkRateLimits(rule: AutomationRule): boolean {
    // Check daily limit
    if (rule.dailyLimit) {
      const todayLogs = this.getTodayLogs(rule.userId, rule.marketplace);
      if (todayLogs.length >= rule.dailyLimit) {
        return false;
      }
    }

    // Check hourly limit
    if (rule.hourlyLimit) {
      const hourLogs = this.getHourLogs(rule.userId, rule.marketplace);
      if (hourLogs.length >= rule.hourlyLimit) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get today's logs for user and marketplace
   */
  private getTodayLogs(userId: string, marketplace: string): AutomationLog[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    return this.logs.filter(log => 
      log.userId === userId &&
      log.marketplace === marketplace &&
      log.executedAt >= todayStart
    );
  }

  /**
   * Get current hour's logs for user and marketplace
   */
  private getHourLogs(userId: string, marketplace: string): AutomationLog[] {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hourStartTime = hourStart.getTime();

    return this.logs.filter(log => 
      log.userId === userId &&
      log.marketplace === marketplace &&
      log.executedAt >= hourStartTime
    );
  }

  /**
   * Add automation log
   */
  private addLog(log: AutomationLog): void {
    this.logs.push(log);
  }

  /**
   * Get automation logs
   */
  getLogs(userId?: string, marketplace?: string, limit: number = 100): AutomationLog[] {
    let filteredLogs = this.logs;

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (marketplace) {
      filteredLogs = filteredLogs.filter(log => log.marketplace === marketplace);
    }

    return filteredLogs
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, limit);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Automation utilities
export const automationUtils = {
  /**
   * Validate automation rule
   */
  validateRule: (rule: Partial<AutomationRule>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.ruleName) errors.push('Rule name is required');
    if (!rule.marketplace) errors.push('Marketplace is required');
    if (!rule.ruleType) errors.push('Rule type is required');
    if (!rule.triggerType) errors.push('Trigger type is required');

    if (rule.dailyLimit && rule.dailyLimit < 1) {
      errors.push('Daily limit must be at least 1');
    }

    if (rule.hourlyLimit && rule.hourlyLimit < 1) {
      errors.push('Hourly limit must be at least 1');
    }

    if (rule.minDelaySeconds && rule.minDelaySeconds < 1) {
      errors.push('Minimum delay must be at least 1 second');
    }

    if (rule.maxDelaySeconds && rule.minDelaySeconds && rule.maxDelaySeconds < rule.minDelaySeconds) {
      errors.push('Maximum delay must be greater than minimum delay');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Calculate next execution time for schedule
   */
  calculateNextExecution: (schedule: AutomationSchedule): number | null => {
    if (!schedule.isActive || schedule.isPaused) {
      return null;
    }

    const now = Date.now();

    switch (schedule.scheduleType) {
      case 'interval':
        if (schedule.intervalMinutes) {
          return now + (schedule.intervalMinutes * 60 * 1000);
        }
        break;

      case 'time_of_day':
        if (schedule.specificTimes && schedule.specificTimes.length > 0) {
          // Find next time today or tomorrow
          const today = new Date();
          for (const timeStr of schedule.specificTimes) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const nextTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
            
            if (nextTime.getTime() > now) {
              return nextTime.getTime();
            }
          }
          // If no time today, use first time tomorrow
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const [hours, minutes] = schedule.specificTimes[0].split(':').map(Number);
          return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hours, minutes).getTime();
        }
        break;

      case 'continuous':
        return now + (AUTOMATION_LIMITS.MIN_DELAY_SECONDS * 1000);
    }

    return null;
  },

  /**
   * Check if rule should run now
   */
  shouldRunNow: (rule: AutomationRule): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay() as DayOfWeek;

    // Check active hours
    if (rule.activeHours && rule.activeHours.length > 0) {
      const isInActiveHours = rule.activeHours.some(hour => {
        const [startHour] = hour.start.split(':').map(Number);
        const [endHour] = hour.end.split(':').map(Number);
        return currentHour >= startHour && currentHour < endHour;
      });

      if (!isInActiveHours) {
        return false;
      }
    }

    // Check active days
    if (rule.activeDays && rule.activeDays.length > 0) {
      if (!rule.activeDays.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }
};
