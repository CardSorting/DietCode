/**
 * [LAYER: INFRASTRUCTURE]
 * Principle: Real-Time Metabolic Observation — instruments the environment.
 * Implements Pass 17: Metabolic Live-Monitor (v6.0).
 */

/**
 * MetabolicMonitor: Singleton service for environment-wide instrumentation.
 * Tracks I/O operations, token consumption, and verification signals.
 */
import { SovereignDb } from '../database/SovereignDb';
import * as crypto from 'node:crypto';

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
    writes: 0
  };
  
  private hotspots: Map<string, number> = new Map();

  private constructor() {
    // Pass 17: Background Metabolic Flush Interval (30s)
    setInterval(() => {
        if (this.currentTaskId) {
            this.flushToDatabase(this.currentTaskId).catch(console.error);
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
    const db = await SovereignDb.db();
    const metrics = this.getMetrics();
    
    // Pass 17: Zero-Wait Telemetry Persistence
    await db.insertInto('metabolic_telemetry' as any)
      .values({
        id: crypto.randomUUID(),
        taskId,
        tokensProcessed: metrics.tokensProcessed,
        verificationsSuccess: metrics.verificationsSuccess,
        linesAdded: metrics.linesAdded,
        linesDeleted: metrics.linesDeleted,
        reads: metrics.reads,
        writes: metrics.writes,
        timestamp: Date.now()
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

  public recordWrite(path?: string, linesAdded: number = 0, linesDeleted: number = 0): void {
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
      writes: 0
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
