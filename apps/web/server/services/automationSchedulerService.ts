import {
  type AutomationRule,
  type AutomationSchedule,
  type InsertAutomationSchedule
} from "../shared/schema.js";
import { storage } from "../storage";
import { queueService } from "./queueService";
import parseExpression from "cron-parser";

export interface ScheduledAutomation {
  schedule: AutomationSchedule;
  rule: AutomationRule;
  nextRun: Date;
}

export class AutomationSchedulerService {
  private activeSchedules: Map<string, NodeJS.Timer> = new Map();
  private cronIntervals: Map<string, any> = new Map();
  private isPaused: boolean = false;

  /**
   * Initialize scheduler and load active schedules
   */
  async initialize(): Promise<void> {
    console.log("[AutomationScheduler] Initializing scheduler service");
    
    // Load all active schedules
    const activeSchedules = await storage.getActiveAutomationSchedules();
    
    for (const schedule of activeSchedules) {
      if (schedule.isActive) {
        // Get the rule to check if it's enabled
        const rule = await storage.getAutomationRule(schedule.ruleId);
        if (rule?.isEnabled) {
          await this.activateSchedule(schedule.ruleId);
        }
      }
    }

    console.log(`[AutomationScheduler] Loaded ${activeSchedules.length} active schedules`);
  }

  /**
   * Create a new schedule
   */
  async createSchedule(schedule: InsertAutomationSchedule): Promise<AutomationSchedule> {
    // Validate schedule expression if cron
    if (schedule.scheduleType === "cron" && schedule.scheduleExpression) {
      try {
        new (parseExpression as any)(schedule.scheduleExpression);
      } catch (error) {
        throw new Error(`Invalid cron expression: ${schedule.scheduleExpression}`);
      }
    }

    const created = await storage.createAutomationSchedule(schedule);
    
    // Activate if enabled
    if (created.isActive) {
      await this.activateSchedule(created.ruleId);
    }

    return created;
  }

  /**
   * Activate a schedule
   */
  async activateSchedule(ruleId: string): Promise<void> {
    if (this.isPaused) {
      console.log("[AutomationScheduler] Scheduler is paused, skipping activation");
      return;
    }

    // Get rule and schedules
    const rule = await storage.getAutomationRule(ruleId);
    if (!rule || !rule.isEnabled) {
      console.log(`[AutomationScheduler] Rule ${ruleId} not found or disabled`);
      return;
    }

    const schedules = await storage.getAutomationSchedules(ruleId);
    
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const key = `${schedule.id}`;
      
      // Clear existing timer if any
      if (this.activeSchedules.has(key)) {
        clearInterval(this.activeSchedules.get(key) as any);
        this.activeSchedules.delete(key);
      }

      // Set up new schedule based on type
      switch (schedule.scheduleType) {
        case "cron":
          this.setupCronSchedule(schedule, rule);
          break;
        case "interval":
          this.setupIntervalSchedule(schedule, rule);
          break;
        case "continuous":
          this.setupContinuousSchedule(schedule, rule);
          break;
        case "time_of_day":
          this.setupTimeOfDaySchedule(schedule, rule);
          break;
      }

      console.log(`[AutomationScheduler] Activated schedule ${schedule.id} for rule ${rule.ruleName}`);
    }
  }

  /**
   * Deactivate a schedule
   */
  async deactivateSchedule(ruleId: string): Promise<void> {
    const schedules = await storage.getAutomationSchedules(ruleId);
    
    for (const schedule of schedules) {
      const key = `${schedule.id}`;
      
      if (this.activeSchedules.has(key)) {
        clearInterval(this.activeSchedules.get(key) as any);
        this.activeSchedules.delete(key);
        console.log(`[AutomationScheduler] Deactivated schedule ${schedule.id}`);
      }

      if (this.cronIntervals.has(key)) {
        this.cronIntervals.delete(key);
      }

      // Update schedule status
      await storage.updateAutomationSchedule(schedule.id, { isActive: false });
    }
  }

  /**
   * Deactivate all schedules (for emergency stop)
   */
  async deactivateAllSchedules(): Promise<void> {
    this.isPaused = true;
    
    // Clear all active timers
    for (const [key, timer] of Array.from(this.activeSchedules.entries())) {
      clearInterval(timer as any);
      console.log(`[AutomationScheduler] Clearing schedule ${key}`);
    }
    
    this.activeSchedules.clear();
    this.cronIntervals.clear();
    
    // Update all schedules in database
    await storage.deactivateAllAutomationSchedules();
    
    console.log("[AutomationScheduler] All schedules deactivated");
  }

  /**
   * Reactivate all schedules after emergency stop
   */
  async reactivateAllSchedules(): Promise<void> {
    this.isPaused = false;
    
    // Reactivate all previously active schedules
    await storage.reactivateAllAutomationSchedules();
    
    // Reinitialize
    await this.initialize();
    
    console.log("[AutomationScheduler] All schedules reactivated");
  }

  /**
   * Get due automations (automations that should run now)
   */
  async getDueAutomations(): Promise<ScheduledAutomation[]> {
    if (this.isPaused) {
      return [];
    }

    const dueAutomations: ScheduledAutomation[] = [];
    const now = new Date();
    
    // Get all active schedules
    const activeSchedules = await storage.getActiveAutomationSchedules();
    
    for (const schedule of activeSchedules) {
      if (!schedule.isActive) continue;
      
      // Get the rule to check if it's enabled
      const rule = await storage.getAutomationRule(schedule.ruleId);
      if (!rule?.isEnabled) continue;

      // Check if it's time to run
      const isDue = await this.isScheduleDue(schedule, now);
      
      if (isDue) {
        const nextRun = await this.calculateNextRun(rule);
        dueAutomations.push({
          schedule,
          rule: rule,
          nextRun: nextRun || new Date(Date.now() + 3600000), // Default 1 hour
        });

        // Update last run time
        await storage.updateAutomationSchedule(schedule.id, {
          lastRunAt: now,
          executionCount: (schedule.executionCount || 0) + 1,
        });

        // Update next scheduled time
        if (nextRun) {
          await storage.updateAutomationSchedule(schedule.id, {
            nextRunAt: nextRun,
          });
        }
      }
    }

    return dueAutomations;
  }

  /**
   * Calculate next run time for a rule
   */
  async calculateNextRun(rule: AutomationRule): Promise<Date | null> {
    const schedules = await storage.getAutomationSchedules(rule.id);
    let nearestRun: Date | null = null;

    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const nextRun = this.calculateNextRunForSchedule(schedule);
      
      if (nextRun && (!nearestRun || nextRun < nearestRun)) {
        nearestRun = nextRun;
      }
    }

    return nearestRun;
  }

  /**
   * Setup cron-based schedule
   */
  private setupCronSchedule(schedule: AutomationSchedule, rule: AutomationRule): void {
    if (!schedule.scheduleExpression) return;

    try {
      const interval = new (parseExpression as any)(schedule.scheduleExpression, {
        tz: schedule.timezone || "UTC",
      });
      
      const key = `${schedule.id}`;
      this.cronIntervals.set(key, interval);

      // Check every minute if cron should run
      const timer = setInterval(async () => {
        const now = new Date();
        const nextRun = interval.next().toDate();
        
        // If next run is within the next minute, it should run
        if (nextRun.getTime() - now.getTime() < 60000) {
          console.log(`[AutomationScheduler] Cron trigger for ${rule.ruleName}`);
          await this.triggerAutomation(schedule, rule);
          
          // Reset interval to next occurrence
          interval.next();
        }
      }, 60000); // Check every minute

      this.activeSchedules.set(key, timer);

    } catch (error) {
      console.error(`[AutomationScheduler] Failed to setup cron schedule:`, error);
    }
  }

  /**
   * Setup interval-based schedule
   */
  private setupIntervalSchedule(schedule: AutomationSchedule, rule: AutomationRule): void {
    const intervalMs = (schedule.intervalMinutes || 60) * 60 * 1000; // Default 1 hour (60 minutes)
    
    const timer = setInterval(async () => {
      console.log(`[AutomationScheduler] Interval trigger for ${rule.ruleName}`);
      await this.triggerAutomation(schedule, rule);
    }, intervalMs);

    this.activeSchedules.set(`${schedule.id}`, timer);
  }

  /**
   * Setup continuous schedule
   */
  private setupContinuousSchedule(schedule: AutomationSchedule, rule: AutomationRule): void {
    const intervalMs = (schedule.intervalMinutes || 1800) * 1000; // Default 30 minutes
    const minDelay = Math.max(intervalMs, 60000); // At least 1 minute
    
    const runContinuous = async () => {
      if (this.isPaused) return;

      console.log(`[AutomationScheduler] Continuous trigger for ${rule.ruleName}`);
      await this.triggerAutomation(schedule, rule);

      // Schedule next run with some randomization
      const jitter = Math.random() * 0.2 - 0.1; // +/- 10% jitter
      const nextDelay = minDelay * (1 + jitter);
      
      setTimeout(() => runContinuous(), nextDelay);
    };

    // Start the continuous loop
    setTimeout(() => runContinuous(), minDelay);
  }

  /**
   * Setup time-of-day schedule
   */
  private setupTimeOfDaySchedule(schedule: AutomationSchedule, rule: AutomationRule): void {
    const checkTime = () => {
      const now = new Date();
      const specificTimes = schedule.specificTimes || [];
      const currentHour = now.getHours();

      if (specificTimes.includes(currentHour.toString())) {
        // Check if we haven't run this hour yet
        const lastRun = schedule.lastRunAt;
        if (!lastRun || lastRun.getHours() !== currentHour || 
            lastRun.getDate() !== now.getDate()) {
          console.log(`[AutomationScheduler] Time-of-day trigger for ${rule.ruleName}`);
          this.triggerAutomation(schedule, rule);
        }
      }
    };

    // Check every 5 minutes
    const timer = setInterval(() => checkTime(), 5 * 60 * 1000);
    this.activeSchedules.set(`${schedule.id}`, timer);
    
    // Also check immediately
    checkTime();
  }

  /**
   * Trigger automation execution
   */
  private async triggerAutomation(
    schedule: AutomationSchedule,
    rule: AutomationRule
  ): Promise<void> {
    try {
      // Update schedule execution count
      await storage.updateAutomationSchedule(schedule.id, {
        lastRunAt: new Date(),
        executionCount: (schedule.executionCount || 0) + 1,
      });

      // Queue the automation job using queueService
      await queueService.createAutomationJob(
        rule.userId,
        rule.id,
        "scheduled",
        5 // Default priority
      );

      console.log(`[AutomationScheduler] Queued automation job for rule ${rule.id}`);

    } catch (error) {
      console.error(`[AutomationScheduler] Failed to trigger automation:`, error);
      
      // Update error count
      await storage.updateAutomationSchedule(schedule.id, {
        currentRetryCount: (schedule.currentRetryCount || 0) + 1,
        lastRunError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if schedule is due to run
   */
  private async isScheduleDue(schedule: AutomationSchedule, now: Date): Promise<boolean> {
    // Check if we've reached max executions
    if (schedule.maxExecutions && schedule.executionCount && schedule.executionCount >= schedule.maxExecutions) {
      return false;
    }

    // Check if it's within active hours
    if (schedule.startDate && schedule.endDate) {
      const startTime = new Date(schedule.startDate);
      const endTime = new Date(schedule.endDate);
      
      if (now < startTime || now > endTime) {
        return false;
      }
    }

    // Check last execution time
    if (schedule.lastRunAt) {
      const timeSinceLastRun = now.getTime() - new Date(schedule.lastRunAt).getTime();
      const minInterval = (schedule.intervalMinutes || 60) * 1000;
      
      if (timeSinceLastRun < minInterval) {
        return false;
      }
    }

    // Check if next scheduled time has arrived
    if (schedule.nextRunAt) {
      return now >= new Date(schedule.nextRunAt);
    }

    return true;
  }

  /**
   * Calculate next run time for a specific schedule
   */
  private calculateNextRunForSchedule(schedule: AutomationSchedule): Date | null {
    const now = new Date();

    switch (schedule.scheduleType) {
      case "cron":
        if (schedule.scheduleExpression) {
          try {
            const interval = new (parseExpression as any)(schedule.scheduleExpression, {
              currentDate: now,
              tz: schedule.timezone || "UTC",
            });
            return interval.next().toDate();
          } catch (error) {
            console.error(`[AutomationScheduler] Invalid cron expression:`, error);
          }
        }
        break;

      case "interval":
        const intervalMs = (schedule.intervalMinutes || 3600) * 1000;
        return new Date(now.getTime() + intervalMs);

      case "continuous":
        const continuousMs = (schedule.intervalMinutes || 1800) * 1000;
        return new Date(now.getTime() + continuousMs);

      case "time_of_day":
        const specificTimes = schedule.specificTimes || [];
        const currentHour = now.getHours();
        
        // Find next scheduled hour
        for (const hourStr of specificTimes) {
          const hour = parseInt(hourStr);
          if (hour > currentHour) {
            const nextRun = new Date(now);
            nextRun.setHours(hour, 0, 0, 0);
            return nextRun;
          }
        }
        
        // If no hours left today, schedule for tomorrow
        if (specificTimes.length > 0) {
          const nextRun = new Date(now);
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(parseInt(specificTimes[0]), 0, 0, 0);
          return nextRun;
        }
        break;
    }

    return null;
  }

  /**
   * Update schedule priority
   */
  async updateSchedulePriority(scheduleId: string, priority: number): Promise<void> {
    // Priority is not in the schema, so we'll skip this for now
    console.log(`[AutomationScheduler] Priority update requested for schedule ${scheduleId}: ${priority}`);
  }

  /**
   * Get schedule status
   */
  async getScheduleStatus(scheduleId: string): Promise<{
    isActive: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    executionCount: number;
    currentRetryCount: number;
  }> {
    const schedule = await storage.getAutomationSchedule(scheduleId);
    
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    const nextRun = this.calculateNextRunForSchedule(schedule);

    return {
      isActive: schedule.isActive || false,
      lastRun: schedule.lastRunAt ? new Date(schedule.lastRunAt) : null,
      nextRun,
      executionCount: schedule.executionCount || 0,
      currentRetryCount: schedule.currentRetryCount || 0,
    };
  }
}

// Export singleton instance
export const automationSchedulerService = new AutomationSchedulerService();