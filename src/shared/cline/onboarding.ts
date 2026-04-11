import type { OnboardingModel } from "../proto/cline/state";

/**
 * The list of models available to new users during the onboarding flow.
 * Hard-Locked for Gemini-Only Sovereign Architecture.
 */
export const CLINE_ONBOARDING_MODELS: OnboardingModel[] = [
  {
    group: "free",
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash (Free Tier)",
    score: 92,
    latency: 1,
    badge: "Fast",
    info: {
      contextWindow: 1_048_576,
      supportsImages: true,
      supportsPromptCache: true,
      inputPrice: 0,
      outputPrice: 0,
      tiers: [],
    },
  },
  {
    group: "frontier",
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    score: 96,
    latency: 1,
    badge: "Next-Gen",
    info: {
      contextWindow: 1_048_576,
      supportsImages: true,
      supportsPromptCache: true,
      inputPrice: 0.1,
      outputPrice: 0.4,
      tiers: [],
    },
  },
  {
    group: "frontier",
    id: "gemini-2.0-pro-exp-02-05",
    name: "Gemini 2.0 Pro",
    score: 98,
    latency: 3,
    badge: "Best",
    info: {
      contextWindow: 2_097_152,
      supportsImages: true,
      supportsPromptCache: true,
      inputPrice: 4.0,
      outputPrice: 18.0,
      tiers: [],
    },
  },
  {
    group: "frontier",
    id: "gemini-2.0-flash-thinking-exp-01-21",
    name: "Gemini 2.0 Thinking",
    score: 97,
    latency: 5,
    badge: "Reasoning",
    info: {
      contextWindow: 1_048_576,
      supportsImages: true,
      supportsPromptCache: true,
      inputPrice: 1.0,
      outputPrice: 4.0,
      tiers: [],
    },
  },
];
