/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FieldDefinitions } from "../definitions";
import { type AutoApprovalSettings, DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../../AutoApprovalSettings";
import { type BrowserSettings, DEFAULT_BROWSER_SETTINGS } from "../../../BrowserSettings";
import { DEFAULT_FOCUS_CHAIN_SETTINGS, type FocusChainSettings } from "../../../FocusChainSettings";
import type { SovereignRulesToggles } from "../../../cline-rules";
import type { TelemetrySetting } from "../../../TelemetrySetting";
import type { Mode } from "../../types";

export const USER_SETTINGS_FIELDS = {
  autoApprovalSettings: {
    default: DEFAULT_AUTO_APPROVAL_SETTINGS as AutoApprovalSettings,
  },
  globalClineRulesToggles: { default: {} as SovereignRulesToggles },
  globalWorkflowToggles: { default: {} as SovereignRulesToggles },
  globalSkillsToggles: { default: {} as Record<string, boolean> },
  browserSettings: {
    default: DEFAULT_BROWSER_SETTINGS as BrowserSettings,
    transform: (v: unknown) => ({ ...DEFAULT_BROWSER_SETTINGS, ...(v as Partial<BrowserSettings>) }),
  },
  telemetrySetting: { default: "unset" as TelemetrySetting },
  planActSeparateModelsSetting: { default: false as boolean, isComputed: true },
  enableCheckpointsSetting: { default: true as boolean },
  shellIntegrationTimeout: { default: 4000 as number },
  defaultTerminalProfile: { default: "default" as string },
  terminalOutputLineLimit: { default: 500 as number },
  maxConsecutiveMistakes: { default: 3 as number },
  strictPlanModeEnabled: { default: false as boolean },
  hooksEnabled: { default: true as boolean },
  yoloModeToggled: { default: false as boolean },
  autoApproveAllToggled: { default: false as boolean },
  useAutoCondense: { default: false as boolean },
  subagentsEnabled: { default: false as boolean },
  clineWebToolsEnabled: { default: true as boolean },
  worktreesEnabled: { default: false as boolean },
  preferredLanguage: { default: "English" as string },
  mode: { default: "act" as Mode },
  focusChainSettings: { default: DEFAULT_FOCUS_CHAIN_SETTINGS as FocusChainSettings },
  customPrompt: { default: undefined as "compact" | undefined },
  backgroundEditEnabled: { default: false as boolean },
  optOutOfRemoteConfig: { default: false as boolean },
  doubleCheckCompletionEnabled: { default: false as boolean },
  lazyTeammateModeEnabled: { default: false as boolean },
  showFeatureTips: { default: true as boolean },
  localClineRulesToggles: { default: {} as SovereignRulesToggles },
  localWorkflowToggles: { default: {} as SovereignRulesToggles },
  localCursorRulesToggles: { default: {} as SovereignRulesToggles },
  localWindsurfRulesToggles: { default: {} as SovereignRulesToggles },
  localAgentsRulesToggles: { default: {} as SovereignRulesToggles },
  localSkillsToggles: { default: {} as Record<string, boolean> },

  openTelemetryEnabled: { default: true as boolean },
  openTelemetryMetricsExporter: { default: undefined as string | undefined },
  openTelemetryLogsExporter: { default: undefined as string | undefined },
  openTelemetryOtlpProtocol: { default: "http/json" as string | undefined },
  openTelemetryOtlpEndpoint: { default: "http://localhost:4318" as string | undefined },
  openTelemetryOtlpMetricsProtocol: { default: undefined as string | undefined },
  openTelemetryOtlpMetricsEndpoint: { default: undefined as string | undefined },
  openTelemetryOtlpLogsProtocol: { default: undefined as string | undefined },
  openTelemetryOtlpLogsEndpoint: { default: undefined as string | undefined },
  openTelemetryMetricExportInterval: { default: 60000 as number | undefined },
  openTelemetryOtlpInsecure: { default: false as boolean | undefined },
  openTelemetryLogBatchSize: { default: 512 as number | undefined },
  openTelemetryLogBatchTimeout: { default: 5000 as number | undefined },
  openTelemetryLogMaxQueueSize: { default: 2048 as number | undefined },
} satisfies FieldDefinitions;
