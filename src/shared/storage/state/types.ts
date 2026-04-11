/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { BuildInterface } from "./definitions";
import type { GLOBAL_STATE_FIELDS } from "./fields/global";
import type { API_HANDLER_SETTINGS_FIELDS } from "./fields/api";
import type { SETTINGS_FIELDS } from "./config";
import type { SECRET_KEYS, LocalStateKeys } from "./config";
import type { SovereignRulesToggles } from "../../cline-rules";

export type GlobalState = BuildInterface<typeof GLOBAL_STATE_FIELDS>;
export type Settings = BuildInterface<typeof SETTINGS_FIELDS>;
export type ApiHandlerOptionSettings = BuildInterface<typeof API_HANDLER_SETTINGS_FIELDS>;

export type Secrets = { [K in (typeof SECRET_KEYS)[number]]: string | undefined };
export type ApiHandlerSettings = ApiHandlerOptionSettings & Secrets;
export type GlobalStateAndSettings = GlobalState & Settings;

type RemoteConfigExtra = Record<string, unknown>;
export type RemoteConfigFields = GlobalStateAndSettings & RemoteConfigExtra;

export type LocalState = { [K in (typeof LocalStateKeys)[number]]: SovereignRulesToggles };

export type SecretKey = (typeof SECRET_KEYS)[number];
export type GlobalStateKey = keyof GlobalState;
export type LocalStateKey = keyof LocalState;
export type SettingsKey = keyof Settings;
export type GlobalStateAndSettingsKey = keyof GlobalStateAndSettings;
