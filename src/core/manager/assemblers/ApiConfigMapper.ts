/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ApiHandlerSettingsKeys } from "../../../shared/storage/state-keys";
import type { ApiConfiguration } from "../../../shared/api";
import type { GlobalStateAndSettings } from "../../../shared/storage/state-keys";

/**
 * [LAYER: CORE / ASSEMBLER]
 * Handles mode-aware API configuration aggregation.
 */
export function mapApiConfig(orchestrated: GlobalStateAndSettings): ApiConfiguration {
    const mode = orchestrated.mode || 'act';
    const apiModelId = mode === 'plan' ? orchestrated.planModeApiModelId : orchestrated.actModeApiModelId;

    const apiConfiguration: ApiConfiguration = {
        apiModelId: apiModelId || '',
    };

    // Dynamically include all other Api Configuration properties
    for (const key of ApiHandlerSettingsKeys) {
        const val = orchestrated[key as keyof GlobalStateAndSettings];
        if (val !== undefined) {
            (apiConfiguration as Record<string, unknown>)[key] = val;
        }
    }

    return apiConfiguration;
}
