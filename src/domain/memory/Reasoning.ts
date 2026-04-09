/**
 * Copyright (c) 2026 DietCode Contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: DOMAIN]
 * Principle: Pure model for capturing structured reasoning from the LLM.
 * Ported from forge_domain/src/reasoning.rs.
 */

export interface ReasoningPart {
  text?: string;
  signature?: string;
  data?: string;
  id?: string;
  format?: string;
  type?: string; // 'text' | 'encrypted' | 'tool_call'
}

export type Reasoning = ReasoningPart[];
