/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GLOBAL_STATE_FIELDS } from "./fields/global";
import { SETTINGS_FIELDS, API_HANDLER_SETTINGS_FIELDS, GLOBAL_STATE_AND_SETTINGS_FIELDS, SECRET_KEYS, LocalStateKeys as LSK } from "./config";
import { extractDefaults, extractTransforms, extractMetadata } from "./helpers";
import type { GlobalStateAndSettings, GlobalStateKey, SettingsKey, SecretKey, LocalStateKey } from "./types";

const GlobalStateKeysSet = new Set(Object.keys(GLOBAL_STATE_FIELDS));
const SettingsKeysSet = new Set(Object.keys(SETTINGS_FIELDS));
const GlobalStateAndSettingsKeySet = new Set(Object.keys(GLOBAL_STATE_AND_SETTINGS_FIELDS));
const ApiHandlerSettingsKeysSet = new Set(Object.keys(API_HANDLER_SETTINGS_FIELDS));

export const SecretKeys = Array.from(SECRET_KEYS);
export const SettingsKeys = Array.from(SettingsKeysSet) as SettingsKey[];
export const ApiHandlerSettingsKeys = Array.from(ApiHandlerSettingsKeysSet) as (keyof GlobalStateAndSettings)[];
export const GlobalStateAndSettingKeys = Array.from(GlobalStateAndSettingsKeySet) as (keyof GlobalStateAndSettings)[];

export const GLOBAL_STATE_DEFAULTS = extractDefaults(GLOBAL_STATE_FIELDS as Record<string, { default: unknown }>);
export const SETTINGS_DEFAULTS = extractDefaults(SETTINGS_FIELDS as Record<string, { default: unknown }>);
export const SETTINGS_TRANSFORMS = extractTransforms(SETTINGS_FIELDS as Record<string, { default: unknown; transform?: (v: unknown) => unknown }>);
export const ASYNC_PROPERTIES = extractMetadata({ ...GLOBAL_STATE_FIELDS, ...SETTINGS_FIELDS } as Record<string, { default: unknown; [key: string]: unknown }>, "isAsync");
export const COMPUTED_PROPERTIES = extractMetadata({ ...GLOBAL_STATE_FIELDS, ...SETTINGS_FIELDS } as Record<string, { default: unknown; [key: string]: unknown }>, "isComputed");

export const isGlobalStateKey = (key: string): key is GlobalStateKey => GlobalStateKeysSet.has(key);
export const isSettingsKey = (key: string): key is SettingsKey => SettingsKeysSet.has(key);
export const isSecretKey = (key: string): key is SecretKey => new Set(SECRET_KEYS as readonly string[]).has(key);
export const isLocalStateKey = (key: string): key is LocalStateKey => new Set(LSK as readonly string[]).has(key);

export const isAsyncProperty = (key: string): boolean => ASYNC_PROPERTIES.has(key);
export const isComputedProperty = (key: string): boolean => COMPUTED_PROPERTIES.has(key);

export const getDefaultValue = <K extends keyof GlobalStateAndSettings>(
  key: K,
): GlobalStateAndSettings[K] | undefined => {
  return ((GLOBAL_STATE_DEFAULTS as Record<string, unknown>)[key as string] ?? 
          (SETTINGS_DEFAULTS as Record<string, unknown>)[key as string]) as GlobalStateAndSettings[K] | undefined;
};

export const hasTransform = (key: string): boolean => key in SETTINGS_TRANSFORMS;
export const applyTransform = <T>(key: string, value: T): T => {
  const transform = SETTINGS_TRANSFORMS[key];
  return transform ? (transform(value) as T) : value;
};
