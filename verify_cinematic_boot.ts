import { SplashRenderer } from './src/ui/renderers/SplashRenderer';
import { COLORS } from './src/ui/design/Theme';

async function main() {
    console.log(COLORS.HIGHLIGHT('--- STARTING CINEMATIC BOOT VERIFICATION ---'));
    
    // Set profile
    (COLORS as any).activeProfile = 'AETHER';
    
    // Execute sequence
    await SplashRenderer.bootSequence('AETHER');
    
    console.log(COLORS.HIGHLIGHT('--- VERIFICATION COMPLETE ---'));
}

main().catch(console.error);
