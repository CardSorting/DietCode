import type React from "react";
import { 
    ArrowDownIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    ArrowUpIcon, 
    DownloadIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLargeNumber, formatSize } from "@/utils/format";
import { TaskServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import type { HistoryItem } from "@shared/HistoryItem";

interface HistoryItemStatsProps {
    item: HistoryItem;
}

/**
 * Modularized detailed stats for a history item (tokens, cost, model).
 */
export const HistoryItemStats: React.FC<HistoryItemStatsProps> = ({ item }) => {
    return (
        <div className="flex flex-col gap-2 w-full text-[11px] bg-accent/5 p-2 rounded-xs border border-white/5">
            <div className="flex justify-between items-center w-full gap-1">
                <span className="font-medium text-description">Tokens:</span>
                <div className="flex items-center gap-1.5 text-description">
                    <span className="flex items-center gap-0.5" title="Tokens In">
                        <ArrowUpIcon className="size-2.5" />
                        {formatLargeNumber(item.tokensIn || 0)}
                    </span>
                    <span className="flex items-center gap-0.5" title="Tokens Out">
                        <ArrowDownIcon className="size-2.5" />
                        {formatLargeNumber(item.tokensOut || 0)}
                    </span>
                    {(item.cacheWrites || 0) > 0 && (
                         <span className="flex items-center gap-0.5" title="Cache Writes">
                            <ArrowRightIcon className="size-2.5 text-success/70" />
                            {formatLargeNumber(item.cacheWrites!)}
                        </span>
                    )}
                    {(item.cacheReads || 0) > 0 && (
                        <span className="flex items-center gap-0.5" title="Cache Reads">
                            <ArrowLeftIcon className="size-2.5 text-success/70" />
                            {formatLargeNumber(item.cacheReads!)}
                        </span>
                    )}
                </div>
            </div>

            {item.modelId && (
                <div className="flex justify-between items-center w-full gap-1">
                    <span className="font-medium text-description">Model:</span>
                    <span className="text-description opacity-80 truncate ml-4" title={item.modelId}>
                        {item.modelId}
                    </span>
                </div>
            )}

            <div className="flex justify-between items-center w-full gap-1 pt-1 border-t border-white/5">
                <span className="font-medium text-description">Export:</span>
                <div className="flex items-center gap-2">
                    <span className="text-description">{formatSize(item.size)}</span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 hover:bg-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            TaskServiceClient.exportTaskWithId(StringRequest.create({ value: item.id }))
                                .catch(err => console.error("Export error:", err));
                        }}
                    >
                        <DownloadIcon className="size-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
