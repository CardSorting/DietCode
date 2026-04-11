/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  type ModelsApiConfiguration as ProtoApiConfiguration,
  ApiProvider as ProtoApiProvider,
} from "@shared/proto/cline/models";
import type {
  ApiConfiguration,
  ApiProvider,
} from "../../api";

/**
 * [LAYER: SHARED / CONVERSION]
 * Minimal Gemini-only protobuf conversion logic for DietCode.
 */

// Convert application ApiProvider to proto ApiProvider
function convertApiProviderToProto(provider: string | undefined): ProtoApiProvider {
  switch (provider) {
    case "gemini":
      return ProtoApiProvider.GEMINI;
    default:
      return ProtoApiProvider.GEMINI;
  }
}

// Convert proto ApiProvider to application ApiProvider
export function convertProtoToApiProvider(provider: ProtoApiProvider): ApiProvider {
  switch (provider) {
    case ProtoApiProvider.GEMINI:
      return "gemini";
    default:
      return "gemini";
  }
}

/**
 * Converts application ApiConfiguration to proto ApiConfiguration.
 * Focused on Gemini and shared global keys.
 */
export function convertApiConfigurationToProto(config: ApiConfiguration): ProtoApiConfiguration {
  return {
    apiKey: config.apiKey,
    ulid: config.ulid,
    geminiApiKey: config.geminiApiKey,
    geminiBaseUrl: config.geminiBaseUrl,
    wandbApiKey: config.wandbApiKey,

    // Plan mode
    planModeApiProvider: config.planModeApiProvider
      ? convertApiProviderToProto(config.planModeApiProvider)
      : undefined,
    planModeApiModelId: config.planModeApiModelId,
    planModeThinkingBudgetTokens: config.planModeThinkingBudgetTokens,
    geminiPlanModeThinkingLevel: config.geminiPlanModeThinkingLevel,

    // Act mode
    actModeApiProvider: config.actModeApiProvider
      ? convertApiProviderToProto(config.actModeApiProvider)
      : undefined,
    actModeApiModelId: config.actModeApiModelId,
    actModeThinkingBudgetTokens: config.actModeThinkingBudgetTokens,
    geminiActModeThinkingLevel: config.geminiActModeThinkingLevel,
  };
}

/**
 * Converts proto ApiConfiguration back to application ApiConfiguration.
 */
export function convertProtoToApiConfiguration(
  protoConfig: ProtoApiConfiguration,
): ApiConfiguration {
  return {
    apiKey: protoConfig.apiKey,
    ulid: protoConfig.ulid,
    geminiApiKey: protoConfig.geminiApiKey,
    geminiBaseUrl: protoConfig.geminiBaseUrl,
    wandbApiKey: protoConfig.wandbApiKey,

    planModeApiProvider:
      protoConfig.planModeApiProvider !== undefined
        ? convertProtoToApiProvider(protoConfig.planModeApiProvider)
        : undefined,
    planModeApiModelId: protoConfig.planModeApiModelId,
    planModeThinkingBudgetTokens: protoConfig.planModeThinkingBudgetTokens,
    geminiPlanModeThinkingLevel: protoConfig.geminiPlanModeThinkingLevel,

    actModeApiProvider:
      protoConfig.actModeApiProvider !== undefined
        ? convertProtoToApiProvider(protoConfig.actModeApiProvider)
        : undefined,
    actModeApiModelId: protoConfig.actModeApiModelId,
    actModeThinkingBudgetTokens: protoConfig.actModeThinkingBudgetTokens,
    geminiActModeThinkingLevel: protoConfig.geminiActModeThinkingLevel,
  };
}
