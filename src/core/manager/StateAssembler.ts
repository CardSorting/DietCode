/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { StateOrchestrator } from "./orchestrator";
import type { ExtensionState, Platform, SovereignMessage } from "../../shared/ExtensionMessage";
import { Environment } from "../../shared/config-types";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../shared/AutoApprovalSettings";
import { DEFAULT_BROWSER_SETTINGS } from "../../shared/BrowserSettings";
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "../../shared/FocusChainSettings";

// Specialized Assembler Mappers
import { mapApiConfig } from "./assemblers/ApiConfigMapper";
import { mapModelCatalog } from "./assemblers/ModelCatalogMapper";
import { mapHealthStatus } from "./assemblers/HealthStatusMapper";
import { RulesToggleMapper } from "./assemblers/RulesToggleMapper";

/**
 * [LAYER: CORE / MANAGER]
 * The Unified State Assembler.
 * 
 * This service is responsible for transforming the flat, orchestrated 
 * application state into the nested ExtensionState object consumed by the 
 * webview. It ensures schema consistency across initial loads and 
 * streaming updates.
 * 
 * REFACTOR: Separated concerns into specialized Mappers to improve maintainability.
 */
export class StateAssembler {
    private static instance: StateAssembler;

    private constructor() {}

    public static getInstance(): StateAssembler {
        if (!StateAssembler.instance) {
            StateAssembler.instance = new StateAssembler();
        }
        return StateAssembler.instance;
    }

    /**
     * Assembles the full ExtensionState from the orchestrator's snapshot
     */
    public async assemble(): Promise<ExtensionState> {
        const orchestrated = await StateOrchestrator.getInstance().getStateSnapshot();
        const mode = orchestrated.mode || 'act';

        return {
            version: '2.7.7', 
            isNewUser: orchestrated.isNewUser ?? false,
            welcomeViewCompleted: true, // PRODUCTION HARDENING: Skip onboarding globally
            messages: (orchestrated.clineMessages || []) as SovereignMessage[],
            taskHistory: orchestrated.taskHistory || [],
            
            // Orchestrated Mappings
            apiConfiguration: mapApiConfig(orchestrated),
            availableProviderModels: mapModelCatalog(orchestrated),
            providerHealth: mapHealthStatus(orchestrated),

            // User Settings
            autoApprovalSettings: orchestrated.autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS,
            browserSettings: orchestrated.browserSettings || DEFAULT_BROWSER_SETTINGS,
            focusChainSettings: orchestrated.focusChainSettings || DEFAULT_FOCUS_CHAIN_SETTINGS,
            
            mode: mode,
            mcpDisplayMode: orchestrated.mcpDisplayMode || 'rich',
            planActSeparateModelsSetting: orchestrated.planActSeparateModelsSetting ?? false,
            
            // Operational Policy
            telemetrySetting: orchestrated.telemetrySetting || 'off',
            enableCheckpointsSetting: orchestrated.enableCheckpointsSetting ?? true,
            terminalReuseEnabled: orchestrated.terminalReuseEnabled ?? true,
            terminalOutputLineLimit: orchestrated.terminalOutputLineLimit || 500,
            maxConsecutiveMistakes: orchestrated.maxConsecutiveMistakes || 3,
            vscodeTerminalExecutionMode: orchestrated.vscodeTerminalExecutionMode || 'vscodeTerminal',
            
            // Identity & Platform
            distinctId: orchestrated['cline.generatedMachineId'] || 'sovereign-id',
            platform: (process.platform as Platform) || 'darwin',
            environment: Environment.production,
            
            // Unified Rules Toggles
            globalRulesToggles: RulesToggleMapper.mapGlobal(orchestrated),
            localRulesToggles: RulesToggleMapper.mapLocal(orchestrated),
            globalWorkflowToggles: RulesToggleMapper.mapWorkflowGlobal(orchestrated),
            localWorkflowToggles: RulesToggleMapper.mapWorkflowLocal(orchestrated),
            localCursorRulesToggles: RulesToggleMapper.mapCursor(orchestrated),
            localWindsurfRulesToggles: RulesToggleMapper.mapWindsurf(orchestrated),
            localAgentsRulesToggles: RulesToggleMapper.mapAgents(orchestrated),
            globalSkillsToggles: RulesToggleMapper.mapSkillsGlobal(orchestrated),
            localSkillsToggles: RulesToggleMapper.mapSkillsLocal(orchestrated),
            
            // Feature Flags & Workspace
            mcpResponsesCollapsed: orchestrated.mcpResponsesCollapsed ?? false,
            strictPlanModeEnabled: orchestrated.strictPlanModeEnabled ?? false,
            yoloModeToggled: orchestrated.yoloModeToggled ?? false,
            useAutoCondense: orchestrated.useAutoCondense ?? false,
            subagentsEnabled: orchestrated.subagentsEnabled ?? false,
            webToolsEnabled: {
                user: orchestrated.clineWebToolsEnabled ?? true,
                featureFlag: true,
            },
            worktreesEnabled: {
                user: orchestrated.worktreesEnabled ?? false,
                featureFlag: true,
            },
            
            workspaceRoots: orchestrated.workspaceRoots || [],
            primaryRootIndex: orchestrated.primaryRootIndex || 0,
            isMultiRootWorkspace: (orchestrated.workspaceRoots?.length || 0) > 1,
            multiRootSetting: {
                user: orchestrated.multiRootEnabled ?? true,
                featureFlag: true,
            },
            
            lastDismissedInfoBannerVersion: 0,
            lastDismissedModelBannerVersion: 0,
            lastDismissedCliBannerVersion: 0,
            
            // Infrastructure Components
            mcpServers: orchestrated.mcpServers || [],
            taskHistorySummary: orchestrated.taskHistorySummary || [],
            
            backgroundCommandRunning: orchestrated.executionStatus === 'executing',
            shouldShowAnnouncement: false,
            shellIntegrationTimeout: 5000,
        };
    }
}
