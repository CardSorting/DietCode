/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FieldDefinitions } from "../definitions";

export const API_HANDLER_SETTINGS_FIELDS = {
  enableParallelToolCalling: { default: true as boolean },

  planModeApiModelId: { default: undefined as string | undefined },
  planModeThinkingBudgetTokens: { default: undefined as number | undefined },
  geminiPlanModeThinkingLevel: { default: undefined as string | undefined },
  planModeVerbosity: { default: undefined as string | undefined },
  geminiBaseUrl: { default: undefined as string | undefined },

  actModeApiModelId: { default: undefined as string | undefined },
  actModeThinkingBudgetTokens: { default: undefined as number | undefined },
  geminiActModeThinkingLevel: { default: undefined as string | undefined },
  actModeVerbosity: { default: undefined as string | undefined },

  planModeGeminiApiKey: { default: undefined as string | undefined },
  actModeGeminiApiKey: { default: undefined as string | undefined },
  planModeGeminiBaseUrl: { default: undefined as string | undefined },
  actModeGeminiBaseUrl: { default: undefined as string | undefined },

  planModeApiProvider: { default: "gemini" as string },
  actModeApiProvider: { default: "gemini" as string },

  vertexProjectId: { default: undefined as string | undefined },
  vertexRegion: { default: undefined as string | undefined },
  planModeReasoningEffort: { default: "low" as string },
  actModeReasoningEffort: { default: "low" as string },
} satisfies FieldDefinitions;

