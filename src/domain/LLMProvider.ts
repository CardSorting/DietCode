/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure interface for the LLM provider.
 * No external API dependencies.
 */

import type { Agent } from './agent/Agent';
import type { ToolDefinition } from './agent/ToolDefinition';
import type { Message, MessageBlock } from './context/SessionState';
import type { Reasoning } from './memory/Reasoning';

export interface LLMResponse {
  content: MessageBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  reasoning?: Reasoning;
}

/**
 * Global state container
 */
export interface GlobalState {
  [key: string]: any;
}

export interface LLMProvider {
  createMessage(
    agent: Agent,
    messages: Message[],
    tools: ToolDefinition[],
    metadata?: { taskId?: string },
  ): Promise<LLMResponse>;

  /**
   * Performs a minimal task (e.g. 1+1) to verify API key validity.
   */
  ping(): Promise<boolean>;
}
