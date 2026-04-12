/* eslint-disable */

/**
 * Common Proto Module
 * Purged of binary serialization logic.
 */

export enum DiagnosticSeverity {
  DIAGNOSTIC_ERROR = 0,
  DIAGNOSTIC_WARNING = 1,
  DIAGNOSTIC_INFORMATION = 2,
  DIAGNOSTIC_HINT = 3,
  UNRECOGNIZED = -1,
}

export type Metadata = Record<string, never>;
export type EmptyRequest = Record<string, never>;
export type Empty = Record<string, never>;

export interface StringRequest {
  value: string;
}

export interface StringArrayRequest {
  value: string[];
}

/** Rename to avoid shadowing global String */
export interface StringValue {
  value: string;
}

export interface Int64Request {
  value: number;
}

export interface Int64 {
  value: number;
}

export interface BytesRequest {
  value: Uint8Array;
}

export interface Bytes {
  value: Uint8Array;
}

export interface BooleanRequest {
  value: boolean;
}

/** Rename to avoid shadowing global Boolean */
export interface BooleanValue {
  value: boolean;
}

export interface BooleanResponse {
  value: boolean;
}

export interface StringArray {
  values: string[];
}

export interface StringArrays {
  values1: string[];
  values2: string[];
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface FileDiagnostics {
  filePath: string;
  diagnostics: Diagnostic[];
}

export interface Diagnostic {
  message: string;
  range: DiagnosticRange | undefined;
  severity: DiagnosticSeverity;
  source?: string | undefined;
}

export interface DiagnosticRange {
  start: DiagnosticPosition | undefined;
  end: DiagnosticPosition | undefined;
}

export interface DiagnosticPosition {
  line: number;
  character: number;
}

// Export as objects too for any runtime checks (empty objects satisfy MessageFns if needed)
export const Metadata = {};
export const EmptyRequest = {};
export const Empty = {};
export const StringRequest = {};
export const StringArrayRequest = {};
/** Consistent renaming for values */
export const StringValue = {};
export const Int64Request = {};
export const Int64 = {};
export const BytesRequest = {};
export const Bytes = {};
export const BooleanRequest = {};
/** Consistent renaming for values */
export const BooleanValue = {};
export const BooleanResponse = {};
export const StringArray = {};
export const StringArrays = {};
export const KeyValuePair = {};
export const FileDiagnostics = {};
export const Diagnostic = {};
export const DiagnosticRange = {};
export const DiagnosticPosition = {};

/** Static aliases for compatibility if anyone still expects the old names (with lint suppression) */
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export type String = StringValue;
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export const String = StringValue;
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export type Boolean = BooleanValue;
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export const Boolean = BooleanValue;
