import { useExtensionState } from "@/context/ExtensionStateContext";
import type { Mode } from "@shared/storage/types.ts";
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import { DROPDOWN_Z_INDEX, DropdownContainer } from "../common/ModelSelector";
import { getModeSpecificFields } from "../utils/providerUtils";
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers";

interface VSCodeLmProviderProps {
  currentMode: Mode;
}

export const VSCodeLmProvider = ({ currentMode }: VSCodeLmProviderProps) => {
  const { apiConfiguration, vsCodeLmModels: vsCodeLmModelsMap } = useExtensionState();
  const vsCodeLmModels = Object.values(vsCodeLmModelsMap || {});

  const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers();

  const { vsCodeLmModelSelector } = getModeSpecificFields(apiConfiguration, currentMode);

  return (
    <div>
      <DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 2}>
        <label htmlFor="vscode-lm-model">
          <span style={{ fontWeight: 500 }}>Language Model</span>
        </label>
        {vsCodeLmModels.length > 0 ? (
          <VSCodeDropdown
            id="vscode-lm-model"
            onChange={(e) => {
              const value = (e.target as HTMLInputElement).value;
              if (!value) {
                return;
              }
              const [vendor, family] = value.split("/");

              handleModeFieldChange(
                { plan: "planModeVsCodeLmModelSelector", act: "actModeVsCodeLmModelSelector" },
                { vendor, family },
                currentMode,
              );
            }}
            style={{ width: "100%" }}
            value={
              vsCodeLmModelSelector
                ? `${vsCodeLmModelSelector.vendor ?? ""}/${vsCodeLmModelSelector.family ?? ""}`
                : ""
            }
          >
            <VSCodeOption value="">Select a model...</VSCodeOption>
            {vsCodeLmModels.map((model) => (
              <VSCodeOption
                key={`${model.vendor}/${model.family}`}
                value={`${model.vendor}/${model.family}`}
              >
                {model.vendor} - {model.family}
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        ) : (
          <p
            style={{
              fontSize: "12px",
              marginTop: "5px",
              color: "var(--vscode-descriptionForeground)",
            }}
          >
            Use models from your GitHub Copilot subscription. Install the{" "}
            <a href="https://marketplace.visualstudio.com/items?itemName=GitHub.copilot">
              Copilot extension
            </a>{" "}
            and enable Claude models in Copilot settings to get started.
          </p>
        )}
      </DropdownContainer>
    </div>
  );
};
