export interface ClineRecommendedModel {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface ClineRecommendedModelsData {
  recommended: ClineRecommendedModel[];
  free: ClineRecommendedModel[];
}

/**
 * Hardcoded fallback shown when upstream recommended models are not enabled or unavailable.
 * Hard-Locked for Gemini-Only Sovereign Architecture.
 */
export const CLINE_RECOMMENDED_MODELS_FALLBACK: ClineRecommendedModelsData = {
  recommended: [
    {
      id: "gemini-2.0-flash-exp",
      name: "Google Gemini 2.0 Flash",
      description: "Next-gen ultra-fast model with strong coding performance",
      tags: ["FAST", "NEW"],
    },
    {
      id: "gemini-2.0-pro-exp-02-05",
      name: "Google Gemini 2.0 Pro",
      description: "Highest intelligence model for complex agentic workflows",
      tags: ["BEST", "NEW"],
    },
    {
       id: "gemini-2.0-flash-thinking-exp-01-21",
       name: "Google Gemini 2.0 Flash Thinking",
       description: "Experimental thinking model for advanced reasoning tasks",
       tags: ["THINKING"],
    }
  ],
  free: [
    {
      id: "gemini-1.5-flash",
      name: "Google Gemini 1.5 Flash (Free Tier)",
      description: "High-speed model available via Google AI Studio free tier",
      tags: ["FREE"],
    }
  ],
};
