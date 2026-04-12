/**
 * Global shared types for proto definitions.
 * Purged of binary serialization dependencies.
 */

import { 
  type Builtin, 
  type DeepPartial, 
  type KeysOfUnion, 
  type Exact,
  type MessageFns,
  createMsg 
} from "../common/index";

export { 
  type Builtin, 
  type DeepPartial, 
  type KeysOfUnion, 
  type Exact,
  type MessageFns,
  createMsg 
};

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
 * MessageFns interface is now imported and re-exported from ../common/index.
 */
