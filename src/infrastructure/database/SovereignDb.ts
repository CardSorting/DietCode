import { Core } from './sovereign/Core';

/**
 * Legacy bridge for SovereignDb.
 * All new infrastructure should utilize the Core hive orchestrator directly.
 */
export const SovereignDb = Core;
export default Core;
