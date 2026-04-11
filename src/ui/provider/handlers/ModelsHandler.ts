/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type * as vscode from 'vscode';
import { StateOrchestrator } from "../../../core/manager/StateOrchestrator";
import { ModelCache } from "../../../core/manager/registry/ModelCache";
import type { ModelsApiConfiguration, ApiFormat } from "../../../shared/proto/cline/models";
import type { ExtensionState } from "../../../shared/ExtensionMessage";
import { geminiModels, type ModelInfo, type ApiConfiguration } from "../../../shared/api";
import type { GrpcRequest, IHandler, SendResponse } from "./types";

/**
 * [LAYER: INFRASTRUCTURE / UI]
 * Specialized gRPC handler for model-related requests.
 * Hardened strictly for Gemini-only infrastructure.
 */
export class ModelsHandler implements IHandler {
    constructor(private context: vscode.ExtensionContext, private sendResponse: SendResponse) {}

    /**
     * Specialized handler for model discovery and configuration mapping.
     * Locked to Gemini-only.
     */
    async handle(method: string, request: GrpcRequest): Promise<void> {
        switch (method) {
            case "listModels":
                await this.handleListModels(request);
                break;
            default:
                this.sendResponse(request.request_id, {});
        }
    }

    private async handleListModels(request: GrpcRequest): Promise<void> {
        const orchestrator = StateOrchestrator.getInstance();
        // State is stored globally; we assume Gemini-only for this hardened build.
        const snapshot = await orchestrator.getStateSnapshot();
        
        // Use cached models if available, otherwise fallback to hardcoded list context.
        const models = await ModelCache.getInstance().loadProviderModels("gemini");
        
        this.sendResponse(request.request_id, { 
            models: models.map((m: ModelInfo & { id: string }) => ({
                id: m.id,
                name: m.name || m.id,
                maxTokens: m.maxTokens,
                supportsPromptCache: m.supportsPromptCache,
                supportsReasoning: m.supportsReasoning,
                supportsStreaming: true,
                inputPrice: m.inputPrice,
                outputPrice: m.outputPrice,
                cacheReadsPrice: m.cacheReadsPrice,
                info: JSON.stringify(m)
            }))
        });
    }

    /**
     * Map internal ApiConfiguration to Protobuf ModelsApiConfiguration.
     * Ensures required fields are satisfied for gRPC transport.
     */
    public static mapToProtoConfig(config: ApiConfiguration): ModelsApiConfiguration {
        const protoConfig: ModelsApiConfiguration = {
            openAiHeaders: {}, // Required by proto
        };

        if (config.geminiApiKey) {
            protoConfig.geminiApiKey = config.geminiApiKey;
            protoConfig.apiKey = config.geminiApiKey;
        }

        if (config.geminiBaseUrl) {
            protoConfig.geminiBaseUrl = config.geminiBaseUrl;
        }

        return protoConfig;
    }
}
