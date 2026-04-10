import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { GitBranch, FolderOpen, ExternalLink, GitMerge, Trash2 } from "lucide-react";
import type { Worktree as WorktreeProto } from "@shared/nice-grpc/cline/worktree";
import { cn } from "@/lib/utils";

interface WorktreeItemProps {
  worktree: WorktreeProto;
  isMain: boolean;
  mainBranch: string;
  onSwitch: (path: string, newWindow: boolean) => void;
  onMerge: (wt: WorktreeProto) => void;
  onDelete: (wt: WorktreeProto) => void;
}

const WorktreeItem = ({
  worktree,
  isMain,
  mainBranch,
  onSwitch,
  onMerge,
  onDelete,
}: WorktreeItemProps) => {
  return (
    <div
      className={cn(
        "p-4 rounded border transition-colors",
        worktree.isCurrent
          ? "border-focus bg-list-active"
          : "border-panel-border hover:bg-list-hover"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 shrink-0 text-button-background" />
            <span className="font-medium break-all text-sm">
              {worktree.branch || (worktree.isDetached ? "HEAD (detached)" : "unknown")}
            </span>
          </div>
          {isMain && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs px-1.5 py-0.5 rounded bg-badge text-badge-foreground cursor-help">
                  Primary
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                The original worktree where your .git directory lives.
              </TooltipContent>
            </Tooltip>
          )}
          {worktree.isCurrent && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs px-1.5 py-0.5 rounded bg-button-background text-button-foreground cursor-help">
                  Current
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                This is the worktree currently open in this window.
              </TooltipContent>
            </Tooltip>
          )}
          {worktree.isLocked && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-inputValidation-warningBackground text-inputValidation-warningForeground">
              Locked
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {!worktree.isCurrent && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <VSCodeButton appearance="icon" onClick={() => onSwitch(worktree.path, false)}>
                    <FolderOpen className="w-4 h-4" />
                  </VSCodeButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Open in current window</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <VSCodeButton appearance="icon" onClick={() => onSwitch(worktree.path, true)}>
                    <ExternalLink className="w-4 h-4" />
                  </VSCodeButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Open in new window</TooltipContent>
              </Tooltip>
            </>
          )}
          {!worktree.isCurrent && !isMain && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <VSCodeButton appearance="icon" onClick={() => onMerge(worktree)}>
                    <GitMerge className="w-4 h-4 text-testing-passed" />
                  </VSCodeButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Merge into {mainBranch}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <VSCodeButton appearance="icon" onClick={() => onDelete(worktree)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </VSCodeButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Delete this worktree</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-description m-0 break-all opacity-80">
        {worktree.path}
      </p>
    </div>
  );
};

export default WorktreeItem;
