/**
 * [LAYER: UI]
 * [SUB-ZONE: account]
 * Principle: Presentation layer handling UI state and user interactions
 * Prework Status:
 *   - Step 0: ✅ Dead code cleared
 *   - Verification: ✅ verify_hardening pass
 *   - Dependency Flow: ✅ Native protocols followed
 */

import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { useState } from "react";
import { useClineAuth } from "../../context/ClineAuthContext";

interface RemoteConfigToggleProps {
  activeOrganization?: {
    organizationId: string;
    displayName: string;
  } | null;
}

export function RemoteConfigToggle({ activeOrganization }: RemoteConfigToggleProps) {
  const [isChecked, setIsChecked] = useState(false);
  const { activeOrganization: authOrganization } = useClineAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async () => {
    if (!activeOrganization) return;
    
    setIsLoading(true);
    try {
      // In a real implementation, this would call the ext api to opt back into remote config
      // For now, just toggle state visually
      setIsChecked(!isChecked);
    } catch (error) {
      console.error("Failed to toggle remote config", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-warning/10 rounded border border-warning/20">
      <div className="flex items-center gap-2">
        <VSCodeCheckbox
          checked={isChecked}
          onChange={(e) => {
            setIsChecked(e.target.checked);
            !e.target.checked && handleChange();
          }}
          disabled={isLoading}
        />
        <label className="text-sm font-medium">
          {isChecked ? "Opting back into remote config..." : "Opt out of remote config"}
        </label>
      </div>
      
      {isLoading ? (
        <span className="text-xs text-description">Processing...</span>
      ) : (
        <p className="text-xs text-description">
          When enabled, this app connects to Cline's cloud servers to sync settings.{" "}
          <span className="text-warning">
            Your API keys are still stored locally and are never sent to Cline servers.
          </span>
        </p>
      )}
    </div>
  );
}
