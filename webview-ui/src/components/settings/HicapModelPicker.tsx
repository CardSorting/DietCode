import { useExtensionState } from "@/context/ExtensionStateContext";
import { StateServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import type { Mode } from "@shared/storage/types.ts";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import Fuse from "fuse.js";
import type React from "react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMount } from "react-use";
import { highlight } from "../history/HistoryView";
import { getModeSpecificFields } from "./utils/providerUtils";
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers";

export const HICAP_MODEL_PICKER_Z_INDEX = 1_000;

// Star icon for favorites
const StarIcon = ({
  isFavorite,
  onClick,
}: { isFavorite: boolean; onClick: (e: React.MouseEvent) => void }) => {
  return (
    <button
      className={`cursor-pointer border-none bg-transparent ${isFavorite ? "text-(--vscode-terminal-ansiBlue)" : "text-(--vscode-descriptionForeground)"} ml-2 text-[16px] flex items-center justify-center select-none`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick(e as any);
        }
      }}
      type="button"
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
};

export interface HicapModelPickerProps {
  isPopup?: boolean;
  currentMode: Mode;
}

const HicapModelPicker: React.FC<HicapModelPickerProps> = ({ isPopup, currentMode }) => {
  const { handleModeFieldsChange } = useApiConfigurationHandlers();
  const { apiConfiguration, favoritedModelIds, hicapModels, refreshHicapModels } =
    useExtensionState();

  const modeFields = getModeSpecificFields(apiConfiguration, currentMode);
  const [searchTerm, setSearchTerm] = useState(modeFields.hicapModelId || "");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownListRef = useRef<HTMLDivElement>(null);

  const handleModelChange = (newModelId: string) => {
    setSearchTerm(newModelId);

    handleModeFieldsChange(
      {
        hicapModelId: { plan: "planModeHicapModelId", act: "actModeHicapModelId" },
        hicapModelInfo: { plan: "planModeHicapModelInfo", act: "actModeHicapModelInfo" },
      },
      {
        hicapModelId: newModelId,
        hicapModelInfo: {},
      },
      currentMode,
    );
  };

  useMount(refreshHicapModels);

  // Sync external changes when the modelId changes
  useEffect(() => {
    const currentModelId = modeFields.hicapModelId || "";
    setSearchTerm(currentModelId);
  }, [modeFields.hicapModelId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const modelIds = useMemo(() => {
    const unfilteredModelIds = Object.keys(hicapModels).sort((a, b) => a.localeCompare(b));

    return unfilteredModelIds;
  }, [hicapModels, modeFields.apiProvider]);

  const searchableItems = useMemo(() => {
    return modelIds.map((id) => ({
      id,
      html: id,
    }));
  }, [modelIds]);

  const fuse = useMemo(() => {
    return new Fuse(searchableItems, {
      keys: ["html"], // highlight function will update this
      threshold: 0.6,
      shouldSort: true,
      isCaseSensitive: false,
      ignoreLocation: false,
      includeMatches: true,
      minMatchCharLength: 1,
    });
  }, [searchableItems]);

  const modelSearchResults = useMemo(() => {
    // IMPORTANT: highlightjs has a bug where if you use sort/localCompare - "// results.sort((a, b) => a.id.localeCompare(b.id)) ...sorting like this causes ids in objects to be reordered and mismatched"

    // First, get all favorited models
    const favoritedModels = searchableItems.filter((item) => favoritedModelIds.includes(item.id));

    // Then get search results for non-favorited models
    const searchResults = searchTerm
      ? highlight(fuse.search(searchTerm), "model-item-highlight").filter(
          (item) => !favoritedModelIds.includes(item.id),
        )
      : searchableItems.filter((item) => !favoritedModelIds.includes(item.id));

    // Combine favorited models with search results
    return [...favoritedModels, ...searchResults];
  }, [searchableItems, searchTerm, fuse, favoritedModelIds]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownVisible) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        setIsDropdownVisible(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSelectedIndex((prev) => (prev < modelSearchResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
          handleModelChange(modelSearchResults[selectedIndex].id);
          setIsDropdownVisible(false);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsDropdownVisible(false);
        setSelectedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    setSelectedIndex(-1);
    if (dropdownListRef.current) {
      dropdownListRef.current.scrollTop = 0;
    }
  }, [searchTerm]);

  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <label htmlFor="model-search">
          <span className="font-medium">Model ID</span>
        </label>

        <div className="relative w-full" ref={dropdownRef}>
          <VSCodeTextField
            className="w-full relative"
            disabled={
              apiConfiguration?.hicapApiKey?.length !== 32 || Object.keys(hicapModels).length === 0
            }
            id="model-search"
            onFocus={() => setIsDropdownVisible(true)}
            onInput={(e) => {
              setSearchTerm((e.target as HTMLInputElement)?.value.toLowerCase() || "");
              setIsDropdownVisible(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search and select a model..."
            /* biome-ignore lint/a11y/useSemanticElements: VSCodeTextField is used as a custom combobox. */
            role="combobox"
            style={{ zIndex: HICAP_MODEL_PICKER_Z_INDEX }}
            value={searchTerm}
          >
            {searchTerm && (
              <button
                aria-label="Clear search"
                className="flex justify-center items-center h-full input-icon-button codicon codicon-close bg-transparent border-none p-0 cursor-pointer"
                onClick={() => {
                  setSearchTerm("");
                  setIsDropdownVisible(true);
                }}
                slot="end"
                type="button"
              />
            )}
          </VSCodeTextField>
          {isDropdownVisible && (
            <div
              className="absolute top-[calc(100%-3px)] left-0 w-[calc(100%-2px)]
							max-h-[200px] overflow-y-auto bg-(--vscode-dropdown-background)
							border border-(--vscode-list-activeSelectionBackground)
							rounded-b-[3px]"
              ref={dropdownListRef}
              /* biome-ignore lint/a11y/useSemanticElements: Custom dropdown implementation. */
              role="listbox"
              style={{ zIndex: HICAP_MODEL_PICKER_Z_INDEX - 1 }}
              tabIndex={-1}
            >
              {modelSearchResults.map((item, index) => {
                const isFavorite = (favoritedModelIds || []).includes(item.id);
                return (
                  <div
                    aria-selected={index === selectedIndex}
                    className={`p-[5px_10px] cursor-pointer break-all whitespace-normal ${
                      index === selectedIndex ? "bg-(--vscode-list-activeSelectionBackground)" : ""
                    } hover:bg-(--vscode-list-activeSelectionBackground)`}
                    key={item.id}
                    onClick={() => {
                      handleModelChange(item.id);
                      setIsDropdownVisible(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleModelChange(item.id);
                        setIsDropdownVisible(false);
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    /* biome-ignore lint/a11y/useSemanticElements: Custom option implementation. */
                    role="option"
                    tabIndex={0}
                  >
                    <div className="flex justify-between items-center [&_.model-item-highlight]:bg-(--vscode-editor-findMatchHighlightBackground) [&_.model-item-highlight]:text-inherit">
                      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Required for search result highlighting; content is controlled by highlight utility. */}
                      <span dangerouslySetInnerHTML={{ __html: item.html }} />
                      <StarIcon
                        isFavorite={isFavorite}
                        onClick={(e) => {
                          e.stopPropagation();
                          StateServiceClient.toggleFavoriteModel(
                            StringRequest.create({ value: item.id }),
                          ).catch((error) =>
                            console.error("Failed to toggle favorite model:", error),
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HicapModelPicker;
