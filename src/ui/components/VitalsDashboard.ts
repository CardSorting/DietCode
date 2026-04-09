/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: UI]
 * Principle: Real-Time Metabolic Dashboard — The Vitals Monitor (v6.0)
 * Visualizes the Cognitive Heat, Architectural Decay, and Doubt Signal.
 */

import { FocusShield } from '../../core/task/FocusShield';
import type { VitalsHeartbeat } from '../../domain/task/TaskEntity';
import { COLORS } from '../design/Theme';
import { BoxRenderer } from '../renderers/BoxRenderer';
import { SplashRenderer } from '../renderers/SplashRenderer';

export class VitalsDashboard {
  /**
   * Renders the current metabolic state to the console.
   */
  public render(heartbeat: VitalsHeartbeat): void {
    const shield = FocusShield.getInstance().getStatus();

    const metrics = [
      SplashRenderer.renderMetric('Cognitive Heat', heartbeat.cognitiveHeat, 10000, 50000),
      SplashRenderer.renderMetric('Arch. Decay   ', heartbeat.architecturalDecay, 1.0, 2.0, true),
      SplashRenderer.renderMetric('Doubt Signal ', heartbeat.doubtSignal, 5.0, 10.0),
      '',
      `Focus Shield  : ${shield.active ? COLORS.SUCCESS('ACTIVE') : COLORS.WARNING('INACTIVE')} (${shield.allowedCount} allowed paths)`,
    ].join('\n');

    const dashboard = [
      SplashRenderer.renderPremiumCan(),
      BoxRenderer.render('🌌 Sovereign Vitals', metrics, 'SOVEREIGN'),
    ].join('\n');

    console.log(`\n${dashboard}\n`);
  }
}
