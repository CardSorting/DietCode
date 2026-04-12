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
export type Builtin = Date | ((...args: unknown[]) => unknown) | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends globalThis.Array<infer U>
    ? globalThis.Array<DeepPartial<U>>
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : T extends Record<string, unknown>
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : Partial<T>;

export type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin
  ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

export interface MessageFns<T> {
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
  // biome-ignore lint/suspicious/noExplicitAny: Protobus compatibility shim
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
}

export function createMsg<T extends object>(defaultValue: T): MessageFns<T> {
  return {
    create: (base) => ({ ...defaultValue, ...base } as T),
    fromPartial: (obj) => ({ ...defaultValue, ...obj } as T),
    // biome-ignore lint/suspicious/noExplicitAny: Protobus compatibility shim
    fromJSON: (obj: any) => ({ ...defaultValue, ...obj } as T),
    toJSON: (msg: T) => msg,
  };
}

export const Metadata = createMsg<Metadata>({});
export const EmptyRequest = createMsg<EmptyRequest>({});
export const Empty = createMsg<Empty>({});
export const StringRequest = createMsg<StringRequest>({ value: "" });
export const StringArrayRequest = createMsg<StringArrayRequest>({ value: [] });
/** Consistent renaming for values */
export const StringValue = createMsg<StringValue>({ value: "" });
export const Int64Request = createMsg<Int64Request>({ value: 0 });
export const Int64 = createMsg<Int64>({ value: 0 });
export const BytesRequest = createMsg<BytesRequest>({ value: new Uint8Array() });
export const Bytes = createMsg<Bytes>({ value: new Uint8Array() });
export const BooleanRequest = createMsg<BooleanRequest>({ value: false });
/** Consistent renaming for values */
export const BooleanValue = createMsg<BooleanValue>({ value: false });
export const BooleanResponse = createMsg<BooleanResponse>({ value: false });
export const StringArray = createMsg<StringArray>({ values: [] });
export const StringArrays = createMsg<StringArrays>({ values1: [], values2: [] });
export const KeyValuePair = createMsg<KeyValuePair>({ key: "", value: "" });
export const FileDiagnostics = createMsg<FileDiagnostics>({ filePath: "", diagnostics: [] });
export const Diagnostic = createMsg<Diagnostic>({ message: "", range: undefined, severity: DiagnosticSeverity.DIAGNOSTIC_ERROR });
export const DiagnosticRange = createMsg<DiagnosticRange>({ start: undefined, end: undefined });
export const DiagnosticPosition = createMsg<DiagnosticPosition>({ line: 0, character: 0 });

/** Static aliases for compatibility if anyone still expects the old names (with lint suppression) */
export type String = StringValue;
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export const String = StringValue;
export type Boolean = BooleanValue;
// biome-ignore lint/suspicious/noShadowRestrictedNames: Legacy compatibility
export const Boolean = BooleanValue;
