/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * [LAYER: PLUMBING]
 * Principle: Pure, stateless string utilities.
 * Zero context or layer dependencies.
 */

export const truncate = (str: string, max: number): string => {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}...`;
};
