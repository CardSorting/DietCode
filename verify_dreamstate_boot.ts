import { COLORS } from './src/ui/design/Theme';
/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { SplashRenderer } from './src/ui/renderers/SplashRenderer';

async function main() {
  console.log(COLORS.HIGHLIGHT('--- STARTING DREAMSTATE BOOT VERIFICATION ---'));

  // Set profile
  (COLORS as any).activeProfile = 'VAPORWAVE';

  // Execute sequence
  await SplashRenderer.bootSequence('VAPORWAVE');

  console.log(COLORS.HIGHLIGHT('--- DREAMSTATE VERIFICATION COMPLETE ---'));
}

main().catch(console.error);
