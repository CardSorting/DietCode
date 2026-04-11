/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FieldDefinitions, ConfiguredAPIKeys } from "../definitions";
import type { ApiProvider } from "../../../api";
import type { GlobalInstructionsFile } from "../../../remote-config/schema";
import type { BlobStoreSettings } from "../../DietBlobStorage";

export const REMOTE_CONFIG_EXTRA_FIELDS = {
  remoteConfiguredProviders: { default: [] as ApiProvider[] },
  allowedMCPServers: { default: [] as Array<{ id: string }> },
  remoteMCPServers: {
    default: undefined as Array<{ name: string; url: string; alwaysEnabled?: boolean }> | undefined,
  },
  previousRemoteMCPServers: {
    default: undefined as Array<{ name: string; url: string }> | undefined,
  },
  remoteGlobalRules: { default: undefined as GlobalInstructionsFile[] | undefined },
  remoteGlobalWorkflows: { default: undefined as GlobalInstructionsFile[] | undefined },
  blockPersonalRemoteMCPServers: { default: false as boolean },
  openTelemetryOtlpHeaders: { default: undefined as Record<string, string> | undefined },
  otlpMetricsHeaders: { default: undefined as Record<string, string> | undefined },
  otlpLogsHeaders: { default: undefined as Record<string, string> | undefined },
  blobStoreConfig: { default: undefined as BlobStoreSettings | undefined },
  configuredApiKeys: { default: {} as ConfiguredAPIKeys | undefined },
} satisfies FieldDefinitions;
