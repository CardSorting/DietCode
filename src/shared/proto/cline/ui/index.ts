/* eslint-disable */
/**
 * UI Proto Module
 * 
 * This module provides type definitions and enums for UI messages.
 * Redundant gRPC binary serialization logic has been removed to reduce code bloat,
 * as the bridge currently utilizes JSON-based communication.
 */

export * from "./enums";
export * from "./interfaces";
export * from "./methods";
export * from "./base";
