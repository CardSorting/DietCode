/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GLOBAL_STATE_FIELDS } from "./fields/global";
import { API_HANDLER_SETTINGS_FIELDS } from "./fields/api";
import { USER_SETTINGS_FIELDS } from "./fields/user";

export { API_HANDLER_SETTINGS_FIELDS };
export { GLOBAL_STATE_FIELDS, USER_SETTINGS_FIELDS };
export const SETTINGS_FIELDS = { ...API_HANDLER_SETTINGS_FIELDS, ...USER_SETTINGS_FIELDS };
export const GLOBAL_STATE_AND_SETTINGS_FIELDS = { ...GLOBAL_STATE_FIELDS, ...SETTINGS_FIELDS };

export const SECRET_KEYS = [
  "geminiApiKey",
] as const;

export const LocalStateKeys = [
  "localClineRulesToggles",
  "localCursorRulesToggles",
  "localWindsurfRulesToggles",
  "localAgentsRulesToggles",
  "localSkillsToggles",
  "workflowToggles",
] as const;
