import type { ModelInfo } from "@shared/api";
import type React from "react";
import { ApiKeyField } from "./ApiKeyField";
import { BaseUrlField } from "./BaseUrlField";
import { ModelSelector } from "./ModelSelector";
import { RemotelyConfiguredInputWrapper } from "./RemotelyConfiguredInputWrapper";
import { ModelPickerLayout } from "./ModelPickerLayout";
import type { Mode } from "@shared/storage/types";

export interface StandardProviderLayoutProps {
	providerName: string;
	apiKey: string;
	onApiKeyChange: (value: string) => void;
	signupUrl?: string;
	baseUrl?: string;
	onBaseUrlChange?: (value: string) => void;
	baseUrlPlaceholder?: string;
	remoteBaseUrl?: string;
	showModelOptions: boolean;
	isPopup?: boolean;
	selectedModelId: string;
	selectedModelInfo: ModelInfo;
	onModelChange: (modelId: string) => void;
	models?: Record<string, ModelInfo>;
	children?: React.ReactNode;
	currentMode?: Mode; // Optional mode for advanced picker features
	onProviderSortingChange?: (value: string) => void;
	providerSorting?: string;
}

/**
 * A reusable layout component for standard API providers.
 * Consolidates API Key, Base URL, and Model selection fields.
 */
export const StandardProviderLayout: React.FC<StandardProviderLayoutProps> = ({
	providerName,
	apiKey,
	onApiKeyChange,
	signupUrl,
	baseUrl,
	onBaseUrlChange,
	baseUrlPlaceholder,
	remoteBaseUrl,
	showModelOptions,
	isPopup,
	selectedModelId,
	selectedModelInfo,
	onModelChange,
	models,
	children,
	currentMode,
	onProviderSortingChange,
	providerSorting,
}) => {
	return (
		<div>
			<ApiKeyField initialValue={apiKey} onChange={onApiKeyChange} providerName={providerName} signupUrl={signupUrl} />

			{onBaseUrlChange && (
				<RemotelyConfiguredInputWrapper hidden={remoteBaseUrl === undefined}>
					<BaseUrlField
						disabled={remoteBaseUrl !== undefined}
						initialValue={baseUrl}
						label="Use custom base URL"
						onChange={onBaseUrlChange}
						placeholder={baseUrlPlaceholder || `Default: https://api.${providerName.toLowerCase()}.com`}
						showLockIcon={remoteBaseUrl !== undefined}
					/>
				</RemotelyConfiguredInputWrapper>
			)}

			{showModelOptions && (
				<>
					{currentMode ? (
						// Use the advanced ModelPickerLayout if currentMode is provided
						<ModelPickerLayout
							currentMode={currentMode}
							isPopup={isPopup}
							models={models}
							onModelChange={onModelChange}
							selectedModelId={selectedModelId}
							selectedModelInfo={selectedModelInfo}
							onProviderSortingChange={onProviderSortingChange}
							providerSorting={providerSorting}
							modelPicker={
								models ? (
									<ModelSelector
										label="Model"
										models={models}
										onChange={(e) => onModelChange(e.target.value)}
										selectedModelId={selectedModelId}
									/>
								) : (
									children
								)
							}
							extraContent={!models ? null : undefined} // Only use children for modelPicker if no models record
						/>
					) : (
						// Fallback to simple selector if no mode is provided (for ultra-lightweight usage)
						<>
							{models && (
								<ModelSelector
									label="Model"
									models={models}
									onChange={(e) => onModelChange(e.target.value)}
									selectedModelId={selectedModelId}
								/>
							)}
							{children}
						</>
					)}
				</>
			)}
		</div>
	);
};
