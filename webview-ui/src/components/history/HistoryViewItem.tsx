import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import type { HistoryItem } from "@shared/HistoryItem.ts";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { 
    ChevronsDownUpIcon, 
    ChevronsUpDownIcon
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCost } from "@/utils/format";
import { HistoryItemActions } from "./components/HistoryItemActions";
import { HistoryItemStats } from "./components/HistoryItemStats";

type HistoryViewItemProps = {
  item: HistoryItem;
  index: number;
  selectedItems: string[];
  pendingFavoriteToggles: Record<string, boolean>;
  handleDeleteHistoryItem: (id: string) => void;
  toggleFavorite: (id: string, isCurrentlyFavorited: boolean) => void;
  handleHistorySelect: (itemId: string, checked: boolean) => void;
};

/**
 * Standardized history item row.
 * Decomposed into specialized sub-components for actions and stats.
 */
const HistoryViewItem = ({
  item,
  pendingFavoriteToggles,
  handleDeleteHistoryItem,
  toggleFavorite,
  handleHistorySelect,
  selectedItems,
}: HistoryViewItemProps) => {
  const [expanded, setExpanded] = useState(false);

  const isFavoritedItem = useMemo(
    () => pendingFavoriteToggles[item.id] ?? item.isFavorited,
    [item.id, item.isFavorited, pendingFavoriteToggles],
  );

  const handleShowTaskWithId = useCallback((id: string) => {
    TaskServiceClient.showTaskWithId(StringRequest.create({ value: id }))
        .catch((err) => console.error("Error showing task:", err));
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const isToday = new Date().toDateString() === date.toDateString();

    return date.toLocaleString("en-US", isToday ? {
        hour: "numeric", minute: "2-digit", hour12: true
    } : {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true
    }).replace(", ", " ");
  }, []);

  return (
    <div className="history-item cursor-pointer flex group mb-1 hover:bg-list-hover border-b border-accent/10" key={item.id}>
      <VSCodeCheckbox
        checked={selectedItems.includes(item.id)}
        className="pl-3 pr-1 py-auto self-start mt-3"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleHistorySelect(item.id, (e.target as HTMLInputElement).checked);
        }}
      />

      <div
        className="flex flex-col gap-1 py-2 pl-2 pr-3 grow min-w-0"
        onClick={() => handleShowTaskWithId(item.id)}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="line-clamp-1 overflow-hidden wrap-break-word whitespace-pre-wrap flex-1 min-w-0 text-sm opacity-90">
            <span className="ph-no-capture">{item.task}</span>
          </div>
          <HistoryItemActions
            isFavorited={isFavoritedItem}
            isPending={pendingFavoriteToggles[item.id] !== undefined}
            onDelete={() => handleDeleteHistoryItem(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id, isFavoritedItem)}
          />
        </div>

        <div className="flex items-center justify-between w-full mt-1">
            <div className="text-description text-[10px] uppercase font-medium">{formatDate(item.ts)}</div>
            <div 
                className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-1 rounded transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
            >
                <span className="text-description text-xs font-mono">{formatCost(item.totalCost)}</span>
                {expanded ? (
                    <ChevronsDownUpIcon className="size-3 text-description" />
                ) : (
                    <ChevronsUpDownIcon className="size-3 text-description opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </div>
        </div>

        {expanded && (
           <div className="mt-2" onClick={(e) => e.stopPropagation()}>
               <HistoryItemStats item={item} />
           </div>
        )}
      </div>
    </div>
  );
};

export default memo(HistoryViewItem);
