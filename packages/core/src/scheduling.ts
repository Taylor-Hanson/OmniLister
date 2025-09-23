import { DayOfWeek, TimeWindow } from './types';
import { timeUtils } from './utils';

export interface SchedulingRule {
  id: string;
  marketplace: string;
  optimalWindows: TimeWindow[];
  peakHours: TimeWindow[];
  avoidHours: TimeWindow[];
  rateLimitPerHour: number;
  rateLimitPerDay: number;
  minDelayBetweenPosts: number;
  categorySpecificRules?: Record<string, TimeWindow[]>;
  seasonalAdjustments?: Record<string, TimeWindow[]>;
  successMultiplier: number;
  isActive: boolean;
}

export interface SchedulingRequest {
  marketplace: string;
  category?: string;
  priority: number;
  estimatedDuration: number; // in minutes
  preferredTime?: number; // timestamp
  maxDelay?: number; // in minutes
}

export interface SchedulingResult {
  scheduledTime: number;
  delay: number; // in minutes
  reason: string;
  confidence: number; // 0-1
  alternativeTimes?: number[];
}

export class SmartScheduler {
  private rules: Map<string, SchedulingRule> = new Map();
  private scheduledJobs: Map<string, number[]> = new Map(); // marketplace -> timestamps

  constructor() {}

  /**
   * Add scheduling rule
   */
  addRule(rule: SchedulingRule): void {
    this.rules.set(rule.marketplace, rule);
  }

  /**
   * Get scheduling rule
   */
  getRule(marketplace: string): SchedulingRule | undefined {
    return this.rules.get(marketplace);
  }

  /**
   * Schedule a job
   */
  scheduleJob(request: SchedulingRequest): SchedulingResult {
    const rule = this.getRule(request.marketplace);
    if (!rule || !rule.isActive) {
      return this.getDefaultSchedule(request);
    }

    const now = Date.now();
    const preferredTime = request.preferredTime || now;
    const maxDelay = request.maxDelay || 60; // Default 1 hour max delay

    // Find optimal time slot
    const optimalTime = this.findOptimalTimeSlot(rule, request, preferredTime, maxDelay);
    
    if (optimalTime) {
      this.recordScheduledJob(request.marketplace, optimalTime);
      return {
        scheduledTime: optimalTime,
        delay: Math.max(0, (optimalTime - now) / (1000 * 60)),
        reason: 'Optimal time slot found',
        confidence: 0.9
      };
    }

    // Fallback to default scheduling
    return this.getDefaultSchedule(request);
  }

  /**
   * Find optimal time slot
   */
  private findOptimalTimeSlot(
    rule: SchedulingRule,
    request: SchedulingRequest,
    preferredTime: number,
    maxDelay: number
  ): number | null {
    const now = Date.now();
    const maxTime = now + (maxDelay * 60 * 1000);

    // Check if preferred time is optimal
    if (this.isTimeOptimal(rule, preferredTime, request.category)) {
      return preferredTime;
    }

    // Look for optimal windows within delay limit
    for (const window of rule.optimalWindows) {
      const nextWindow = this.getNextTimeWindow(window, now);
      if (nextWindow && nextWindow <= maxTime) {
        if (this.isTimeAvailable(request.marketplace, nextWindow)) {
          return nextWindow;
        }
      }
    }

    // Look for peak hours
    for (const window of rule.peakHours) {
      const nextWindow = this.getNextTimeWindow(window, now);
      if (nextWindow && nextWindow <= maxTime) {
        if (this.isTimeAvailable(request.marketplace, nextWindow)) {
          return nextWindow;
        }
      }
    }

    return null;
  }

  /**
   * Check if time is optimal
   */
  private isTimeOptimal(rule: SchedulingRule, timestamp: number, category?: string): boolean {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay() as DayOfWeek;

    // Check avoid hours
    for (const window of rule.avoidHours) {
      if (this.isTimeInWindow(hour, window)) {
        return false;
      }
    }

    // Check optimal windows
    for (const window of rule.optimalWindows) {
      if (this.isTimeInWindow(hour, window)) {
        return true;
      }
    }

    // Check category-specific rules
    if (category && rule.categorySpecificRules?.[category]) {
      for (const window of rule.categorySpecificRules[category]) {
        if (this.isTimeInWindow(hour, window)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if time is in window
   */
  private isTimeInWindow(hour: number, window: TimeWindow): boolean {
    return hour >= window.startHour && hour < window.endHour;
  }

  /**
   * Get next occurrence of time window
   */
  private getNextTimeWindow(window: TimeWindow, fromTime: number): number | null {
    const fromDate = new Date(fromTime);
    const currentHour = fromDate.getHours();

    // If current hour is before window start, use today
    if (currentHour < window.startHour) {
      const nextDate = new Date(fromDate);
      nextDate.setHours(window.startHour, 0, 0, 0);
      return nextDate.getTime();
    }

    // If current hour is in window, use current time
    if (currentHour >= window.startHour && currentHour < window.endHour) {
      return fromTime;
    }

    // Otherwise, use tomorrow
    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(window.startHour, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Check if time slot is available
   */
  private isTimeAvailable(marketplace: string, timestamp: number): boolean {
    const scheduledTimes = this.scheduledJobs.get(marketplace) || [];
    const minDelay = 5 * 60 * 1000; // 5 minutes minimum between jobs

    return !scheduledTimes.some(scheduledTime => 
      Math.abs(scheduledTime - timestamp) < minDelay
    );
  }

  /**
   * Record scheduled job
   */
  private recordScheduledJob(marketplace: string, timestamp: number): void {
    if (!this.scheduledJobs.has(marketplace)) {
      this.scheduledJobs.set(marketplace, []);
    }
    this.scheduledJobs.get(marketplace)!.push(timestamp);
  }

  /**
   * Get default schedule
   */
  private getDefaultSchedule(request: SchedulingRequest): SchedulingResult {
    const now = Date.now();
    const delay = Math.min(5, request.maxDelay || 5); // Default 5 minutes
    const scheduledTime = now + (delay * 60 * 1000);

    return {
      scheduledTime,
      delay,
      reason: 'Default scheduling (no optimal time found)',
      confidence: 0.5
    };
  }

  /**
   * Get scheduled jobs for marketplace
   */
  getScheduledJobs(marketplace: string): number[] {
    return this.scheduledJobs.get(marketplace) || [];
  }

  /**
   * Clear old scheduled jobs
   */
  clearOldJobs(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [marketplace, times] of this.scheduledJobs) {
      const filteredTimes = times.filter(time => time > cutoff);
      this.scheduledJobs.set(marketplace, filteredTimes);
    }
  }
}

// Scheduling utilities
export const schedulingUtils = {
  /**
   * Get day of week name
   */
  getDayName: (day: DayOfWeek): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  },

  /**
   * Get hour range description
   */
  getHourRangeDescription: (startHour: number, endHour: number): string => {
    const formatHour = (hour: number) => {
      if (hour === 0) return '12 AM';
      if (hour < 12) return `${hour} AM`;
      if (hour === 12) return '12 PM';
      return `${hour - 12} PM`;
    };

    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  },

  /**
   * Calculate time until next optimal window
   */
  getTimeUntilNextWindow: (rule: SchedulingRule): number | null => {
    const now = Date.now();
    let nextWindow: number | null = null;

    for (const window of rule.optimalWindows) {
      const windowTime = this.getNextTimeWindow(window, now);
      if (windowTime && (!nextWindow || windowTime < nextWindow)) {
        nextWindow = windowTime;
      }
    }

    return nextWindow ? nextWindow - now : null;
  },

  /**
   * Get next time window (helper function)
   */
  getNextTimeWindow: (window: TimeWindow, fromTime: number): number | null => {
    const fromDate = new Date(fromTime);
    const currentHour = fromDate.getHours();

    if (currentHour < window.startHour) {
      const nextDate = new Date(fromDate);
      nextDate.setHours(window.startHour, 0, 0, 0);
      return nextDate.getTime();
    }

    if (currentHour >= window.startHour && currentHour < window.endHour) {
      return fromTime;
    }

    const tomorrow = new Date(fromDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(window.startHour, 0, 0, 0);
    return tomorrow.getTime();
  },

  /**
   * Validate scheduling rule
   */
  validateRule: (rule: Partial<SchedulingRule>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rule.marketplace) errors.push('Marketplace is required');
    if (!rule.optimalWindows || rule.optimalWindows.length === 0) {
      errors.push('At least one optimal window is required');
    }

    if (rule.rateLimitPerHour && rule.rateLimitPerHour < 1) {
      errors.push('Rate limit per hour must be at least 1');
    }

    if (rule.rateLimitPerDay && rule.rateLimitPerDay < 1) {
      errors.push('Rate limit per day must be at least 1');
    }

    if (rule.minDelayBetweenPosts && rule.minDelayBetweenPosts < 0) {
      errors.push('Minimum delay between posts must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Default scheduling rules for popular marketplaces
export const defaultSchedulingRules: SchedulingRule[] = [
  {
    id: 'poshmark-default',
    marketplace: 'poshmark',
    optimalWindows: [
      { startHour: 18, endHour: 22, timezone: 'UTC' }, // Evening peak
      { startHour: 12, endHour: 14, timezone: 'UTC' }  // Lunch break
    ],
    peakHours: [
      { startHour: 19, endHour: 21, timezone: 'UTC' }  // Prime time
    ],
    avoidHours: [
      { startHour: 2, endHour: 6, timezone: 'UTC' }    // Late night/early morning
    ],
    rateLimitPerHour: 100,
    rateLimitPerDay: 5000,
    minDelayBetweenPosts: 30,
    successMultiplier: 1.0,
    isActive: true
  },
  {
    id: 'mercari-default',
    marketplace: 'mercari',
    optimalWindows: [
      { startHour: 17, endHour: 21, timezone: 'UTC' }, // Evening
      { startHour: 11, endHour: 13, timezone: 'UTC' }  // Lunch
    ],
    peakHours: [
      { startHour: 18, endHour: 20, timezone: 'UTC' }
    ],
    avoidHours: [
      { startHour: 1, endHour: 5, timezone: 'UTC' }
    ],
    rateLimitPerHour: 200,
    rateLimitPerDay: 10000,
    minDelayBetweenPosts: 15,
    successMultiplier: 1.0,
    isActive: true
  },
  {
    id: 'ebay-default',
    marketplace: 'ebay',
    optimalWindows: [
      { startHour: 19, endHour: 22, timezone: 'UTC' }, // Evening
      { startHour: 13, endHour: 15, timezone: 'UTC' }  // Afternoon
    ],
    peakHours: [
      { startHour: 20, endHour: 21, timezone: 'UTC' }
    ],
    avoidHours: [
      { startHour: 0, endHour: 4, timezone: 'UTC' }
    ],
    rateLimitPerHour: 5000,
    rateLimitPerDay: 100000,
    minDelayBetweenPosts: 5,
    successMultiplier: 1.0,
    isActive: true
  }
];
