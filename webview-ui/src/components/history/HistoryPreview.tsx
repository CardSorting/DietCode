import { useExtensionState } from "@/context/ExtensionStateContext";
import { TaskServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { memo, useCallback } from "react";
import { MessageSquareIcon, StarIcon, ChevronRightIcon } from "lucide-react";
import { formatCost } from "@/utils/format";

type HistoryPreviewProps = {
  showHistoryView: () => void;
};

/**
 * Concise preview of recent tasks for the sidebar.
 * Cleaned up in Pass 5 to remove technical debt and embedded styles.
 */
const HistoryPreview = ({ showHistoryView }: HistoryPreviewProps) => {
  const { taskHistory } = useExtensionState();
  
  const handleHistorySelect = useCallback((id: string) => {
    TaskServiceClient.showTaskWithId(StringRequest.create({ value: id }))
        .catch((err) => console.error("Error showing task:", err));
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", { month: "short", day: "numeric" });
  };

  const recentTasks = taskHistory
    .filter((item) => item.ts && item.task)
    .slice(0, 3);

  return (
    <div className="flex flex-col flex-shrink-0 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-4 py-2 mt-2">
        <div className="flex items-center gap-1.5 opacity-50 uppercase text-[10px] font-bold tracking-wider">
          <MessageSquareIcon className="size-3" />
          <span>Recent</span>
        </div>
        {taskHistory.length > 0 && (
          <button
            onClick={showHistoryView}
            className="flex items-center gap-0.5 text-[10px] font-bold uppercase opacity-50 hover:opacity-100 transition-opacity"
            type="button"
          >
            View All
            <ChevronRightIcon className="size-3" />
          </button>
        )}
      </div>

      <div className="px-3 flex flex-col gap-2">
        {recentTasks.length > 0 ? (
          recentTasks.map((item) => (
            <div
              key={item.id}
              onClick={() => handleHistorySelect(item.id)}
              className="flex flex-col gap-1 p-3 bg-accent/5 hover:bg-accent/10 rounded-sm cursor-pointer border border-transparent hover:border-accent/10 transition-all group"
            >
              <div className="flex items-start gap-2 overflow-hidden">
                {item.isFavorited && <StarIcon className="size-3 text-button-background fill-button-background mt-0.5 shrink-0" />}
                <div className="text-xs line-clamp-2 leading-relaxed opacity-90 group-hover:opacity-100 ph-no-capture">
                  {item.task}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-accent/5">
                <span className="text-[10px] opacity-40 uppercase font-medium">{formatDate(item.ts)}</span>
                {item.totalCost != null && (
                  <span className="bg-accent/10 px-1.5 py-0.5 rounded-full text-[9px] font-mono opacity-60">
                    {formatCost(item.totalCost, 2)}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-xs opacity-40 italic">No recent tasks</div>
        )}
      </div>
    </div>
  );
};

export default memo(HistoryPreview);

export default memo(HistoryPreview);
