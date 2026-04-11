import { describe, it, expect } from "vitest";
import type { ModelInfo } from "@shared/api.ts";
import {
  calculateApiCost,
} from "@utils/cost";

/**
 * [LAYER: WEBVIEW / UTILS / TESTS]
 * Hardened cost calculation tests for Gemini-only infrastructure.
 */
describe("Cost Utilities", () => {
  describe("calculateApiCost (Gemini Native)", () => {
    it("should calculate basic input/output costs", () => {
      const modelInfo: ModelInfo = {
        supportsPromptCache: false,
        inputPrice: 3.0, // $3 per million tokens
        outputPrice: 15.0, // $15 per million tokens
      };

      const cost = calculateApiCost(modelInfo, 1000, 500);
      // Input: (3.0 / 1_000_000) * 1000 = 0.003
      // Output: (15.0 / 1_000_000) * 500 = 0.0075
      // Total: 0.003 + 0.0075 = 0.0105
      expect(cost).toBe(0.0105);
    });

    it("should handle missing prices", () => {
      const modelInfo: ModelInfo = {
        supportsPromptCache: true,
        // No prices specified
      };

      const cost = calculateApiCost(modelInfo, 1000, 500);
      expect(cost).toBe(0);
    });

    it("should handle Gemini-style caching (Input Includes Cached)", () => {
      const modelInfo: ModelInfo = {
        maxTokens: 8192,
        contextWindow: 1_000_000,
        supportsImages: true,
        supportsPromptCache: true,
        inputPrice: 0.15,  // $0.15 per million
        outputPrice: 0.6,   // $0.60 per million
        cacheReadsPrice: 0.0375 // 25% of input price
      };

      // Scenario: 10,000 total input tokens reported, with 8,000 cached.
      // Math: inputCost = (0.15 * (10000 - 8000)) + (0.0375 * 8000)
      // Extra Input: 0.15 * 2000 / 1,000,000 = 0.0003
      // Cached Input: 0.0375 * 8000 / 1,000,000 = 0.0003
      // Output: 0.6 * 1000 / 1,000,000 = 0.0006
      // Total: 0.0012
      const cost = calculateApiCost(modelInfo, 10000, 1000, 0, 8000);
      expect(cost).toBe(0.0012);
    });

    it("should handle zero token counts", () => {
      const modelInfo: ModelInfo = {
        supportsPromptCache: true,
        inputPrice: 3.0,
        outputPrice: 15.0,
      };

      const cost = calculateApiCost(modelInfo, 0, 0, 0, 0);
      expect(cost).toBe(0);
    });
  });
});
