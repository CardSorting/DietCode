import type React from "react";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { FunnelIcon } from "lucide-react";
import { SortOption } from "../hooks/useHistoryState";

const HISTORY_FILTERS = {
  newest: "Newest",
  oldest: "Oldest",
  mostExpensive: "Most Expensive",
  mostTokens: "Most Tokens",
  mostRelevant: "Most Relevant",
  workspaceOnly: "Workspace Only",
  favoritesOnly: "Favorites Only",
};

interface HistoryFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  sortOption: SortOption;
  setSortOption: (val: SortOption) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (val: boolean) => void;
  showCurrentWorkspaceOnly: boolean;
  setShowCurrentWorkspaceOnly: (val: boolean) => void;
}

/**
 * Modularized filters for the history view.
 * Handles search, sorting, and workspace/favorite toggling.
 */
export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  showFavoritesOnly,
  setShowFavoritesOnly,
  showCurrentWorkspaceOnly,
  setShowCurrentWorkspaceOnly,
}) => {
  return (
    <div className="flex flex-col gap-3 px-3">
      <div className="flex justify-between items-center">
        <VSCodeTextField
          className="w-full"
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement)?.value)}
          placeholder="Fuzzy search history..."
          value={searchQuery}
        >
          <div className="codicon codicon-search opacity-80 mt-0.5 !text-sm" slot="start" />
          {searchQuery && (
            <div
              aria-label="Clear search"
              className="input-icon-button codicon codicon-close flex justify-center items-center h-full"
              onClick={() => setSearchQuery("")}
              slot="end"
            />
          )}
        </VSCodeTextField>

        <Select
          onValueChange={(value) => {
            if (["newest", "oldest", "mostExpensive", "mostTokens", "mostRelevant"].includes(value)) {
              if (value === "mostRelevant" && !searchQuery) return;
              setSortOption(value as SortOption);
            } else if (value === "workspaceOnly") {
              setShowCurrentWorkspaceOnly(!showCurrentWorkspaceOnly);
            } else if (value === "favoritesOnly") {
              setShowFavoritesOnly(!showFavoritesOnly);
            }
          }}
          value={sortOption}
        >
          <SelectTrigger className="border-0 cursor-pointer w-auto" showIcon={false}>
            <FunnelIcon className="size-4 text-foreground" />
          </SelectTrigger>
          <SelectContent position="popper">
            {Object.entries(HISTORY_FILTERS).map(([key, value]) => {
              const isSelected = ["newest", "oldest", "mostExpensive", "mostTokens", "mostRelevant"].includes(key)
                ? sortOption === key
                : key === "workspaceOnly"
                  ? showCurrentWorkspaceOnly
                  : key === "favoritesOnly"
                    ? showFavoritesOnly
                    : false;
              
              const isDisabled = key === "mostRelevant" && !searchQuery;

              return (
                <SelectItem
                  className={isSelected ? "bg-button-background/20" : ""}
                  disabled={isDisabled}
                  key={key}
                  value={key}
                >
                  <span className="flex items-center gap-2">
                    {["workspaceOnly", "favoritesOnly"].includes(key) && (
                      <span className={`codicon ${key === "workspaceOnly" ? "codicon-folder" : "codicon-star-full"}`} />
                    )}
                    {value}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
