import type { ModelInfo } from "@shared/api.ts";
import type { Mode } from "@shared/storage/types.ts";
import type React from "react";
import { useMemo } from "react";
import ReasoningEffortSelector from "../ReasoningEffortSelector";
import ThinkingBudgetSlider from "../ThinkingBudgetSlider";
import { supportsReasoningEffortForModelId } from "../utils/providerUtils";
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
	const showReasoningEffort = useMemo(() => supportsReasoningEffortForModelId(selectedModelId), [selectedModelId]);

	const showBudgetSlider = useMemo(() => {
		if (showReasoningEffort) {
			return false;
		}
		// Show budget slider if the model explicitly has a thinking configuration
		return !!selectedModelInfo.thinkingConfig;
	}, [selectedModelInfo, showReasoningEffort]);

	return (
		<div style={{ width: "100%", paddingBottom: 2 }}>
			<div style={{ display: "flex", flexDirection: "column" }}>
				{modelPicker}
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
