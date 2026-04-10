import { CLAUDE_SONNET_1M_SUFFIX } from "@shared/api.ts";
import type { ModelInfo } from "@shared/api.ts";
import type { Mode } from "@shared/storage/types.ts";
import type React from "react";
import { useMemo } from "react";
import ReasoningEffortSelector from "../ReasoningEffortSelector";
import ThinkingBudgetSlider from "../ThinkingBudgetSlider";
import { supportsReasoningEffortForModelId } from "../utils/providerUtils";
import { ContextWindowSwitcher } from "./ContextWindowSwitcher";
import { ModelInfoView } from "./ModelInfoView";

export interface ModelPickerLayoutProps {
	currentMode: Mode;
	isPopup?: boolean;
	showProviderRouting?: boolean;
	selectedModelId: string;
	selectedModelInfo: ModelInfo;
	onModelChange: (modelId: string) => void;
	onProviderSortingChange?: (value: string) => void;
	providerSorting?: string;
	modelPicker: React.ReactNode;
	extraContent?: React.ReactNode;
	models?: Record<string, ModelInfo>;
}

/**
 * A reusable layout component for model selection across different providers.
 * Consolidates the model picker, context window switchers, sliders, and info view.
 */
export const ModelPickerLayout: React.FC<ModelPickerLayoutProps> = ({
	currentMode,
	isPopup,
	showProviderRouting,
	selectedModelId,
	selectedModelInfo,
	onModelChange,
	onProviderSortingChange,
	providerSorting,
	modelPicker,
	extraContent,
	models,
}) => {
	const selectedModelIdLower = selectedModelId?.toLowerCase() || "";
	const showReasoningEffort = useMemo(() => supportsReasoningEffortForModelId(selectedModelId), [selectedModelId]);

	const showBudgetSlider = useMemo(() => {
		if (showReasoningEffort) {
			return false;
		}
		return (
			Object.entries(models ?? {}).some(([id, m]) => id === selectedModelId && m.thinkingConfig) ||
			selectedModelIdLower.includes("claude-opus-4.6") ||
			selectedModelIdLower.includes("claude-haiku-4.5") ||
			selectedModelIdLower.includes("claude-4.5-haiku") ||
			selectedModelIdLower.includes("claude-sonnet-4.6") ||
			selectedModelIdLower.includes("claude-sonnet-4-6") ||
			selectedModelIdLower.includes("claude-4.6-sonnet") ||
			selectedModelIdLower.includes("claude-sonnet-4.5") ||
			selectedModelIdLower.includes("claude-sonnet-4") ||
			selectedModelIdLower.includes("claude-opus-4.1") ||
			selectedModelIdLower.includes("claude-opus-4") ||
			selectedModelIdLower.includes("claude-opus-4.5") ||
			selectedModelIdLower.includes("claude-3-7-sonnet") ||
			selectedModelIdLower.includes("claude-3.7-sonnet") ||
			selectedModelIdLower.includes("claude-3.7-sonnet:thinking")
		);
	}, [models, selectedModelId, selectedModelIdLower, showReasoningEffort]);

	return (
		<div style={{ width: "100%", paddingBottom: 2 }}>
			<div style={{ display: "flex", flexDirection: "column" }}>
				{modelPicker}

				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-opus-4.6${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-opus-4.6"
					onModelChange={onModelChange}
					selectedModelId={selectedModelId}
				/>
				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-sonnet-4.6${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-sonnet-4.6"
					onModelChange={onModelChange}
					selectedModelId={selectedModelId}
				/>
				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-sonnet-4.5${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-sonnet-4.5"
					onModelChange={onModelChange}
					selectedModelId={selectedModelId}
				/>
				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-sonnet-4${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-sonnet-4"
					onModelChange={onModelChange}
					selectedModelId={selectedModelId}
				/>
			</div>

			{showBudgetSlider && <ThinkingBudgetSlider currentMode={currentMode} />}
			{showReasoningEffort && <ReasoningEffortSelector currentMode={currentMode} />}

			<ModelInfoView
				isPopup={isPopup}
				modelInfo={selectedModelInfo}
				onProviderSortingChange={onProviderSortingChange}
				providerSorting={providerSorting}
				selectedModelId={selectedModelId}
				showProviderRouting={showProviderRouting}
			/>

			{extraContent}
		</div>
	);
};
