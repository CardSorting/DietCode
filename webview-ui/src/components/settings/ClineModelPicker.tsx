import { useExtensionState } from "@/context/ExtensionStateContext";
import { ModelsServiceClient } from "@/services/grpc-client";
import { openRouterDefaultModelId } from "@shared/api.ts";
import { CLINE_RECOMMENDED_MODELS_FALLBACK } from "@shared/cline/recommended-models.ts";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import {
  type ClineRecommendedModel,
  ClineRecommendedModelsResponse,
} from "@shared/nice-grpc/cline/models.ts";
import type { Mode } from "@shared/storage/types";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import FeaturedModelCard from "./FeaturedModelCard";
import { FuzzyModelPicker } from "./common/FuzzyModelPicker";
import { ModelPickerLayout } from "./common/ModelPickerLayout";
import {
  filterOpenRouterModelIds,
  getModeSpecificFields,
  normalizeApiConfiguration,
} from "./utils/providerUtils";
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers";

export interface ClineModelPickerProps {
  isPopup?: boolean;
  currentMode: Mode;
  showProviderRouting?: boolean;
  initialTab?: "recommended" | "free";
}

interface FeaturedModelCardEntry {
  id: string;
  description: string;
  label: string;
}

const CLINE_RECOMMENDED_MODELS_RETRY_DELAY_MS = 5000;

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function toFeaturedModelCardEntry(
  model: Pick<ClineRecommendedModel, "id" | "description" | "tags">,
  fallbackLabel: string,
): FeaturedModelCardEntry | null {
  if (!model.id) return null;
  const firstTag = model.tags?.[0];
  const normalizedLabel = typeof firstTag === "string" && firstTag.length > 0 ? firstTag.toUpperCase() : undefined;
  return {
    id: model.id,
    description: model.description || (fallbackLabel === "FREE" ? "Free model" : "Recommended model"),
    label: normalizedLabel || fallbackLabel,
  };
}

const RECOMMENDED_MODELS_FALLBACK: FeaturedModelCardEntry[] =
  CLINE_RECOMMENDED_MODELS_FALLBACK.recommended
    .map((model) => toFeaturedModelCardEntry(model, "RECOMMENDED"))
    .filter((model): model is FeaturedModelCardEntry => model !== null);

const FREE_MODELS_FALLBACK: FeaturedModelCardEntry[] = CLINE_RECOMMENDED_MODELS_FALLBACK.free
  .map((model) => toFeaturedModelCardEntry(model, "FREE"))
  .filter((model): model is FeaturedModelCardEntry => model !== null);

const ClineModelPicker: React.FC<ClineModelPickerProps> = ({
  isPopup,
  currentMode,
  showProviderRouting,
  initialTab,
}) => {
  const { handleModeFieldsChange, handleFieldChange } = useApiConfigurationHandlers();
  const { apiConfiguration, favoritedModelIds, clineModels } = useExtensionState();
  const modeFields = getModeSpecificFields(apiConfiguration, currentMode);

  const [clineRecommendedModels, setClineRecommendedModels] = useState<FeaturedModelCardEntry[]>([]);
  const [clineFreeModels, setClineFreeModels] = useState<FeaturedModelCardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"recommended" | "free">(initialTab ?? "recommended");

  const freeClineModelIds = useMemo(() => {
    const models = clineFreeModels.length > 0 ? clineFreeModels : FREE_MODELS_FALLBACK;
    return [...new Set(models.map((m) => m.id))];
  }, [clineFreeModels]);

  const freeClineModelIdSet = useMemo(
    () => new Set(freeClineModelIds.map(normalizeModelId)),
    [freeClineModelIds],
  );

  const recommendedModels = useMemo(
    () => (clineRecommendedModels.length > 0 ? clineRecommendedModels : RECOMMENDED_MODELS_FALLBACK),
    [clineRecommendedModels],
  );

  const freeModels = useMemo(
    () => (clineFreeModels.length > 0 ? clineFreeModels : FREE_MODELS_FALLBACK),
    [clineFreeModels],
  );

  const fetchRef = useRef({ hasFetched: false, isFetching: false });
  const retryTimeoutRef = useRef<number | null>(null);

  const refreshModels = useCallback(async () => {
    try {
      const response = await ModelsServiceClient.makeUnaryRequest(
        "refreshClineRecommendedModelsRpc",
        EmptyRequest.create({}),
        EmptyRequest.toJSON,
        ClineRecommendedModelsResponse.fromJSON,
      );
      setClineRecommendedModels((response.recommended ?? []).map((m) => toFeaturedModelCardEntry(m, "RECOMMENDED")).filter((m): m is FeaturedModelCardEntry => m !== null));
      setClineFreeModels((response.free ?? []).map((m) => toFeaturedModelCardEntry(m, "FREE")).filter((m): m is FeaturedModelCardEntry => m !== null));
      return true;
    } catch (error) {
      console.error("Failed to refresh Cline recommended models:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (fetchRef.current.hasFetched || fetchRef.current.isFetching) return;
      fetchRef.current.isFetching = true;
      const succeeded = await refreshModels();
      fetchRef.current.isFetching = false;
      if (succeeded) {
        fetchRef.current.hasFetched = true;
      } else {
        retryTimeoutRef.current = window.setTimeout(fetch, CLINE_RECOMMENDED_MODELS_RETRY_DELAY_MS);
      }
    };
    fetch();
    return () => {
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    };
  }, [refreshModels]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      const currentModelId = modeFields.clineModelId || openRouterDefaultModelId;
      setActiveTab(freeClineModelIdSet.has(normalizeModelId(currentModelId)) ? "free" : "recommended");
    }
  }, [modeFields.clineModelId, freeClineModelIdSet, initialTab]);

  const modelIds = useMemo(() => {
    const unfiltered = Object.keys(clineModels ?? {}).sort();
    return filterOpenRouterModelIds(unfiltered, "cline", freeClineModelIds);
  }, [clineModels, freeClineModelIds]);

  const handleModelChange = (newModelId: string) => {
    handleModeFieldsChange(
      {
        clineModelId: { plan: "planModeClineModelId", act: "actModeClineModelId" },
        clineModelInfo: { plan: "planModeClineModelInfo", act: "actModeClineModelInfo" },
      },
      {
        clineModelId: newModelId,
        clineModelInfo: clineModels?.[newModelId],
      },
      currentMode,
    );
  };

  const { selectedModelId, selectedModelInfo } = useMemo(() => {
    const selected = normalizeApiConfiguration(apiConfiguration, currentMode);
    if (freeClineModelIdSet.has(normalizeModelId(selected.selectedModelId))) {
      return {
        ...selected,
        selectedModelInfo: {
          ...selected.selectedModelInfo,
          inputPrice: 0,
          outputPrice: 0,
          cacheReadsPrice: 0,
          cacheWritesPrice: 0,
        },
      };
    }
    return selected;
  }, [apiConfiguration, currentMode, freeClineModelIdSet]);

  return (
    <ModelPickerLayout
      currentMode={currentMode}
      isPopup={isPopup}
      models={clineModels}
      onModelChange={handleModelChange}
      onProviderSortingChange={(value) => handleFieldChange("openRouterProviderSorting", value)}
      providerSorting={apiConfiguration?.openRouterProviderSorting}
      selectedModelId={selectedModelId}
      selectedModelInfo={selectedModelInfo}
      showProviderRouting={showProviderRouting}
      modelPicker={
        <>
          <TabsContainer style={{ marginTop: 4 }}>
            <Tab active={activeTab === "recommended"} onClick={() => setActiveTab("recommended")}>
              Recommended
            </Tab>
            <Tab active={activeTab === "free"} onClick={() => setActiveTab("free")}>
              Free
            </Tab>
          </TabsContainer>

          <div style={{ marginBottom: "6px" }}>
            {(activeTab === "recommended" ? recommendedModels : freeModels).map((model) => (
              <FeaturedModelCard
                description={model.description}
                isSelected={selectedModelId === model.id}
                key={model.id}
                label={model.label}
                modelId={model.id}
                onClick={() => handleModelChange(model.id)}
              />
            ))}
          </div>

          <FuzzyModelPicker
            favoritedModelIds={favoritedModelIds}
            modelIds={modelIds}
            onModelChange={handleModelChange}
            selectedModelId={selectedModelId}
          />
        </>
      }
      extraContent={
        !modelIds.some((id) => id.toLowerCase() === selectedModelId.toLowerCase()) && (
          <p style={{ fontSize: "12px", marginTop: 0, color: "var(--vscode-descriptionForeground)" }}>
            The extension automatically fetches the latest Cline model list. If you're unsure which model to choose, Cline works best with <strong>anthropic/claude-sonnet-4.5</strong>.
          </p>
        )
      }
    />
  );
};

export default memo(ClineModelPicker);

const TabsContainer = styled.div`
	display: flex;
	gap: 0;
	margin-bottom: 12px;
	border-bottom: 1px solid #333;
`;

const Tab = styled.div<{ active: boolean }>`
	padding: 8px 16px;
	cursor: pointer;
	font-size: 12px;
	font-weight: 500;
	color: ${({ active }) => (active ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
	border-bottom: 2px solid ${({ active }) => (active ? "var(--vscode-textLink-foreground)" : "transparent")};
	transition: all 0.15s ease;

	&:hover {
		color: var(--vscode-foreground);
	}
`;
