/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BuildInterface } from "./definitions";

export function extractDefaults<T extends Record<string, { default: unknown }>>(props: T): Partial<BuildInterface<T>> {
  return Object.fromEntries(
    Object.entries(props)
      .map(([key, prop]) => [key, prop.default])
      .filter(([_, value]) => value !== undefined),
  ) as Partial<BuildInterface<T>>;
}

export function extractTransforms<T extends Record<string, { default: unknown; transform?: (v: unknown) => unknown }>>(
  props: T,
): Record<string, (v: unknown) => unknown> {
  return Object.fromEntries(
    Object.entries(props)
      .filter(([_, prop]) => prop && typeof prop === 'object' && "transform" in prop && (prop as Record<string, unknown>).transform !== undefined)
      .map(([key, prop]) => [
        key, 
        (prop as unknown as { transform: (v: unknown) => unknown }).transform
      ]),
  );
}

export function extractMetadata<T extends Record<string, { default: unknown; [key: string]: unknown }>>(props: T, field: string): Set<string> {
  return new Set(
    Object.entries(props)
      .filter(([_, prop]) => prop && typeof prop === 'object' && field in prop && (prop as Record<string, unknown>)[field] === true)
      .map(([key]) => key),
  );
}
