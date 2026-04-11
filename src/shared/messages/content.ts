import type { Anthropic } from "@anthropic-ai/sdk";
import type { ClineMessageMetricsInfo, ClineMessageModelInfo } from "./metrics";

export type ClinePromptInputContent = string;

export type ClineMessageRole = "user" | "assistant";

export interface ClineReasoningDetailParam {
  type: "reasoning.text" | string;
  text: string;
  signature: string;
  format: "anthropic-claude-v1" | string;
  index: number;
}

interface ClineSharedMessageParam {
  // The id of the response that the block belongs to
  call_id?: string;
}

export const REASONING_DETAILS_PROVIDERS = ["cline", "openrouter"];

/**
 * An extension of Anthropic.MessageParam that includes Cline-specific fields: reasoning_details.
 * This ensures backward compatibility where the messages were stored in Anthropic format with additional
 * fields unknown to Anthropic SDK.
 */
export interface ClineTextContentBlock extends Anthropic.TextBlockParam, ClineSharedMessageParam {
  // reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
  reasoning_details?: ClineReasoningDetailParam[];
  // Thought Signature associates with Gemini
  signature?: string;
}

export interface ClineImageContentBlock
  extends Anthropic.ImageBlockParam,
    ClineSharedMessageParam {}

export interface ClineDocumentContentBlock
  extends Anthropic.DocumentBlockParam,
    ClineSharedMessageParam {}

export interface ClineUserToolResultContentBlock
  extends Anthropic.ToolResultBlockParam,
    ClineSharedMessageParam {}

/**
 * Assistant only content types
 */
export interface ClineAssistantToolUseBlock
  extends Anthropic.ToolUseBlockParam,
    ClineSharedMessageParam {
  // reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
  reasoning_details?: unknown[] | ClineReasoningDetailParam[];
  // Thought Signature associates with Gemini
  signature?: string;
}

export interface ClineAssistantThinkingBlock
  extends Anthropic.ThinkingBlock,
    ClineSharedMessageParam {
  // The summary items returned by OpenAI response API
  // The reasoning details that will be moved to the text block when finalized
  summary?: unknown[] | ClineReasoningDetailParam[];
}

export interface ClineAssistantRedactedThinkingBlock
  extends Anthropic.RedactedThinkingBlockParam,
    ClineSharedMessageParam {}

export type SovereignToolTypeResponseContent =
  | ClinePromptInputContent
  | Array<ClineTextContentBlock | ClineImageContentBlock>;

export type ClineUserContent =
  | ClineTextContentBlock
  | ClineImageContentBlock
  | ClineDocumentContentBlock
  | ClineUserToolResultContentBlock;

export type ClineAssistantContent =
  | ClineTextContentBlock
  | ClineImageContentBlock
  | ClineDocumentContentBlock
  | ClineAssistantToolUseBlock
  | ClineAssistantThinkingBlock
  | ClineAssistantRedactedThinkingBlock;

export type ClineContent = ClineUserContent | ClineAssistantContent;

/**
 * An extension of Anthropic.MessageParam that includes Cline-specific fields.
 * This ensures backward compatibility where the messages were stored in Anthropic format,
 * while allowing for additional metadata specific to Cline to avoid unknown fields in Anthropic SDK
 * added by ignoring the type checking for those fields.
 */
export interface DietStorageMessage extends Anthropic.MessageParam {
  /**
   * Response ID associated with this message
   */
  id?: string;
  role: ClineMessageRole;
  content: ClinePromptInputContent | ClineContent[];
  /**
   * NOTE: model information used when generating this message.
   * Internal use for message conversion only.
   * MUST be removed before sending message to any LLM provider.
   */
  modelInfo?: ClineMessageModelInfo;
  /**
   * LLM operational and performance metrics for this message
   * Includes token counts, costs.
   */
  metrics?: ClineMessageMetricsInfo;
  /**
   * Timestamp of when the message was created
   */
  ts?: number;
}


