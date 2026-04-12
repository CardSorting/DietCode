/**
 * Global shared types for proto definitions.
 * Purged of binary serialization dependencies.
 */

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

export function longToNumber(int64: { toString(): string }): number {
  const num = globalThis.Number(int64.toString());
  if (num > globalThis.Number.MAX_SAFE_INTEGER) {
    throw new globalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  if (num < globalThis.Number.MIN_SAFE_INTEGER) {
    throw new globalThis.Error("Value is smaller than Number.MIN_SAFE_INTEGER");
  }
  return num;
}

export function isSet(value: unknown): boolean {
  return value !== null && value !== undefined;
}

/** 
 * MessageFns interface for compatibility. 
 * Methods are purged as they are not used for binary serialization in the current bridge.
 */
export interface MessageFns<T> {
  // Methods removed to reduce bloat
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
