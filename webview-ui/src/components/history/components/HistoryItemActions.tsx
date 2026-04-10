import type React from "react";
import { cn } from "@/lib/utils";
import { TrashIcon, StarIcon } from "lucide-react";

interface HistoryItemActionsProps {
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

/**
 * Modularized action buttons for a history item (favorite, delete).
 */
export const HistoryItemActions: React.FC<HistoryItemActionsProps> = ({
  isFavorited,
  onToggleFavorite,
  onDelete,
  isPending,
}) => {
  return (
    <div className="flex gap-2 shrink-0">
      <button
        aria-label="Delete"
        className="p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center hover:bg-black/10 rounded"
        onClick={(e) => {
          e.stopPropagation();
          if (!isFavorited) onDelete();
        }}
        type="button"
      >
        <TrashIcon
          className={cn("stroke-1 size-4", {
            "opacity-50 cursor-not-allowed": isFavorited,
          })}
        />
      </button>
      <button
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        className="p-1 cursor-pointer flex items-center justify-center hover:bg-black/10 rounded"
        onClick={(e) => {
          e.stopPropagation();
          if (!isPending) onToggleFavorite();
        }}
        type="button"
      >
        <StarIcon
          className={cn("opacity-70 size-4", {
            "text-button-background fill-button-background opacity-100": isFavorited,
            "animate-pulse": isPending,
          })}
        />
      </button>
    </div>
  );
};
