import { PLATFORM_CONFIG, PlatformType } from "@/config/platform.config";
import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import { Int64Request } from "@shared/nice-grpc/cline/common.ts";
import { CheckIcon, FileTextIcon, MessageSquareIcon } from "lucide-react";
import { memo } from "react";
import { CopyButton } from "../common/CopyButton";
import { Button } from "@/components/ui/button";
import { MarkdownRow } from "./MarkdownRow";

interface CompletionOutputRowProps {
  text: string;
  seeNewChangesDisabled: boolean;
  setSeeNewChangesDisabled: (value: boolean) => void;
  explainChangesDisabled: boolean;
  setExplainChangesDisabled: (value: boolean) => void;
  messageTs: number;
}

/**
 * Renders the final task completion message and action buttons.
 */
export const CompletionOutputRow = memo(({
  text,
  seeNewChangesDisabled,
  setSeeNewChangesDisabled,
  explainChangesDisabled,
  setExplainChangesDisabled,
  messageTs,
}: CompletionOutputRowProps) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-sm border border-success/30 bg-success/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-success/20 bg-success/10">
          <div className="flex items-center gap-2">
            <CheckIcon className="size-3.5 text-success" />
            <span className="text-success font-bold text-sm">Task Completed</span>
          </div>
          <CopyButton className="text-success h-6 w-6" textToCopy={text} />
        </div>
        
        {/* Content */}
        <div className="p-3 text-sm leading-6 select-text whitespace-pre-wrap">
          <MarkdownRow markdown={text} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          disabled={seeNewChangesDisabled}
          onClick={() => {
            setSeeNewChangesDisabled(true);
            TaskServiceClient.taskCompletionViewChanges(Int64Request.create({ value: messageTs }))
              .catch((err) => console.error("Failed to show changes:", err));
          }}
          className="w-full bg-success hover:bg-success/90 text-success-foreground"
        >
          <FileTextIcon className="mr-2 size-4" />
          View Changes
        </Button>

        {PLATFORM_CONFIG.type === PlatformType.VSCODE && (
          <Button
            disabled={explainChangesDisabled}
            onClick={() => {
              setExplainChangesDisabled(true);
              TaskServiceClient.explainChanges({ metadata: {}, messageTs })
                .catch((err) => {
                  console.error("Failed to explain:", err);
                  setExplainChangesDisabled(false);
                });
            }}
            variant="outline"
            className="w-full border-success/30 text-success hover:bg-success/10"
          >
            <MessageSquareIcon className="mr-2 size-4" />
            {explainChangesDisabled ? "Explaining..." : "Explain Changes"}
          </Button>
        )}
      </div>
    </div>
  );
});

CompletionOutputRow.displayName = "CompletionOutputRow";
