import { 
  type CircuitBreakerStatus, 
  type InsertCircuitBreakerStatus,
  type MarketplaceRetryConfig 
} from "@shared/schema";
import { storage } from "../storage";

export type CircuitBreakerState = "closed" | "open" | "half_open";

export interface CircuitBreakerDecision {
  allowed: boolean;
  state: CircuitBreakerState;
  reason: string;
  nextRetryAt?: Date;
  metadata: {
    failureCount: number;
    successCount: number;
    timeInState: number;
    lastFailure?: Date;
    lastSuccess?: Date;
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryThreshold: number;
  timeoutMs: number;
  halfOpenMaxRequests: number;
}

export class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreakerStatus> = new Map();
  private lastCacheRefresh = 0;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes
  
  // Default configuration for circuit breakers
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,    // Open after 5 consecutive failures
    recoveryThreshold: 3,   // Close after 3 consecutive successes in half-open
    timeoutMs: 60000,       // 1 minute timeout before trying half-open
    halfOpenMaxRequests: 3, // Max concurrent requests in half-open state
  };

  /**
   * Check if a request should be allowed through the circuit breaker
   */
  async shouldAllowRequest(marketplace: string, config?: CircuitBreakerConfig): Promise<CircuitBreakerDecision> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    const effectiveConfig = config || this.DEFAULT_CONFIG;
    
    const now = new Date();
    const timeInState = circuitBreaker.openedAt 
      ? now.getTime() - circuitBreaker.openedAt.getTime()
      : 0;

    switch (circuitBreaker.status) {
      case "closed":
        return {
          allowed: true,
          state: "closed",
          reason: "Circuit breaker is closed - requests allowed",
          metadata: {
            failureCount: (circuitBreaker.failureCount || 0),
            successCount: (circuitBreaker.successCount || 0),
            timeInState,
            lastFailure: circuitBreaker.lastFailureAt || undefined,
            lastSuccess: circuitBreaker.lastSuccessAt || undefined,
          },
        };

      case "open":
        // Check if timeout period has elapsed
        if (timeInState >= effectiveConfig.timeoutMs) {
          // Transition to half-open
          await this.transitionToHalfOpen(marketplace);
          return {
            allowed: true,
            state: "half_open",
            reason: "Circuit breaker transitioning to half-open - limited requests allowed",
            metadata: {
              failureCount: (circuitBreaker.failureCount || 0),
              successCount: (circuitBreaker.successCount || 0),
              timeInState,
              lastFailure: circuitBreaker.lastFailureAt || undefined,
              lastSuccess: circuitBreaker.lastSuccessAt || undefined,
            },
          };
        } else {
          // Still in timeout period
          const nextRetryAt = new Date(circuitBreaker.openedAt!.getTime() + effectiveConfig.timeoutMs);
          return {
            allowed: false,
            state: "open",
            reason: `Circuit breaker is open - requests blocked until ${nextRetryAt.toISOString()}`,
            nextRetryAt,
            metadata: {
              failureCount: (circuitBreaker.failureCount || 0),
              successCount: (circuitBreaker.successCount || 0),
              timeInState,
              lastFailure: circuitBreaker.lastFailureAt || undefined,
              lastSuccess: circuitBreaker.lastSuccessAt || undefined,
            },
          };
        }

      case "half_open":
        // Check if we've reached the max concurrent requests limit
        if (((circuitBreaker.currentHalfOpenRequests || 0) || 0) >= effectiveConfig.halfOpenMaxRequests) {
          return {
            allowed: false,
            state: "half_open",
            reason: `Circuit breaker is half-open but at request limit (${(circuitBreaker.currentHalfOpenRequests || 0)}/${effectiveConfig.halfOpenMaxRequests})`,
            metadata: {
              failureCount: (circuitBreaker.failureCount || 0),
              successCount: (circuitBreaker.successCount || 0),
              timeInState,
              lastFailure: circuitBreaker.lastFailureAt || undefined,
              lastSuccess: circuitBreaker.lastSuccessAt || undefined,
            },
          };
        } else {
          // Allow request but increment counter
          await this.incrementHalfOpenRequests(marketplace);
          return {
            allowed: true,
            state: "half_open",
            reason: "Circuit breaker is half-open - limited request allowed",
            metadata: {
              failureCount: (circuitBreaker.failureCount || 0),
              successCount: (circuitBreaker.successCount || 0),
              timeInState,
              lastFailure: circuitBreaker.lastFailureAt || undefined,
              lastSuccess: circuitBreaker.lastSuccessAt || undefined,
            },
          };
        }

      default:
        // Fallback to closed state
        return {
          allowed: true,
          state: "closed",
          reason: "Circuit breaker state unknown - defaulting to closed",
          metadata: {
            failureCount: 0,
            successCount: 0,
            timeInState: 0,
          },
        };
    }
  }

  /**
   * Record a successful request
   */
  async recordSuccess(marketplace: string, config?: CircuitBreakerConfig): Promise<void> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    const effectiveConfig = config || this.DEFAULT_CONFIG;
    const now = new Date();

    switch (circuitBreaker.status) {
      case "closed":
        // Reset failure count on success
        await this.updateCircuitBreaker(marketplace, {
          failureCount: 0,
          successCount: ((circuitBreaker.successCount || 0) || 0) + 1,
          lastSuccessAt: now,
        });
        break;

      case "half_open":
        const newSuccessCount = ((circuitBreaker.successCount || 0) || 0) + 1;
        
        // Decrement half-open request counter
        await this.decrementHalfOpenRequests(marketplace);
        
        // Check if we've reached the recovery threshold
        if (newSuccessCount >= effectiveConfig.recoveryThreshold) {
          // Transition back to closed
          await this.transitionToClosed(marketplace);
        } else {
          // Continue in half-open state
          await this.updateCircuitBreaker(marketplace, {
            successCount: newSuccessCount,
            lastSuccessAt: now,
          });
        }
        break;

      case "open":
        // Successes shouldn't happen in open state, but if they do, record them
        await this.updateCircuitBreaker(marketplace, {
          successCount: (circuitBreaker.successCount || 0) + 1,
          lastSuccessAt: now,
        });
        break;
    }

    // Clear cache to ensure fresh data on next request
    this.circuitBreakers.delete(marketplace);
  }

  /**
   * Record a failed request
   */
  async recordFailure(marketplace: string, config?: CircuitBreakerConfig): Promise<void> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    const effectiveConfig = config || this.DEFAULT_CONFIG;
    const now = new Date();

    switch (circuitBreaker.status) {
      case "closed":
        const newFailureCount = (circuitBreaker.failureCount || 0) + 1;
        
        // Check if we've reached the failure threshold
        if (newFailureCount >= effectiveConfig.failureThreshold) {
          // Transition to open state
          await this.transitionToOpen(marketplace);
        } else {
          // Stay in closed state but increment failure count
          await this.updateCircuitBreaker(marketplace, {
            failureCount: newFailureCount,
            successCount: 0, // Reset success count on failure
            lastFailureAt: now,
          });
        }
        break;

      case "half_open":
        // Any failure in half-open state immediately opens the circuit
        await this.decrementHalfOpenRequests(marketplace);
        await this.transitionToOpen(marketplace);
        break;

      case "open":
        // Record failure but stay in open state
        await this.updateCircuitBreaker(marketplace, {
          failureCount: (circuitBreaker.failureCount || 0) + 1,
          lastFailureAt: now,
        });
        break;
    }

    // Clear cache to ensure fresh data on next request
    this.circuitBreakers.delete(marketplace);
  }

  /**
   * Get circuit breaker status for a marketplace
   */
  private async getCircuitBreakerStatus(marketplace: string): Promise<CircuitBreakerStatus> {
    // Check cache first
    await this.ensureCacheValid();
    
    let circuitBreaker = this.circuitBreakers.get(marketplace);
    if (circuitBreaker) {
      return circuitBreaker;
    }

    try {
      // In production, this would query the database
      // For now, create a default closed circuit breaker
      circuitBreaker = {
        id: `cb-${marketplace}`,
        marketplace,
        status: "closed",
        failureCount: 0,
        successCount: 0,
        lastFailureAt: null,
        lastSuccessAt: null,
        openedAt: null,
        nextRetryAt: null,
        failureThreshold: this.DEFAULT_CONFIG.failureThreshold,
        recoveryThreshold: this.DEFAULT_CONFIG.recoveryThreshold,
        timeoutMs: this.DEFAULT_CONFIG.timeoutMs,
        halfOpenMaxRequests: this.DEFAULT_CONFIG.halfOpenMaxRequests,
        currentHalfOpenRequests: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.circuitBreakers.set(marketplace, circuitBreaker);
      return circuitBreaker;
    } catch (error) {
      console.error(`Failed to get circuit breaker status for ${marketplace}:`, error);
      
      // Return a default closed circuit breaker
      return {
        id: `cb-${marketplace}-fallback`,
        marketplace,
        status: "closed",
        failureCount: 0,
        successCount: 0,
        lastFailureAt: null,
        lastSuccessAt: null,
        openedAt: null,
        nextRetryAt: null,
        failureThreshold: this.DEFAULT_CONFIG.failureThreshold,
        recoveryThreshold: this.DEFAULT_CONFIG.recoveryThreshold,
        timeoutMs: this.DEFAULT_CONFIG.timeoutMs,
        halfOpenMaxRequests: this.DEFAULT_CONFIG.halfOpenMaxRequests,
        currentHalfOpenRequests: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Transition circuit breaker to open state
   */
  private async transitionToOpen(marketplace: string): Promise<void> {
    const now = new Date();
    await this.updateCircuitBreaker(marketplace, {
      status: "open",
      openedAt: now,
      nextRetryAt: new Date(now.getTime() + this.DEFAULT_CONFIG.timeoutMs),
      currentHalfOpenRequests: 0,
      lastFailureAt: now,
    });

    console.warn(`Circuit breaker OPENED for marketplace: ${marketplace}`);
  }

  /**
   * Transition circuit breaker to half-open state
   */
  private async transitionToHalfOpen(marketplace: string): Promise<void> {
    await this.updateCircuitBreaker(marketplace, {
      status: "half_open",
      currentHalfOpenRequests: 0,
      successCount: 0, // Reset success count for recovery threshold
    });

    console.info(`Circuit breaker transitioned to HALF-OPEN for marketplace: ${marketplace}`);
  }

  /**
   * Transition circuit breaker to closed state
   */
  private async transitionToClosed(marketplace: string): Promise<void> {
    await this.updateCircuitBreaker(marketplace, {
      status: "closed",
      failureCount: 0,
      successCount: 0,
      openedAt: null,
      nextRetryAt: null,
      currentHalfOpenRequests: 0,
    });

    console.info(`Circuit breaker CLOSED for marketplace: ${marketplace}`);
  }

  /**
   * Increment half-open request counter
   */
  private async incrementHalfOpenRequests(marketplace: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(marketplace);
    if (circuitBreaker) {
      circuitBreaker.currentHalfOpenRequests = (circuitBreaker.currentHalfOpenRequests || 0) + 1;
      await this.updateCircuitBreaker(marketplace, {
        currentHalfOpenRequests: (circuitBreaker.currentHalfOpenRequests || 0),
      });
    }
  }

  /**
   * Decrement half-open request counter
   */
  private async decrementHalfOpenRequests(marketplace: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(marketplace);
    if (circuitBreaker && (circuitBreaker.currentHalfOpenRequests || 0) > 0) {
      circuitBreaker.currentHalfOpenRequests = (circuitBreaker.currentHalfOpenRequests || 0) - 1;
      await this.updateCircuitBreaker(marketplace, {
        currentHalfOpenRequests: (circuitBreaker.currentHalfOpenRequests || 0),
      });
    }
  }

  /**
   * Update circuit breaker status
   */
  private async updateCircuitBreaker(marketplace: string, updates: Partial<CircuitBreakerStatus>): Promise<void> {
    try {
      const existing = this.circuitBreakers.get(marketplace);
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.circuitBreakers.set(marketplace, updated);
        
        // In production, this would also update the database
        console.debug(`Updated circuit breaker for ${marketplace}:`, updates);
      }
    } catch (error) {
      console.error(`Failed to update circuit breaker for ${marketplace}:`, error);
    }
  }

  /**
   * Ensure cache is valid and refresh if needed
   */
  private async ensureCacheValid(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheRefresh < this.CACHE_TTL) {
      return;
    }

    try {
      // In production, this would refresh from the database
      this.lastCacheRefresh = now;
    } catch (error) {
      console.warn("Failed to refresh circuit breaker cache:", error);
    }
  }

  /**
   * Get status of all circuit breakers
   */
  async getAllCircuitBreakerStatuses(): Promise<CircuitBreakerStatus[]> {
    await this.ensureCacheValid();
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Reset a circuit breaker to closed state (admin function)
   */
  async resetCircuitBreaker(marketplace: string): Promise<void> {
    await this.transitionToClosed(marketplace);
    console.info(`Circuit breaker manually reset for marketplace: ${marketplace}`);
  }

  /**
   * Get circuit breaker statistics
   */
  async getCircuitBreakerStats(marketplace: string): Promise<{
    state: CircuitBreakerState;
    uptime: number; // Percentage of time in closed state
    totalFailures: number;
    totalSuccesses: number;
    avgFailureRate: number;
    timeInCurrentState: number;
    lastStateChange: Date | null;
  }> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    const now = new Date();
    
    let timeInCurrentState = 0;
    let lastStateChange: Date | null = null;

    if (circuitBreaker.status === "open" && circuitBreaker.openedAt) {
      timeInCurrentState = now.getTime() - circuitBreaker.openedAt.getTime();
      lastStateChange = circuitBreaker.openedAt;
    } else if (circuitBreaker.updatedAt) {
      timeInCurrentState = now.getTime() - circuitBreaker.updatedAt.getTime();
      lastStateChange = circuitBreaker.updatedAt;
    }

    const totalRequests = (circuitBreaker.failureCount || 0) + (circuitBreaker.successCount || 0);
    const avgFailureRate = totalRequests > 0 ? (circuitBreaker.failureCount || 0) / totalRequests : 0;

    return {
      state: circuitBreaker.status as CircuitBreakerState,
      uptime: circuitBreaker.status === "closed" ? 100 : 0, // Simplified uptime calculation
      totalFailures: (circuitBreaker.failureCount || 0),
      totalSuccesses: (circuitBreaker.successCount || 0),
      avgFailureRate,
      timeInCurrentState,
      lastStateChange,
    };
  }

  /**
   * Force open a circuit breaker (admin function)
   */
  async forceOpenCircuitBreaker(marketplace: string, reason?: string): Promise<void> {
    await this.transitionToOpen(marketplace);
    
    // Add reason to metadata
    const circuitBreaker = this.circuitBreakers.get(marketplace);
    if (circuitBreaker) {
      await this.updateCircuitBreaker(marketplace, {
        metadata: {
          ...(circuitBreaker.metadata || {}),
          forceOpened: true,
          forceOpenReason: reason || "Manually forced open",
          forceOpenAt: new Date().toISOString(),
        },
      });
    }

    console.warn(`Circuit breaker FORCE OPENED for marketplace: ${marketplace}. Reason: ${reason}`);
  }

  /**
   * Get the current state of a circuit breaker (used by rate limit service)
   */
  async getState(marketplace: string): Promise<CircuitBreakerState> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    return circuitBreaker.status as CircuitBreakerState;
  }

  /**
   * Check if a half-open request can be made (used by rate limit service)
   */
  async canMakeHalfOpenRequest(marketplace: string): Promise<boolean> {
    const circuitBreaker = await this.getCircuitBreakerStatus(marketplace);
    
    if (circuitBreaker.status !== "half_open") {
      return false;
    }

    const config = this.DEFAULT_CONFIG;
    return (circuitBreaker.currentHalfOpenRequests || 0) < config.halfOpenMaxRequests;
  }
}

export const circuitBreakerService = new CircuitBreakerService();