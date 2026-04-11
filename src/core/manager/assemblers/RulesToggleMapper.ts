/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { GlobalStateAndSettings } from "../../../shared/storage/state-keys";
import type { SovereignRulesToggles } from "../../../shared/cline-rules";

/**
 * [LAYER: CORE / ASSEMBLER]
 * Aggregates global and local policy toggles for UI synchronization.
 */
export const RulesToggleMapper = {
    mapGlobal: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.globalClineRulesToggles || {};
    },

    mapLocal: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.localClineRulesToggles || {};
    },

    mapWorkflowGlobal: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.globalWorkflowToggles || {};
    },

    mapWorkflowLocal: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.localWorkflowToggles || {};
    },

    mapCursor: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.localCursorRulesToggles || {};
    },

    mapWindsurf: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.localWindsurfRulesToggles || {};
    },

    mapAgents: (orchestrated: GlobalStateAndSettings): SovereignRulesToggles => {
        return orchestrated.localAgentsRulesToggles || {};
    },

    mapSkillsGlobal: (orchestrated: GlobalStateAndSettings): Record<string, boolean> => {
        return orchestrated.globalSkillsToggles || {};
    },

    mapSkillsLocal: (orchestrated: GlobalStateAndSettings): Record<string, boolean> => {
        return orchestrated.localSkillsToggles || {};
    }
};
