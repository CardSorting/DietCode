/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { ApiProvider } from "../../api";

/**
 * Defines the shape of a field definition. Each field must have a `default` value,
 * and optionally can have `isAsync`, `isComputed`, or `transform` metadata.
 */
export type FieldDefinition<T> = {
  default: T;
  isAsync?: boolean;
  isComputed?: boolean;
  transform?: (value: unknown) => T;
};

export type FieldDefinitions = Record<string, FieldDefinition<unknown> | unknown>;

export type ConfiguredAPIKeys = Partial<Record<ApiProvider, boolean>>;

export type ExtractDefault<T> = T extends { default: infer U } ? U : never;

export type BuildInterface<T extends Record<string, { default: unknown }>> = {
  [K in keyof T]: ExtractDefault<T[K]>;
};
