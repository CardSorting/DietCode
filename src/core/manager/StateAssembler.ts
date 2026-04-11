/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { StateOrchestrator } from "./orchestrator";
import { VsCodeStateRepository } from "../../infrastructure/storage/VsCodeStateRepository";
import type { ExtensionState, Platform } from "../../shared/ExtensionMessage";
import { Environment } from "../../shared/config-types";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../shared/AutoApprovalSettings";
import { DEFAULT_BROWSER_SETTINGS } from "../../shared/BrowserSettings";
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "../../shared/FocusChainSettings";
import { ApiHandlerSettingsKeys } from "../../shared/storage/state-keys";

/**
 * [LAYER: CORE / MANAGER]
 * The Unified State Assembler.
 * 
 * This service is responsible for transforming the flat, orchestrated 
 * application state into the nested ExtensionState object consumed by the 
 * webview. It ensures schema consistency across initial loads and 
 * streaming updates.
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
        
        // Assemble API Configuration based on current mode
        const mode = orchestrated.mode || 'act';
        const apiProvider = mode === 'plan' ? orchestrated.planModeApiProvider : orchestrated.actModeApiProvider;
        const apiModelId = mode === 'plan' ? orchestrated.planModeApiModelId : orchestrated.actModeApiModelId;

        const apiConfiguration: any = {
            apiProvider: apiProvider || orchestrated.lastUsedApiProvider,
            apiModelId: apiModelId,
        };

        // Dynamically include all other Api Configuration properties
        for (const key of ApiHandlerSettingsKeys) {
            if (orchestrated[key] !== undefined) {
                apiConfiguration[key] = orchestrated[key];
            }
        }

        return {
            version: '2.7.7',
            isNewUser: orchestrated.isNewUser ?? false,
            welcomeViewCompleted: true, // PRODUCTION HARDENING: Skip onboarding globally
            onboardingModels: undefined,
            clineMessages: orchestrated.clineMessages || [],
            taskHistory: orchestrated.taskHistory || [],
            
            // Unified API Configuration
            apiConfiguration: apiConfiguration,

            autoApprovalSettings: orchestrated.autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS,
            browserSettings: orchestrated.browserSettings || DEFAULT_BROWSER_SETTINGS,
            focusChainSettings: orchestrated.focusChainSettings || DEFAULT_FOCUS_CHAIN_SETTINGS,
            
            mode: mode,
            mcpDisplayMode: orchestrated.mcpDisplayMode || 'rich',
            planActSeparateModelsSetting: orchestrated.planActSeparateModelsSetting ?? false,
            
            telemetrySetting: orchestrated.telemetrySetting || 'off',
            enableCheckpointsSetting: orchestrated.enableCheckpointsSetting ?? true,
            terminalReuseEnabled: orchestrated.terminalReuseEnabled ?? true,
            terminalOutputLineLimit: orchestrated.terminalOutputLineLimit || 500,
            maxConsecutiveMistakes: orchestrated.maxConsecutiveMistakes || 3,
            vscodeTerminalExecutionMode: orchestrated.vscodeTerminalExecutionMode || 'vscodeTerminal',
            
            distinctId: orchestrated['cline.generatedMachineId'] || 'sovereign-id',
            platform: (process.platform as Platform) || 'darwin',
            environment: Environment.production,
            
            globalClineRulesToggles: orchestrated.globalClineRulesToggles || {},
            localClineRulesToggles: orchestrated.localClineRulesToggles || {},
            globalWorkflowToggles: orchestrated.globalWorkflowToggles || {},
            localWorkflowToggles: orchestrated.localWorkflowToggles || {},
            localCursorRulesToggles: orchestrated.localCursorRulesToggles || {},
            localWindsurfRulesToggles: orchestrated.localWindsurfRulesToggles || {},
            localAgentsRulesToggles: orchestrated.localAgentsRulesToggles || {},
            globalSkillsToggles: orchestrated.globalSkillsToggles || {},
            localSkillsToggles: orchestrated.localSkillsToggles || {},
            
            mcpResponsesCollapsed: orchestrated.mcpResponsesCollapsed ?? false,
            strictPlanModeEnabled: orchestrated.strictPlanModeEnabled ?? false,
            yoloModeToggled: orchestrated.yoloModeToggled ?? false,
            useAutoCondense: orchestrated.useAutoCondense ?? false,
            subagentsEnabled: orchestrated.subagentsEnabled ?? false,
            clineWebToolsEnabled: {
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
            
            lastDismissedInfoBannerVersion: orchestrated.lastDismissedInfoBannerVersion || 0,
            lastDismissedModelBannerVersion: orchestrated.lastDismissedModelBannerVersion || 0,
            lastDismissedCliBannerVersion: orchestrated.lastDismissedCliBannerVersion || 0,
            dismissedBanners: orchestrated.dismissedBanners || [],
            
            availableProviderModels: orchestrated.availableProviderModels || {},
            providerHealth: orchestrated.providerHealth || {},
            mcpServers: orchestrated.mcpServers || [],
            taskHistorySummary: orchestrated.taskHistorySummary || [],
            
            backgroundCommandRunning: orchestrated.executionStatus === 'executing',
            shouldShowAnnouncement: false,
        };
    }
}
