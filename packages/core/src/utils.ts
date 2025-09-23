import { format, addDays, addHours, isAfter, isBefore, differenceInMinutes, differenceInHours } from 'date-fns';

// Time utilities
export const timeUtils = {
  /**
   * Get current timestamp in milliseconds
   */
  now: (): number => Date.now(),

  /**
   * Get current timestamp in seconds
   */
  nowSeconds: (): number => Math.floor(Date.now() / 1000),

  /**
   * Format timestamp for display
   */
  formatTimestamp: (timestamp: number, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string => {
    return format(new Date(timestamp), formatStr);
  },

  /**
   * Add time to timestamp
   */
  addTime: (timestamp: number, amount: number, unit: 'minutes' | 'hours' | 'days'): number => {
    const date = new Date(timestamp);
    switch (unit) {
      case 'minutes':
        return date.getTime() + (amount * 60 * 1000);
      case 'hours':
        return addHours(date, amount).getTime();
      case 'days':
        return addDays(date, amount).getTime();
      default:
        return timestamp;
    }
  },

  /**
   * Check if timestamp is in the future
   */
  isFuture: (timestamp: number): boolean => {
    return isAfter(new Date(timestamp), new Date());
  },

  /**
   * Check if timestamp is in the past
   */
  isPast: (timestamp: number): boolean => {
    return isBefore(new Date(timestamp), new Date());
  },

  /**
   * Get minutes between two timestamps
   */
  minutesBetween: (start: number, end: number): number => {
    return differenceInMinutes(new Date(end), new Date(start));
  },

  /**
   * Get hours between two timestamps
   */
  hoursBetween: (start: number, end: number): number => {
    return differenceInHours(new Date(end), new Date(start));
  }
};

// String utilities
export const stringUtils = {
  /**
   * Generate a random string of specified length
   */
  randomString: (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Truncate string to specified length
   */
  truncate: (str: string, length: number, suffix: string = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Convert string to slug
   */
  slugify: (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  /**
   * Capitalize first letter
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// Number utilities
export const numberUtils = {
  /**
   * Round to specified decimal places
   */
  round: (num: number, decimals: number = 2): number => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Format currency
   */
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * Calculate percentage
   */
  percentage: (value: number, total: number): number => {
    if (total === 0) return 0;
    return (value / total) * 100;
  },

  /**
   * Clamp number between min and max
   */
  clamp: (num: number, min: number, max: number): number => {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Generate random number between min and max
   */
  random: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

// Array utilities
export const arrayUtils = {
  /**
   * Shuffle array
   */
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Get random item from array
   */
  randomItem: <T>(array: T[]): T | undefined => {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Remove duplicates from array
   */
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  /**
   * Group array by key
   */
  groupBy: <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
};

// Object utilities
export const objectUtils = {
  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Merge objects deeply
   */
  deepMerge: <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = objectUtils.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
    return result;
  },

  /**
   * Pick specific keys from object
   */
  pick: <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },

  /**
   * Omit specific keys from object
   */
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }
};

// Validation utilities
export const validationUtils = {
  /**
   * Check if email is valid
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if URL is valid
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if string is UUID
   */
  isValidUuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  /**
   * Check if string is numeric
   */
  isNumeric: (str: string): boolean => {
    return !isNaN(Number(str)) && !isNaN(parseFloat(str));
  }
};

// Retry utilities
export const retryUtils = {
  /**
   * Calculate exponential backoff delay
   */
  exponentialBackoff: (attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number => {
    const delay = baseDelay * Math.pow(2, attempt);
    return Math.min(delay, maxDelay);
  },

  /**
   * Add jitter to delay
   */
  addJitter: (delay: number, jitterPercent: number = 0.1): number => {
    const jitter = delay * jitterPercent;
    return delay + (Math.random() * jitter * 2 - jitter);
  },

  /**
   * Calculate retry delay with jitter
   */
  retryDelay: (attempt: number, baseDelay: number = 1000, maxDelay: number = 30000, jitterPercent: number = 0.1): number => {
    const backoffDelay = retryUtils.exponentialBackoff(attempt, baseDelay, maxDelay);
    return retryUtils.addJitter(backoffDelay, jitterPercent);
  }
};

// Platform detection utilities
export const platformUtils = {
  /**
   * Check if running in browser
   */
  isBrowser: (): boolean => {
    return typeof window !== 'undefined';
  },

  /**
   * Check if running in Node.js
   */
  isNode: (): boolean => {
    return typeof process !== 'undefined' && process.versions && process.versions.node;
  },

  /**
   * Get user agent
   */
  getUserAgent: (): string => {
    if (platformUtils.isBrowser()) {
      return window.navigator.userAgent;
    }
    return 'Node.js';
  },

  /**
   * Check if mobile device
   */
  isMobile: (): boolean => {
    if (!platformUtils.isBrowser()) return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
  }
};
