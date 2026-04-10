import { ApiFormat } from "./proto/cline/models";
import type { ApiHandlerSettings } from "./storage/state-keys";

export type ApiProvider =
  | "anthropic"
  | "openrouter"
  | "openai"
  | "openai-native"
  | "gemini"
  | "vscode-lm"
  | "ollama"
  | "cloudflare"
  | "cline";

export const DEFAULT_API_PROVIDER = "openrouter" as ApiProvider;

export interface ApiHandlerOptions extends Partial<ApiHandlerSettings> {
  ulid?: string; // Used to identify the task in API requests
  apiProvider?: ApiProvider | string;
  apiModelId?: string;
  apiKey?: string;
  openRouterApiKey?: string;
  openRouterModelId?: string;
  openAiApiKey?: string;
  openAiModelId?: string;
  openAiBaseUrl?: string;
  geminiApiKey?: string;
  geminiModelId?: string;
  ollamaModelId?: string;
  ollamaBaseUrl?: string;
  vscodeLmModelSelector?: unknown;
  modelInfo?: ModelInfo;
  planModeApiKey?: string;
  actModeApiKey?: string;
  planModeOpenAiBaseUrl?: string;
  actModeOpenAiBaseUrl?: string;
  planModeAnthropicBaseUrl?: string;
  actModeAnthropicBaseUrl?: string;
  planModeOpenAiNativeApiKey?: string;
  actModeOpenAiNativeApiKey?: string;
  planModeOpenRouterApiKey?: string;
  actModeOpenRouterApiKey?: string;
  planModeOpenRouterBaseUrl?: string;
  actModeOpenRouterBaseUrl?: string;
  planModeGeminiApiKey?: string;
  actModeGeminiApiKey?: string;
  planModeGeminiBaseUrl?: string;
  actModeGeminiBaseUrl?: string;
  planModeAnthropicApiKey?: string;
  actModeAnthropicApiKey?: string;
  planModeOpenAiApiKey?: string;
  actModeOpenAiApiKey?: string;
  planModeAzureOpenAiApiKey?: string;
  actModeAzureOpenAiApiKey?: string;
  requestyModelId?: string;
  togetherModelId?: string;
  lmStudioModelId?: string;
  openAiHeaders?: Record<string, string>;
  azureIdentity?: boolean;
  azureApiVersion?: string;
  openRouterBaseUrl?: string;
  anthropicBaseUrl?: string;
  geminiBaseUrl?: string;
  openAiNativeApiKey?: string;
  anthropicApiKey?: string;
  azureOpenAiApiKey?: string;
  planModeOpenRouterModelId?: string;
  actModeOpenRouterModelId?: string;
  planModeOpenRouterModelInfo?: ModelInfo;
  actModeOpenRouterModelInfo?: ModelInfo;
  planModeClineModelId?: string;
  actModeClineModelId?: string;
  planModeClineModelInfo?: ModelInfo;
  actModeClineModelInfo?: ModelInfo;
  planModeApiProvider?: ApiProvider | string;
  actModeApiProvider?: ApiProvider | string;
  planModeApiModelId?: string;
  actModeApiModelId?: string;
  onRetryAttempt?: (attempt: number, maxRetries: number, delay: number, error: unknown) => void;
}

export type ApiConfiguration = ApiHandlerOptions;

// Models

interface PriceTier {
  tokenLimit: number; // Upper limit (inclusive) of *input* tokens for this price. Use Infinity for the highest tier.
  price: number; // Price per million tokens for this tier.
}

export interface ModelInfo {
  name?: string;
  maxTokens?: number;
  contextWindow?: number;
  supportsImages?: boolean;
  supportsPromptCache: boolean; // this value is hardcoded for now
  supportsReasoning?: boolean; // Whether the model supports reasoning/thinking mode
  inputPrice?: number; // Keep for non-tiered input models
  outputPrice?: number; // Keep for non-tiered output models
  thinkingConfig?: {
    maxBudget?: number; // Max allowed thinking budget tokens
    outputPrice?: number; // Output price per million tokens when budget > 0
    outputPriceTiers?: PriceTier[]; // Optional: Tiered output price when budget > 0
    geminiThinkingLevel?: "low" | "high"; // Optional: preset thinking level
    supportsThinkingLevel?: boolean; // Whether the model supports thinking level (low/high)
  };
  supportsGlobalEndpoint?: boolean; // Whether the model supports a global endpoint with Vertex AI
  cacheWritesPrice?: number;
  cacheReadsPrice?: number;
  description?: string;
  tiers?: {
    contextWindow: number;
    inputPrice?: number;
    outputPrice?: number;
    cacheWritesPrice?: number;
    cacheReadsPrice?: number;
  }[];
  temperature?: number;
  apiFormat?: ApiFormat; // The API format used by this model
}

export interface OpenAiCompatibleModelInfo extends ModelInfo {
  temperature?: number;
  isR1FormatRequired?: boolean;
  systemRole?: "developer" | "system";
  supportsReasoningEffort?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
}



export const CLAUDE_SONNET_1M_SUFFIX = ":1m";
export const ANTHROPIC_FAST_MODE_SUFFIX = ":fast";
export const CLAUDE_SONNET_1M_TIERS = [
  {
    contextWindow: 200000,
    inputPrice: 3.0,
    outputPrice: 15,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  {
    contextWindow: Number.MAX_SAFE_INTEGER, // storing infinity in vs storage is not possible, it converts to 'null', which causes crash in webview ModelInfoView
    inputPrice: 6,
    outputPrice: 22.5,
    cacheWritesPrice: 7.5,
    cacheReadsPrice: 0.6,
  },
];
export const CLAUDE_OPUS_1M_TIERS = [
  {
    contextWindow: 200000,
    inputPrice: 5.0,
    outputPrice: 25,
    cacheWritesPrice: 6.25,
    cacheReadsPrice: 0.5,
  },
  {
    contextWindow: Number.MAX_SAFE_INTEGER,
    inputPrice: 10,
    outputPrice: 37.5,
    cacheWritesPrice: 12.5,
    cacheReadsPrice: 1.0,
  },
];

export interface HicapCompatibleModelInfo extends ModelInfo {
  temperature?: number;
}

export const hicapModelInfoSaneDefaults: HicapCompatibleModelInfo = {
  maxTokens: -1,
  contextWindow: 128_000,
  supportsImages: true,
  supportsPromptCache: true,
  inputPrice: 0,
  outputPrice: 0,
  temperature: 1,
};

// Anthropic
// https://docs.anthropic.com/en/docs/about-claude/models // prices updated 2025-01-02
export type AnthropicModelId = keyof typeof anthropicModels;
export const anthropicDefaultModelId: AnthropicModelId = "claude-sonnet-4-5-20250929";
export const ANTHROPIC_MIN_THINKING_BUDGET = 1_024;
export const ANTHROPIC_MAX_THINKING_BUDGET = 6_000;
export const anthropicModels = {
  "claude-sonnet-4-6": {
    maxTokens: 64_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  "claude-sonnet-4-6:1m": {
    maxTokens: 64_000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
    tiers: CLAUDE_SONNET_1M_TIERS,
  },
  "claude-sonnet-4-5-20250929": {
    maxTokens: 64_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  "claude-sonnet-4-5-20250929:1m": {
    maxTokens: 64_000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
    tiers: CLAUDE_SONNET_1M_TIERS,
  },
  "claude-haiku-4-5-20251001": {
    maxTokens: 64_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 1,
    outputPrice: 5.0,
    cacheWritesPrice: 1.25,
    cacheReadsPrice: 0.1,
  },
  "claude-sonnet-4-20250514": {
    maxTokens: 64_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  "claude-sonnet-4-20250514:1m": {
    maxTokens: 64_000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
    tiers: CLAUDE_SONNET_1M_TIERS,
  },
  "claude-opus-4-6": {
    maxTokens: 128_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 5.0,
    outputPrice: 25.0,
    cacheWritesPrice: 6.25,
    cacheReadsPrice: 0.5,
  },
  "claude-opus-4-6:fast": {
    maxTokens: 128_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 30.0,
    outputPrice: 150.0,
    cacheWritesPrice: 37.5,
    cacheReadsPrice: 3.0,
    description:
      "Anthropic fast mode preview for Claude Opus 4.6. Same model and capabilities with higher output token speed at premium pricing. Requires fast mode access on your Anthropic account.",
  },
  "claude-opus-4-6:1m": {
    maxTokens: 128_000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 5.0,
    outputPrice: 25.0,
    cacheWritesPrice: 6.25,
    cacheReadsPrice: 0.5,
    tiers: CLAUDE_OPUS_1M_TIERS,
  },
  "claude-opus-4-6:1m:fast": {
    maxTokens: 128_000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 30.0,
    outputPrice: 150.0,
    cacheWritesPrice: 37.5,
    cacheReadsPrice: 3.0,
    description:
      "Anthropic fast mode preview for Claude Opus 4.6 with the 1M context beta enabled. Same model and capabilities with higher output token speed at premium pricing across the full 1M context window. Requires both fast mode and 1M context access on your Anthropic account.",
  },
  "claude-opus-4-5-20251101": {
    maxTokens: 64_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 5.0,
    outputPrice: 25.0,
    cacheWritesPrice: 6.25,
    cacheReadsPrice: 0.5,
  },
  "claude-opus-4-1-20250805": {
    maxTokens: 32_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritesPrice: 18.75,
    cacheReadsPrice: 1.5,
  },
  "claude-opus-4-20250514": {
    maxTokens: 32_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritesPrice: 18.75,
    cacheReadsPrice: 1.5,
  },
  "claude-3-7-sonnet-20250219": {
    maxTokens: 128_000,
    contextWindow: 200_000,
    supportsImages: true,

    supportsPromptCache: true,
    supportsReasoning: true,
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheWritesPrice: 3.75,
    cacheReadsPrice: 0.3,
  },
  "claude-3-5-sonnet-20241022": {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,

    supportsPromptCache: true,
    inputPrice: 3.0, // $3 per million input tokens
    outputPrice: 15.0, // $15 per million output tokens
    cacheWritesPrice: 3.75, // $3.75 per million tokens
    cacheReadsPrice: 0.3, // $0.30 per million tokens
  },
  "claude-3-5-haiku-20241022": {
    maxTokens: 8192,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.8,
    outputPrice: 4.0,
    cacheWritesPrice: 1.0,
    cacheReadsPrice: 0.08,
  },
  "claude-3-opus-20240229": {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheWritesPrice: 18.75,
    cacheReadsPrice: 1.5,
  },
  "claude-3-haiku-20240307": {
    maxTokens: 4096,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.25,
    outputPrice: 1.25,
    cacheWritesPrice: 0.3,
    cacheReadsPrice: 0.03,
  },
} as const satisfies Record<string, ModelInfo>; // as const assertion makes the object deeply readonly





export const openAiModelInfoSaneDefaults: OpenAiCompatibleModelInfo = {
  maxTokens: -1,
  contextWindow: 128_000,
  supportsImages: true,
  supportsPromptCache: false,
  isR1FormatRequired: false,
  inputPrice: 0,
  outputPrice: 0,
  temperature: 0,
};
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview";

// Gemini
// https://ai.google.dev/gemini-api/docs/models/gemini
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId = "gemini-3.1-pro-preview";
export const geminiModels = {
  "gemini-3.1-pro-preview": {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 4.0,
    outputPrice: 18.0,
    cacheReadsPrice: 0.4,
    thinkingConfig: {
      // If you don't specify a thinking level, Gemini will use the model's default
      // dynamic thinking level, "high", for Gemini 3 Pro Preview.
      geminiThinkingLevel: "high",
      supportsThinkingLevel: true,
    },
    tiers: [
      {
        contextWindow: 200000,
        inputPrice: 2.0,
        outputPrice: 12.0,
        cacheReadsPrice: 0.2,
      },
      {
        contextWindow: Number.POSITIVE_INFINITY,
        inputPrice: 4.0,
        outputPrice: 18.0,
        cacheReadsPrice: 0.4,
      },
    ],
  },
  "gemini-3-pro-preview": {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 4.0,
    outputPrice: 18.0,
    cacheReadsPrice: 0.4,
    thinkingConfig: {
      geminiThinkingLevel: "high",
      supportsThinkingLevel: true,
    },
    tiers: [
      {
        contextWindow: 200000,
        inputPrice: 2.0,
        outputPrice: 12.0,
        cacheReadsPrice: 0.2,
      },
      {
        contextWindow: Number.POSITIVE_INFINITY,
        inputPrice: 4.0,
        outputPrice: 18.0,
        cacheReadsPrice: 0.4,
      },
    ],
  },
  "gemini-3-flash-preview": {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    supportsGlobalEndpoint: true,
    inputPrice: 0.5,
    outputPrice: 3.0,
    cacheWritesPrice: 0.05,
    supportsReasoning: true,
    thinkingConfig: {
      geminiThinkingLevel: "low",
      supportsThinkingLevel: true,
    },
    tiers: [
      {
        contextWindow: 200000,
        inputPrice: 0.3,
        outputPrice: 2.5,
        cacheReadsPrice: 0.03,
      },
      {
        contextWindow: Number.POSITIVE_INFINITY,
        inputPrice: 0.3,
        outputPrice: 2.5,
        cacheReadsPrice: 0.03,
      },
    ],
  },
  "gemini-2.5-pro": {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2.5,
    outputPrice: 15,
    cacheReadsPrice: 0.625,
    thinkingConfig: {
      maxBudget: 32767,
    },
    tiers: [
      {
        contextWindow: 200000,
        inputPrice: 1.25,
        outputPrice: 10,
        cacheReadsPrice: 0.31,
      },
      {
        contextWindow: Number.POSITIVE_INFINITY,
        inputPrice: 2.5,
        outputPrice: 15,
        cacheReadsPrice: 0.625,
      },
    ],
  },
  "gemini-2.5-flash-lite-preview-06-17": {
    maxTokens: 64000,
    contextWindow: 1_000_000,
    supportsImages: true,
    supportsPromptCache: true,
    supportsGlobalEndpoint: true,
    inputPrice: 0.1,
    outputPrice: 0.4,
    cacheReadsPrice: 0.025,
    description: "Preview version - may not be available in all regions",
    thinkingConfig: {
      maxBudget: 24576,
    },
  },
  "gemini-2.5-flash": {
    maxTokens: 65536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.3,
    outputPrice: 2.5,
    cacheReadsPrice: 0.075,
    thinkingConfig: {
      maxBudget: 24576,
      outputPrice: 3.5,
    },
  },
  "gemini-2.0-flash-001": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.1,
    outputPrice: 0.4,
    cacheReadsPrice: 0.025,
    cacheWritesPrice: 1.0,
  },
  "gemini-2.0-flash-lite-preview-02-05": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-pro-exp-02-05": {
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-thinking-exp-01-21": {
    maxTokens: 65_536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-thinking-exp-1219": {
    maxTokens: 8192,
    contextWindow: 32_767,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-exp": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-flash-002": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.15, // Default price (highest tier)
    outputPrice: 0.6, // Default price (highest tier)
    cacheReadsPrice: 0.0375,
    cacheWritesPrice: 1.0,
    tiers: [
      {
        contextWindow: 128000,
        inputPrice: 0.075,
        outputPrice: 0.3,
        cacheReadsPrice: 0.01875,
      },
      {
        contextWindow: Number.POSITIVE_INFINITY,
        inputPrice: 0.15,
        outputPrice: 0.6,
        cacheReadsPrice: 0.0375,
      },
    ],
  },
  "gemini-1.5-flash-exp-0827": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-flash-8b-exp-0827": {
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-pro-002": {
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-pro-exp-0827": {
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-exp-1206": {
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
} as const satisfies Record<string, ModelInfo>;

// OpenAI Native
// https://openai.com/api/pricing/
export type OpenAiNativeModelId = keyof typeof openAiNativeModels;
export const openAiNativeDefaultModelId: OpenAiNativeModelId = "gpt-5.2";
export const openAiNativeModels = {
  "gpt-5.2": {
    maxTokens: 8_192,
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.75,
    outputPrice: 14.0,
    cacheReadsPrice: 0.175,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5.2-codex": {
    maxTokens: 8_192, // 128000 breaks context window truncation
    contextWindow: 400000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.75,
    outputPrice: 14.0,
    cacheReadsPrice: 0.175,
    apiFormat: ApiFormat.OPENAI_RESPONSES_WEBSOCKET_MODE,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5.1-2025-11-13": {
    maxTokens: 8_192,
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheReadsPrice: 0.125,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5.1": {
    maxTokens: 8_192, // 128000 breaks context window truncation
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheReadsPrice: 0.125,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5.1-codex": {
    maxTokens: 8_192, // 128000 breaks context window truncation
    contextWindow: 400000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheReadsPrice: 0.125,
    apiFormat: ApiFormat.OPENAI_RESPONSES_WEBSOCKET_MODE,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5.1-chat-latest": {
    maxTokens: 8_192,
    contextWindow: 400000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10,
    cacheReadsPrice: 0.125,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5-2025-08-07": {
    maxTokens: 8_192, // 128000 breaks context window truncation
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheReadsPrice: 0.125,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5-codex": {
    maxTokens: 8_192, // 128000 breaks context window truncation
    contextWindow: 400000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10.0,
    cacheReadsPrice: 0.125,
    apiFormat: ApiFormat.OPENAI_RESPONSES_WEBSOCKET_MODE,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5-mini-2025-08-07": {
    maxTokens: 8_192,
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.25,
    outputPrice: 2.0,
    cacheReadsPrice: 0.025,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5-nano-2025-08-07": {
    maxTokens: 8_192,
    contextWindow: 272000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.05,
    outputPrice: 0.4,
    cacheReadsPrice: 0.005,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  "gpt-5-chat-latest": {
    maxTokens: 8_192,
    contextWindow: 400000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.25,
    outputPrice: 10,
    cacheReadsPrice: 0.125,
    temperature: 1,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
  },
  o3: {
    maxTokens: 100_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2.0,
    outputPrice: 8.0,
    cacheReadsPrice: 0.5,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
    supportsTools: false,
  },
  "o4-mini": {
    maxTokens: 100_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.1,
    outputPrice: 4.4,
    cacheReadsPrice: 0.275,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
    supportsTools: false,
  },
  "gpt-4.1": {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2,
    outputPrice: 8,
    cacheReadsPrice: 0.5,
    temperature: 0,
  },
  "gpt-4.1-mini": {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.4,
    outputPrice: 1.6,
    cacheReadsPrice: 0.1,
    temperature: 0,
  },
  "gpt-4.1-nano": {
    maxTokens: 32_768,
    contextWindow: 1_047_576,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.1,
    outputPrice: 0.4,
    cacheReadsPrice: 0.025,
    temperature: 0,
  },
  "o3-mini": {
    maxTokens: 100_000,
    contextWindow: 200_000,
    supportsImages: false,
    supportsPromptCache: true,
    inputPrice: 1.1,
    outputPrice: 4.4,
    cacheReadsPrice: 0.55,
    systemRole: "developer",
    supportsReasoning: true,
    supportsReasoningEffort: true,
    supportsTools: false,
  },
  // don't support tool use yet
  o1: {
    maxTokens: 100_000,
    contextWindow: 200_000,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 15,
    outputPrice: 60,
    cacheReadsPrice: 7.5,
    supportsStreaming: false,
  },
  "o1-preview": {
    maxTokens: 32_768,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 15,
    outputPrice: 60,
    cacheReadsPrice: 7.5,
    supportsStreaming: false,
  },
  "o1-mini": {
    maxTokens: 65_536,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 1.1,
    outputPrice: 4.4,
    cacheReadsPrice: 0.55,
    supportsStreaming: false,
  },
  "gpt-4o": {
    maxTokens: 4_096,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 2.5,
    outputPrice: 10,
    cacheReadsPrice: 1.25,
    temperature: 0,
  },
  "gpt-4o-mini": {
    maxTokens: 16_384,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: true,
    inputPrice: 0.15,
    outputPrice: 0.6,
    cacheReadsPrice: 0.075,
    temperature: 0,
  },
  "chatgpt-4o-latest": {
    maxTokens: 16_384,
    contextWindow: 128_000,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 5,
    outputPrice: 15,
    temperature: 0,
  },
} as const satisfies Record<string, OpenAiCompatibleModelInfo>;

// OpenRouter
// https://openrouter.ai/models?order=newest&supported_parameters=tools
export const openRouterDefaultModelId = "anthropic/claude-sonnet-4.5"; // will always exist in openRouterModels
export const openRouterDefaultModelInfo: ModelInfo = {
  maxTokens: 64_000,
  contextWindow: 200_000,
  supportsImages: true,
  supportsPromptCache: true,
  inputPrice: 3.0,
  outputPrice: 15.0,
  cacheWritesPrice: 3.75,
  cacheReadsPrice: 0.3,
  description:
    "Claude Sonnet 4.5 delivers superior intelligence across coding, agentic search, and AI agent capabilities. It's a powerful choice for agentic coding, and can complete tasks across the entire software development lifecycle, from initial planning to bug fixes, maintenance to large refactors. It offers strong performance in both planning and solving for complex coding tasks, making it an ideal choice to power end-to-end software development processes.\n\nRead more in the [blog post here](https://www.anthropic.com/claude/sonnet)",
};
