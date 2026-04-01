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
