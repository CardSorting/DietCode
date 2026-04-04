/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Real-Time Metabolic Observation — instruments the environment.
 * Implements Pass 17: Metabolic Live-Monitor (v6.0).
 */

import * as crypto from 'node:crypto';
/**
 * MetabolicMonitor: Singleton service for environment-wide instrumentation.
 * Tracks I/O operations, token consumption, and verification signals.
 */
import { Core } from '../database/sovereign/Core';

export interface BrainMetrics {
  tokensProcessed: number;
  verificationsSuccess: number;
  linesAdded: number;
  linesDeleted: number;
  reads: number;
  writes: number;
}

export class MetabolicMonitor {
  private static instance: MetabolicMonitor;
  private currentTaskId: string | null = null;

  private metrics: BrainMetrics = {
    tokensProcessed: 0,
    verificationsSuccess: 0,
    linesAdded: 0,
    linesDeleted: 0,
    reads: 0,
    writes: 0,
  };

  private hotspots: Map<string, number> = new Map();

  private constructor() {
    // Pass 17: Background Metabolic Flush Interval (30s)
    setInterval(() => {
      if (this.currentTaskId && Core.isAvailable()) {
        this.flushToDatabase(this.currentTaskId).catch((err) => {
          // Silent fail in interval to avoid spamming console during tests
        });
      }
    }, 30000);
  }

  /**
   * Sets the active task ID for metabolic tracking.
   */
  public setTaskId(taskId: string): void {
    this.currentTaskId = taskId;
  }

  /**
   * Access the global metabolic monitor instance.
   */
  public static getInstance(): MetabolicMonitor {
    if (!MetabolicMonitor.instance) {
      MetabolicMonitor.instance = new MetabolicMonitor();
    }
    return MetabolicMonitor.instance;
  }

  /**
   * Persists the current metabolic window to the database.
   */
  public async flushToDatabase(taskId: string): Promise<void> {
    const db = await Core.db();
    const metrics = this.getMetrics();

    // Pass 17: Zero-Wait Telemetry Persistence
    await (db as any)
      .insertInto('hive_metabolic_telemetry' as any)
      .values({
        id: crypto.randomUUID(),
        task_id: taskId,
        tokens_processed: metrics.tokensProcessed,
        verifications_success: metrics.verificationsSuccess,
        lines_added: metrics.linesAdded,
        lines_deleted: metrics.linesDeleted,
        reads: metrics.reads,
        writes: metrics.writes,
        timestamp: Date.now(),
      })
      .execute();

    this.resetMetrics();
  }

  // --- Instrumentation Hooks ---

  public recordRead(path?: string): void {
    this.metrics.reads++;
    if (path) {
      this.hotspots.set(path, (this.hotspots.get(path) || 0) + 1);
    }
  }

  public recordWrite(path?: string, linesAdded = 0, linesDeleted = 0): void {
    this.metrics.writes++;
    this.metrics.linesAdded += linesAdded;
    this.metrics.linesDeleted += linesDeleted;
    if (path) {
      this.hotspots.set(path, (this.hotspots.get(path) || 0) + 2); // Writes weighted double
    }
  }

  public recordTokens(count: number): void {
    this.metrics.tokensProcessed += count;
  }

  public recordVerification(success: boolean): void {
    if (success) {
      this.metrics.verificationsSuccess++;
    }
  }

  /**
   * Identifies the file with the most metabolic activity in the current window.
   */
  public getHotspot(): string | null {
    let top = null;
    let max = 0;
    for (const [path, count] of this.hotspots.entries()) {
      if (count > max) {
        max = count;
        top = path;
      }
    }
    return top;
  }

  // --- Observation Interface ---

  /**
   * Captures the current metabolic state as a snapshot.
   */
  public getMetrics(): BrainMetrics {
    return { ...this.metrics };
  }

  /**
   * Clears the current window (used after a task or checkpoint flush).
   */
  public resetMetrics(): void {
    this.metrics = {
      tokensProcessed: 0,
      verificationsSuccess: 0,
      linesAdded: 0,
      linesDeleted: 0,
      reads: 0,
      writes: 0,
    };
    this.hotspots.clear();
  }

  /**
   * Calculates the current doubt signal (Read:Write ratio).
   */
  public getDoubtSignal(): number {
    return this.metrics.reads / (this.metrics.writes || 1);
  }
}
