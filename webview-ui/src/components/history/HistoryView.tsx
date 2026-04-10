import { Button } from "@/components/ui/button";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { formatSize } from "@/utils/format";
import {
  BooleanRequest,
} from "@shared/nice-grpc/cline/common.ts";
import { TaskServiceClient } from "@/services/grpc-client";
import { memo, useCallback, useMemo, useState } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import ViewHeader from "../common/ViewHeader";
import HistoryViewItem from "./HistoryViewItem";
import { useHistoryState } from "./hooks/useHistoryState";
import { HistoryFilters } from "./components/HistoryFilters";

type HistoryViewProps = {
  onDone: () => void;
};

/**
 * Optimized History View.
 * Core logic has been extracted into useHistoryState and specialized sub-components.
 */
const HistoryView = ({ onDone }: HistoryViewProps) => {
  const { environment, taskHistory } = useExtensionState();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteAllDisabled, setDeleteAllDisabled] = useState(false);

  const history = useHistoryState(taskHistory);

  const handleHistorySelect = useCallback((itemId: string, checked: boolean) => {
    setSelectedItems((prev) => checked ? [...prev, itemId] : prev.filter((id) => id !== itemId));
  }, []);

  const handleBatchHistorySelect = useCallback((selectAll: boolean) => {
    setSelectedItems(selectAll ? history.filteredTasks.map((item) => item.id) : []);
  }, [history.filteredTasks]);

  const selectedItemsSize = useMemo(() => {
    return taskHistory
      .filter((item) => selectedItems.includes(item.id))
      .reduce((total, item) => total + (item.size || 0), 0);
  }, [selectedItems, taskHistory]);

  return (
    <div className="fixed overflow-hidden inset-0 flex flex-col w-full bg-sidebar-background">
      <ViewHeader environment={environment} onDone={onDone} title="History" />

      <HistoryFilters
        searchQuery={history.searchQuery}
        setSearchQuery={history.setSearchQuery}
        sortOption={history.sortOption}
        setSortOption={history.setSortOption}
        showFavoritesOnly={history.showFavoritesOnly}
        setShowFavoritesOnly={history.setShowFavoritesOnly}
        showCurrentWorkspaceOnly={history.showCurrentWorkspaceOnly}
        setShowCurrentWorkspaceOnly={history.setShowCurrentWorkspaceOnly}
      />

      {/* HISTORY ITEMS */}
      <div className="flex-grow overflow-y-auto m-0 w-full py-2 border-t border-accent/5 mt-3">
        {history.groupedTasks.length > 0 ? (
            <GroupedVirtuoso
                className="flex-grow"
                groupContent={(index) => (
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 text-description bg-sidebar-background/95 backdrop-blur-sm border-b border-accent/5">
                        {history.groupLabels[index]}
                    </div>
                )}
                groupCounts={history.groupCounts}
                itemContent={(index) => {
                    const item = history.groupedTasks[index];
                    return (
                    <HistoryViewItem
                        handleDeleteHistoryItem={(id) => history.deleteTasks([id])}
                        handleHistorySelect={handleHistorySelect}
                        index={index}
                        item={item}
                        pendingFavoriteToggles={history.pendingFavoriteToggles}
                        selectedItems={selectedItems}
                        toggleFavorite={history.toggleFavorite}
                    />
                    );
                }}
            />
        ) : (
            <div className="flex flex-col items-center justify-center h-full opacity-50 p-8 text-center text-xs gap-2">
                <i className="codicon codicon-history text-2xl" />
                <span>No history items found</span>
            </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-accent/10 bg-sidebar-background/50">
        <div className="flex gap-2 mb-3">
          <Button className="flex-1 h-8 text-xs" onClick={() => handleBatchHistorySelect(true)} variant="secondary">
            Select All
          </Button>
          <Button className="flex-1 h-8 text-xs" onClick={() => handleBatchHistorySelect(false)} variant="secondary">
            Clear
          </Button>
        </div>

        {selectedItems.length > 0 ? (
          <Button
            className="w-full h-9"
            onClick={() => {
              history.deleteTasks(selectedItems);
              setSelectedItems([]);
            }}
            variant="danger"
          >
            Delete {selectedItems.length} Selected ({formatSize(selectedItemsSize)})
          </Button>
        ) : (
          <Button
            className="w-full h-9"
            disabled={deleteAllDisabled || taskHistory.length === 0}
            onClick={() => {
              setDeleteAllDisabled(true);
              TaskServiceClient.deleteAllTaskHistory(BooleanRequest.create({}))
                .then(() => history.refresh())
                .finally(() => setDeleteAllDisabled(false));
            }}
            variant="danger"
          >
            Delete All History {history.totalTasksSize ? `(${formatSize(history.totalTasksSize)})` : ""}
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(HistoryView);
