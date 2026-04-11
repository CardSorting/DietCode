import type * as vscode from 'vscode';
import { StateOrchestrator } from '../../../core/manager/StateOrchestrator';
import { convertProtoToApiConfiguration } from '../../../shared/proto-conversions/models/api-configuration-conversion';
import { ApiHandlerSettingsKeys } from '../../../shared/storage/state-keys';
import type { GlobalState } from '../../../domain/LLMProvider';
import type { GrpcRequest, IHandler, SendResponse } from './types';
import type { ModelsApiConfiguration as ProtoApiConfiguration } from '../../../shared/proto/cline/models';

export class ModelsHandler implements IHandler {
  constructor(private context: vscode.ExtensionContext, private sendResponse: SendResponse) {}

  async handle(method: string, request: GrpcRequest): Promise<void> {
    switch (method) {
      case 'updateApiConfigurationProto': {
        const protoConfig = request.apiConfiguration as ProtoApiConfiguration;
        if (protoConfig) {
          // Ensure required fields for the legacy converter
          if (!protoConfig.openAiHeaders) {
              protoConfig.openAiHeaders = {};
          }
          const apiConfig = convertProtoToApiConfiguration(protoConfig);
          const orchestrator = StateOrchestrator.getInstance();

          const changes = Object.entries(apiConfig)
            .filter(([field, val]) => val !== undefined && (ApiHandlerSettingsKeys as string[]).includes(field))
            .map(([field, val]) => ({
              key: field,
              newValue: val,
              stateSet: {} as GlobalState,
              validate: () => true,
              sanitize: () => val,
              getCorrelationId: () => `ui-proto-batch-${Date.now()}`,
            }));

          if (changes.length > 0) {
            await orchestrator.applyChanges(changes, 0);
          }

          if (apiConfig.planModeApiProvider) {
            await this.context.globalState.update('selectedProvider', apiConfig.planModeApiProvider);
          }
        }
        this.sendResponse(request.request_id, {});
        break;
      }

      case 'refreshClineRecommendedModelsRpc': {
        // Simplified: Only return Gemini as recommended
        this.sendResponse(request.request_id, {
          recommended: ['gemini-3.1-pro-preview'],
          free: [],
        });
        break;
      }

      default:
        // Any other model methods (Ollama, LM Studio, etc.) return empty/silent
        this.sendResponse(request.request_id, { models: {}, values: [] });
    }
  }
}
