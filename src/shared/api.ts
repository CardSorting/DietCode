import type { ApiFormat } from "./proto/cline/models";
import type { ApiHandlerSettings } from "./storage/state-keys";

export type ApiProvider =
  | "gemini";

export const DEFAULT_API_PROVIDER = "gemini" as ApiProvider;

export interface ApiHandlerOptions extends Partial<ApiHandlerSettings> {
  ulid?: string; // Used to identify the task in API requests
  apiModelId?: string;
  geminiApiKey?: string;
  geminiModelId?: string;
  modelInfo?: ModelInfo;
  planModeGeminiApiKey?: string;
  actModeGeminiApiKey?: string;
  planModeGeminiBaseUrl?: string;
  actModeGeminiBaseUrl?: string;
  geminiBaseUrl?: string;
  geminiPlanModeThinkingLevel?: string;
  geminiActModeThinkingLevel?: string;
  planModeApiProvider?: ApiProvider;
  actModeApiProvider?: ApiProvider;
  onRetryAttempt?: (attempt: number, maxRetries: number, delay: number, error: unknown) => void;
}


export type ApiConfiguration = ApiHandlerOptions;

export const GEMINI_MIN_THINKING_BUDGET = 1024;
export const GEMINI_MAX_THINKING_BUDGET = 64000;


// Models

interface PriceTier {
  tokenLimit: number; // Upper limit (inclusive) of *input* tokens for this price. Use Infinity for the highest tier.
  price: number; // Price per million tokens for this tier.
}

export interface ModelInfo {
  id: string;
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

// Gemini
// https://ai.google.dev/gemini-api/docs/models/gemini
export type GeminiModelId = keyof typeof geminiModels;
export const geminiDefaultModelId: GeminiModelId = "gemini-3.1-pro-preview";
export const geminiModels = {
  "gemini-3.1-pro-preview": {
    id: "gemini-3.1-pro-preview",
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
    id: "gemini-3-pro-preview",
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
    id: "gemini-3-flash-preview",
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
    id: "gemini-2.5-pro",
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
    id: "gemini-2.5-flash-lite-preview-06-17",
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
    id: "gemini-2.5-flash",
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
    id: "gemini-2.0-flash-001",
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
    id: "gemini-2.0-flash-lite-preview-02-05",
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-pro-exp-02-05": {
    id: "gemini-2.0-pro-exp-02-05",
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-thinking-exp-01-21": {
    id: "gemini-2.0-flash-thinking-exp-01-21",
    maxTokens: 65_536,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-thinking-exp-1219": {
    id: "gemini-2.0-flash-thinking-exp-1219",
    maxTokens: 8192,
    contextWindow: 32_767,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-2.0-flash-exp": {
    id: "gemini-2.0-flash-exp",
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-flash-002": {
    id: "gemini-1.5-flash-002",
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
    id: "gemini-1.5-flash-exp-0827",
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-flash-8b-exp-0827": {
    id: "gemini-1.5-flash-8b-exp-0827",
    maxTokens: 8192,
    contextWindow: 1_048_576,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-pro-002": {
    id: "gemini-1.5-pro-002",
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-1.5-pro-exp-0827": {
    id: "gemini-1.5-pro-exp-0827",
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
  "gemini-exp-1206": {
    id: "gemini-exp-1206",
    maxTokens: 8192,
    contextWindow: 2_097_152,
    supportsImages: true,
    supportsPromptCache: false,
    inputPrice: 0,
    outputPrice: 0,
  },
} as const satisfies Record<string, ModelInfo>;

