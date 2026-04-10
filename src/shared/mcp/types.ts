/**
 * [LAYER: UI]
 * [SUB-ZONE: shared-mcp]
 * Principle: Types define domain contracts within the UI boundary
 */

export type Modality = "text" | "image" | "audio" | "video" | "tool";

// Import RemoteConfig type from INFRASTRUCTURE layer for type inference
// This provides structured access to remote configuration settings
export type { RemoteConfig } from "../../../src/shared/remote-config/schema";
