import { describe, it, expect } from "vitest";
import type { ApiHandlerModel } from "@core/api";
import {
  GEMINI_FLASH_MAX_OUTPUT_TOKENS,
  isGeminiFlashModel,
  modelDoesntSupportWebp,
} from "../model-utils";
import type { ModelInfo } from "@shared/api";

/**
 * [LAYER: WEBVIEW / UTILS / TESTS]
 * Hardened model utility tests consolidated for Gemini-only infrastructure.
 */

// Minimal helper — modelDoesntSupportWebp only reads apiHandlerModel.id
const m = (id: string): ApiHandlerModel => ({ id, info: {} as unknown as ModelInfo });

describe("isGeminiFlashModel", () => {
  it("should return true for Gemini Flash model IDs", () => {
    expect(isGeminiFlashModel("gemini-2.0-flash")).toBe(true);
    expect(isGeminiFlashModel("gemini-3.0-flash-preview")).toBe(true);
    expect(isGeminiFlashModel("gemini-2.0-flash-lite")).toBe(true);
  });

  it("should return false for non-Flash Gemini model IDs", () => {
    expect(isGeminiFlashModel("gemini-2.0-pro")).toBe(false);
    expect(isGeminiFlashModel("gemini-3.1-pro-preview")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isGeminiFlashModel("GEMINI-2.0-FLASH")).toBe(true);
  });
});

describe("GEMINI_FLASH_MAX_OUTPUT_TOKENS", () => {
  it("should be set to 8192", () => {
    expect(GEMINI_FLASH_MAX_OUTPUT_TOKENS).toBe(8_192);
  });
});

describe("modelDoesntSupportWebp", () => {
  it("should return false for Gemini models (which support WebP)", () => {
    expect(modelDoesntSupportWebp(m("gemini-2.0-flash"))).toBe(false);
    expect(modelDoesntSupportWebp(m("gemini-1.5-pro"))).toBe(false);
  });

  it("should return true for legacy or specific local models that lack WebP support", () => {
    // Current implementation of modelDoesntSupportWebp might still check for grok/glm/etc.
    // but in a Gemini-only world, we focus on ensuring Gemini returns false.
    expect(modelDoesntSupportWebp(m("grok-3"))).toBe(true);
  });
});
