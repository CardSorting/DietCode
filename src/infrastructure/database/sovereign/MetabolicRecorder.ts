/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Core } from './Core';

export interface MetabolicData {
  taskId?: string;
  repoPath?: string;
  agentId?: string;
  linesAdded?: number;
  linesDeleted?: number;
  reads?: number;
  writes?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelId?: string;
  cost?: number;
  environment?: string;
  cognitiveHeat?: number;
}

/**
 * MetabolicRecorder: Persistence adapter for streaming environment vitals.
 */
export class MetabolicRecorder {
  private constructor() {} // Static-only class
  static async recordMetabolicEvent(data: MetabolicData) {
    // 2.0 Architectural Pattern: Async Telemetry Push (Level 3)

    const isLLM = !!data.promptTokens || !!data.totalTokens;
    const table = isLLM ? 'hive_llm_telemetry' : 'hive_metabolic_telemetry';

    const values: any = {
      id: globalThis.crypto.randomUUID(),
      task_id: data.taskId || 'JOYZONING_CORE',
      timestamp: Date.now(),
    };

    if (isLLM) {
      Object.assign(values, {
        repo_path: data.repoPath || 'hive-core',
        agent_id: data.agentId || 'swarm-0',
        prompt_tokens: data.promptTokens || 0,
        completion_tokens: data.completionTokens || 0,
        total_tokens: data.totalTokens || 0,
        model_id: data.modelId || 'unknown',
        cost: data.cost || 0,
        environment: data.environment || 'production',
      });
    } else {
      Object.assign(values, {
        reads: data.reads || 0,
        writes: data.writes || 0,
        lines_added: data.linesAdded || 0,
        lines_deleted: data.linesDeleted || 0,
        tokens_processed: 0,
        verifications_success: 0,
      });
    }

    await Core.push({
      type: 'insert',
      table,
      values,
      shardId: 'main', // Consolidated to main for consistent schema enforcement
    });
  }
}
