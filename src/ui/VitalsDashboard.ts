/**
 * [LAYER: UI]
 * Principle: Real-Time Metabolic Dashboard — The Vitals Monitor (v6.0)
 * Visualizes the Cognitive Heat, Architectural Decay, and Doubt Signal.
 */

import { FocusShield } from '../core/task/FocusShield';
import type { VitalsHeartbeat } from '../domain/task/TaskEntity';

export class VitalsDashboard {
  /**
   * Renders the current metabolic state to the console.
   */
  public render(heartbeat: VitalsHeartbeat): void {
    const shield = FocusShield.getInstance().getStatus();

    console.log('\n--- 🌌 Antigravity Sovereign v6.0 Vitals ---');

    // Cognitive Heat
    this.printMetric('Cognitive Heat', heartbeat.cognitiveHeat, 10000, 50000);

    // Architectural Decay
    this.printMetric('Arch. Decay   ', heartbeat.architecturalDecay, 1.0, 2.0, true); // Lower is better

    // Doubt Signal
    this.printMetric('Doubt Signal ', heartbeat.doubtSignal, 5.0, 10.0);

    // Focus Shield Status
    console.log(
      `Focus Shield  : ${shield.active ? '\x1b[32mACTIVE\x1b[0m' : '\x1b[33mINACTIVE\x1b[0m'} (${shield.allowedCount} allowed paths)`,
    );

    console.log('-------------------------------------------\n');
  }

  private printMetric(
    label: string,
    value: number,
    warn: number,
    error: number,
    lowerIsBetter = false,
  ): void {
    let color = '\x1b[32m'; // Green

    if (lowerIsBetter) {
      if (value > error)
        color = '\x1b[31m'; // Red
      else if (value > warn) color = '\x1b[33m'; // Yellow
    } else {
      if (value > error)
        color = '\x1b[31m'; // Red
      else if (value < warn) color = '\x1b[33m'; // Red (Wait, the logic depends on high/low)
      // Adjust for standard high-is-bad metrics (Heat, Doubt)
      if (value > error)
        color = '\x1b[31m'; // Red
      else if (value > warn) color = '\x1b[33m'; // Yellow
    }

    console.log(`${label} : ${color}${value.toFixed(2)}\x1b[0m`);
  }
}
