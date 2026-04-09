import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings.ts";

export interface ActionMetadata {
  id: keyof AutoApprovalSettings["actions"] | "enableNotifications";
  label: string;
  shortName: string;
  icon: string;
  subAction?: ActionMetadata;
  sub?: boolean;
  parentActionId?: string;
}
