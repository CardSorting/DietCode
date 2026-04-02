/**
 * [LAYER: CORE]
 * Principle: Resilience & Resiliency — ensures reliable tool execution.
 * Implementation: Concurrency control, exponential backoff, and circuit breaker.
 */

import { EventBus } from '../orchestration/EventBus';
import { EventType } from '../../domain/Event';

export interface ExecutionOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  concurrencyGroup?: string;
}

export class ExecutionGovernor {
  private static activeOperations = new Map<string, number>();
  private static queues = new Map<string, (() => void)[]>();
  
  private static config = {
    MAX_CONCURRENCY: 5,
    CIRCUIT_OPEN_THRESHOLD: 10,
    CIRCUIT_RESET_MS: 30000,
    DEFAULT_TIMEOUT: 60000,
  };

  private failuresInWindow = 0;
  private lastFailureTime = 0;
  private eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Execute an operation with resiliency patterns.
   */
  async execute<T>(
    operationId: string,
    operation: () => Promise<T>,
    options: ExecutionOptions = {}
  ): Promise<T> {
    const {
      timeoutMs = ExecutionGovernor.config.DEFAULT_TIMEOUT,
      maxRetries = 3,
      backoffMs = 500,
      concurrencyGroup = 'default'
    } = options;

    let attempts = 0;

    while (attempts < maxRetries) {
      if (this.isCircuitOpen()) {
        const errorMsg = `🛑 [RESILIENCY] Circuit is OPEN. Operation ${operationId} rejected.`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const result = await this.withConcurrency(concurrencyGroup, () =>
          this.withTimeout(operationId, operation(), timeoutMs)
        );
        this.onSuccess();
        return result;
      } catch (err: any) {
        attempts++;
        if (attempts >= maxRetries || !this.isRetryableError(err)) {
          this.onFailure();
          console.error(`❌ [RESILIENCY] Operation ${operationId} failed after ${attempts} attempts:`, err);
          throw err;
        }

        const delay = backoffMs * Math.pow(2, attempts - 1);
        console.warn(`⏳ [RESILIENCY] Operation ${operationId} retrying (${attempts}/${maxRetries}) in ${delay}ms...`);
        this.eventBus.emit(EventType.SYSTEM_ERROR, { 
          component: 'ExecutionGovernor', 
          message: `Retrying ${operationId} after error: ${err.message}` 
        });
        await new Promise(r => setTimeout(r, delay));
      }
    }

    throw new Error(`[RESILIENCY] Operation ${operationId} failed after max retries`);
  }

  private async withConcurrency<T>(group: string, op: () => Promise<T>): Promise<T> {
    const active = ExecutionGovernor.activeOperations.get(group) || 0;

    if (active >= ExecutionGovernor.config.MAX_CONCURRENCY) {
      await new Promise<void>(resolve => {
        const queue = ExecutionGovernor.queues.get(group) || [];
        queue.push(resolve);
        ExecutionGovernor.queues.set(group, queue);
      });
    }

    ExecutionGovernor.activeOperations.set(group, (ExecutionGovernor.activeOperations.get(group) || 0) + 1);

    try {
      return await op();
    } finally {
      const remaining = (ExecutionGovernor.activeOperations.get(group) || 1) - 1;
      ExecutionGovernor.activeOperations.set(group, remaining);

      const queue = ExecutionGovernor.queues.get(group);
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) {
          ExecutionGovernor.queues.delete(group);
        }
        next();
      }
    }
  }

  private async withTimeout<T>(id: string, promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`🛑 [RESILIENCY] Operation ${id} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
  }

  private isRetryableError(err: any): boolean {
    const msg = (err.message || String(err)).toUpperCase();
    return (
      msg.includes('SQLITE_BUSY') ||
      msg.includes('SQLITE_LOCKED') ||
      msg.includes('EBUSY') ||
      msg.includes('TIMEOUT') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('RATELIMIT') ||
      msg.includes('UNAVAILABLE')
    );
  }

  private isCircuitOpen(): boolean {
    if (this.failuresInWindow >= ExecutionGovernor.config.CIRCUIT_OPEN_THRESHOLD) {
      if (Date.now() - this.lastFailureTime < ExecutionGovernor.config.CIRCUIT_RESET_MS) {
        return true;
      }
      this.failuresInWindow = 0; // Reset after window
    }
    return false;
  }

  private onSuccess() {
    if (this.failuresInWindow > 0) {
      this.failuresInWindow = Math.max(0, this.failuresInWindow - 1);
    }
  }

  private onFailure() {
    this.failuresInWindow++;
    this.lastFailureTime = Date.now();
  }
}
