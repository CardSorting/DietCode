/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: CORE]
 * Principle: Metabolic Telemetry — The Antigravity Brain (v6.0)
 * Monitors the "Heat" and "Decay" of the implementation process.
 */

import type { TaskEntity, VitalsHeartbeat } from '../../domain/task/TaskEntity';
import { MetabolicMonitor } from '../../infrastructure/monitoring/MetabolicMonitor';

export class MetabolicBrain {
  private monitor = MetabolicMonitor.getInstance();

  /**
   * Calculates the current metabolic heartbeat for a task using real-time telemetry.
   */
  calculateHeartbeat(): VitalsHeartbeat {
    const metrics = this.monitor.getMetrics();
    const cognitiveHeat = metrics.tokensProcessed / (metrics.verificationsSuccess || 1);

    // Architectural Decay: Added:Deleted ratio
    // If linesDeleted is higher than linesAdded, decay is < 1.0 (Good)
    const architecturalDecay = metrics.linesAdded / (metrics.linesDeleted || 1);

    // Doubt Signal: Read:Write ratio
    // If agent reads way more than it writes, it's "spinning" (Doubt)
    const doubtSignal = metrics.reads / (metrics.writes || 1);

    return {
      cognitiveHeat,
      architecturalDecay,
      doubtSignal,
      timestamp: Date.now(),
    };
  }

  /**
   * Identifies the specific file causing the highest 'Metabolic Load'.
   */
  public diagnoseHotspot(): { path: string | null; reason?: string } {
    const metrics = this.monitor.getMetrics();
    const heartbeat = this.calculateHeartbeat();
    const hotspot = this.monitor.getHotspot();

    if (heartbeat.doubtSignal > 5) {
      return { path: hotspot, reason: 'Architectural Thrashing (High Read:Write)' };
    }

    if (heartbeat.cognitiveHeat > 10000) {
      return { path: hotspot, reason: 'Context Exhaustion (High Token:Audit)' };
    }

    return { path: null };
  }

  /**
   * Checks if the task should be auto-suspended due to high heat or doubt.
   */
  shouldAutoSuspend(heartbeat: VitalsHeartbeat): { suspend: boolean; reason?: string } {
    if (heartbeat.cognitiveHeat > 50000) {
      return { suspend: true, reason: 'High Cognitive Heat (Spinning)' };
    }

    if (heartbeat.doubtSignal > 10) {
      return { suspend: true, reason: 'Critical Doubt Signal (Context Loss)' };
    }

    return { suspend: false };
  }
}
