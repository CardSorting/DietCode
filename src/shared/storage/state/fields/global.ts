/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FieldDefinitions } from "../definitions";
import type { HistoryItem } from "@shared/HistoryItem";
export interface SovereignUserInfo {
  email?: string;
  name?: string;
  id?: string;
}
export interface WorkspaceRoot {
  uri: string;
  name: string;
}
import type { ModelInfo } from "@shared/api";
import type { McpServer } from "@shared/mcp";
import type { SovereignRulesToggles } from "@shared/cline-rules";
import { DEFAULT_MCP_DISPLAY_MODE, type McpDisplayMode } from "@shared/McpDisplayMode";

export const GLOBAL_STATE_FIELDS = {
  clineVersion: { default: undefined as string | undefined },
  "cline.generatedMachineId": { default: undefined as string | undefined },
  lastShownAnnouncementId: { default: undefined as string | undefined },
  taskHistory: { default: [] as HistoryItem[], isAsync: true },
  userInfo: { default: undefined as SovereignUserInfo | undefined },
  favoritedModelIds: { default: [] as string[] },
  mcpMarketplaceEnabled: { default: true as boolean },
  mcpResponsesCollapsed: { default: false as boolean },
  terminalReuseEnabled: { default: true as boolean },
  isNewUser: { default: false as boolean },
  welcomeViewCompleted: { default: true as boolean | undefined },
  cliKanbanMigrationAnnouncementShown: { default: false as boolean },
  mcpDisplayMode: { default: DEFAULT_MCP_DISPLAY_MODE as McpDisplayMode },
  workspaceRoots: { default: undefined as WorkspaceRoot[] | undefined },
  primaryRootIndex: { default: 0 as number },
  multiRootEnabled: { default: true as boolean },
  nativeToolCallEnabled: { default: true as boolean },
  remoteRulesToggles: { default: {} as SovereignRulesToggles },
  remoteWorkflowToggles: { default: {} as SovereignRulesToggles },
  worktreeAutoOpenPath: { default: undefined as string | undefined },

  availableProviderModels: { default: {} as Record<string, ModelInfo[]> },
  providerHealth: { default: {} as Record<string, 'online' | 'offline' | 'error' | 'untested'> },
  remoteGlobalSkillsToggles: { default: {} as Record<string, boolean> },

  currentlyExecutingTool: { default: undefined as string | undefined },
  executionStatus: { default: 'idle' as 'idle' | 'executing' | 'waiting_approval' | 'error' },
  
  pendingToolApprovals: { default: [] as Array<{ id: string; toolName: string; detail: unknown }> },

  mcpServers: { default: [] as McpServer[] },
  taskHistorySummary: { default: [] as unknown[] },
  clineMessages: { default: [] as unknown[] },

  lastDismissedInfoBannerVersion: { default: 0 as number },
  lastDismissedModelBannerVersion: { default: 0 as number },
  lastDismissedCliBannerVersion: { default: 0 as number },
  dismissedBanners: { default: [] as string[] },
} satisfies FieldDefinitions;

