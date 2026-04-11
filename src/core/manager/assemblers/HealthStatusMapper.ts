/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { GlobalStateAndSettings } from "../../../shared/storage/state-keys";

type HealthStatus = "healthy" | "unhealthy" | "degraded";

/**
 * [LAYER: CORE / ASSEMBLER]
 * Normalizes infrastructure health signals into unified UI statuses.
 */
export function mapHealthStatus(orchestrated: GlobalStateAndSettings): Record<string, { status: HealthStatus; message?: string }> {
    const orchestratedHealth = orchestrated.providerHealth || {};
    const providerHealth: Record<string, { status: HealthStatus; message?: string }> = {};

    for (const [provider, status] of Object.entries(orchestratedHealth)) {
        let mappedStatus: HealthStatus = "unhealthy";
        if (status === 'online') mappedStatus = "healthy";
        if (status === 'untested') mappedStatus = "degraded";
        
        providerHealth[provider] = { status: mappedStatus };
    }

    return providerHealth;
}
