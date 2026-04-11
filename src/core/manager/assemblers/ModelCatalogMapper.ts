/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ModelInfo } from "../../../shared/api";
import type { GlobalStateAndSettings } from "../../../shared/storage/state-keys";

/**
 * [LAYER: CORE / ASSEMBLER]
 * Transforms flat provider model lists into the nested schema required by the webview.
 */
export function mapModelCatalog(orchestrated: GlobalStateAndSettings): Record<string, Record<string, ModelInfo>> {
    const orchestratedModels = orchestrated.availableProviderModels || {};
    const availableProviderModels: Record<string, Record<string, ModelInfo>> = {};

    for (const [provider, models] of Object.entries(orchestratedModels)) {
        availableProviderModels[provider] = models.reduce((acc, m) => {
            acc[m.id] = m;
            return acc;
        }, {} as Record<string, ModelInfo>);
    }

    return availableProviderModels;
}
