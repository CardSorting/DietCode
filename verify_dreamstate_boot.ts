import { SplashRenderer } from './src/ui/renderers/SplashRenderer';
import { COLORS } from './src/ui/design/Theme';

async function main() {
    console.log(COLORS.HIGHLIGHT('--- STARTING DREAMSTATE BOOT VERIFICATION ---'));
    
    // Set profile
    (COLORS as any).activeProfile = 'VAPORWAVE';
    
    // Execute sequence
    await SplashRenderer.bootSequence('VAPORWAVE');
    
    console.log(COLORS.HIGHLIGHT('--- DREAMSTATE VERIFICATION COMPLETE ---'));
}

main().catch(console.error);
