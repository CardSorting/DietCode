import type { HudData } from './src/domain/system/TerminalInterface';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BoxRenderer } from './src/ui/renderers/BoxRenderer';
import { HudRenderer } from './src/ui/renderers/HudRenderer';
import { SplashRenderer } from './src/ui/renderers/SplashRenderer';

async function verify() {
  console.log('--- VERIFYING SOVEREIGN UI ARCHITECTURE ---');

  // 1. BoxRenderer
  console.log('\nTesting BoxRenderer:');
  console.log(
    BoxRenderer.render(
      'Test Title',
      'This is a test of the modular BoxRenderer.\nMultiple lines are supported.',
      'SUCCESS',
    ),
  );

  // 2. HudRenderer
  console.log('\nTesting HudRenderer:');
  const mockHudData: HudData = {
    projectName: 'DIETCODE',
    userName: 'BOZOEGG',
    agentId: 'ANTIGRAVITY',
    health: 0.85,
    activeTask: 'REFACTORING_UI',
  };
  console.log(HudRenderer.render(mockHudData));

  // 3. SplashRenderer
  console.log('\nTesting SplashRenderer (Splash):');
  console.log(SplashRenderer.renderSplash());

  console.log('\nTesting SplashRenderer (Premium Can):');
  console.log(SplashRenderer.renderPremiumCan());

  console.log('\nTesting SplashRenderer (Metric):');
  console.log(SplashRenderer.renderMetric('Cognitive Heat', 12345, 10000, 50000));

  console.log('\n--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
