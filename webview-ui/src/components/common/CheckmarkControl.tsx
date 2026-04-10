import { useExtensionState } from "@/context/ExtensionStateContext";
import { CheckpointsServiceClient } from "@/services/grpc-client";
import { CheckpointRestoreRequest } from "@shared/nice-grpc/cline/checkpoints.ts";
import { Int64Request } from "@shared/nice-grpc/cline/common.ts";
import { BookmarkIcon, ChevronDownIcon, RotateCcwIcon, DiffIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const CheckmarkControl = ({ messageTs, isCheckpointCheckedOut }: { messageTs?: number; isCheckpointCheckedOut?: boolean }) => {
    const [loading, setLoading] = useState<string | null>(null);
    const { onRelinquishControl } = useExtensionState();

    const handleRestore = async (type: "task" | "workspace" | "taskAndWorkspace") => {
        setLoading(type);
        try {
            await CheckpointsServiceClient.checkpointRestore(CheckpointRestoreRequest.create({ number: messageTs, restoreType: type }));
        } finally { setLoading(null); }
    };

    const handleDiff = async () => {
        setLoading("diff");
        try { await CheckpointsServiceClient.checkpointDiff(Int64Request.create({ value: messageTs })); }
        finally { setLoading(null); }
    };

    return (
        <div className={cn("flex items-center gap-2 group/checkpoint py-1 h-4 transition-opacity", isCheckpointCheckedOut ? "opacity-100" : "opacity-40 hover:opacity-100")}>
            <BookmarkIcon className={cn("size-2.5", isCheckpointCheckedOut ? "text-primary fill-primary" : "text-description")} />
            <div className="flex-1 border-t border-dashed border-description/30 h-0" />
            
            <div className={cn("items-center gap-1.5 hidden group-hover/checkpoint:flex", isCheckpointCheckedOut && "flex")}>
                <span className={cn("text-[9px] font-bold uppercase tracking-tight", isCheckpointCheckedOut ? "text-primary" : "text-description")}>
                    {isCheckpointCheckedOut ? "Restored" : "Checkpoint"}
                </span>

                <div className="flex items-center gap-1">
                    <button onClick={handleDiff} disabled={!!loading} className="p-1 hover:bg-code rounded-sm transition-colors text-description hover:text-foreground">
                        <DiffIcon size={12} />
                    </button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="p-1 hover:bg-code rounded-sm transition-colors text-description hover:text-foreground flex items-center gap-0.5">
                                <RotateCcwIcon size={12} />
                                <ChevronDownIcon size={10} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1 bg-popover border-panel-border shadow-xl">
                            <div className="flex flex-col gap-0.5">
                                <Option label="Restore Everything" desc="Clear future messages & revert files" onClick={() => handleRestore("taskAndWorkspace")} loading={loading === "taskAndWorkspace"} />
                                <div className="h-px bg-panel-border/30 my-0.5" />
                                <Option label="Restore Files Only" desc="Just revert files to this point" onClick={() => handleRestore("workspace")} loading={loading === "workspace"} disabled={isCheckpointCheckedOut} />
                                <Option label="Restore Task Only" desc="Just clear future messages" onClick={() => handleRestore("task")} loading={loading === "task"} />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <div className="flex-1 border-t border-dashed border-description/30 h-0 group-hover/checkpoint:hidden" />
        </div>
    );
};

const Option = ({ label, desc, onClick, loading, disabled }: any) => (
    <button disabled={disabled || loading} onClick={onClick} className="flex flex-col items-start p-2 hover:bg-accent hover:text-accent-foreground rounded-sm text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        <span className="text-xs font-bold flex items-center gap-2">{label} {loading && <span className="codicon codicon-loading codicon-modifier-spin" />}</span>
        <span className="text-[10px] opacity-60 leading-tight">{desc}</span>
    </button>
);
