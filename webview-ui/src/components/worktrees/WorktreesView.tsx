import { memo } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { getEnvironmentColor } from "@/utils/environmentColors";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { 
  AlertCircle, 
  Check, 
  GitBranch, 
  Loader2, 
  Plus 
} from "lucide-react";
import { useWorktrees } from "./hooks/useWorktrees";
import WorktreeItem from "./WorktreeItem";
import CreateWorktreeModal from "./CreateWorktreeModal";
import DeleteWorktreeModal from "./DeleteWorktreeModal";
import MergeWorktreeModal from "./MergeWorktreeModal";

type WorktreesViewProps = {
  onDone: () => void;
};

const WorktreesView = ({ onDone }: WorktreesViewProps) => {
  const { environment } = useExtensionState();
  const wt = useWorktrees(onDone);

  const isMainWorktree = (path: string, isBare: boolean) => {
    if (wt.worktrees.length === 0) return false;
    return path === wt.worktrees[0]?.path || isBare;
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-sidebar-background">
      {/* Header */}
      <div className="flex-none flex justify-between items-center px-5 py-3 border-b border-panel-border bg-sidebar-background/80 backdrop-blur-sm z-20">
        <h3 className="m-0 text-lg font-bold" style={{ color: getEnvironmentColor(environment) }}>
          Worktrees
        </h3>
        <VSCodeButton onClick={onDone}>Done</VSCodeButton>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <p className="text-sm text-description leading-relaxed">
            Git worktrees let you work on multiple branches at the same time, each in its own folder.
            Open worktrees in their own windows so DietCode can work on multiple tasks in parallel.{" "}
            <a
              className="text-link-foreground hover:text-link-active transition-colors"
              href="https://docs.cline.bot/features/worktrees"
              rel="noopener noreferrer"
              target="_blank"
            >
              Learn more
            </a>
          </p>

          {/* .worktreeinclude Status */}
          {wt.isGitRepo && !wt.isMultiRoot && !wt.isSubfolder && (
            <div className="p-3 rounded-md border border-widget-border bg-list-hover transition-all">
              {wt.hasWorktreeInclude ? (
                <p className="text-sm text-testing-passed flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4" />
                  .worktreeinclude detected
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-description opacity-90 leading-relaxed">
                    Use a <code className="bg-code-block-bg px-1 rounded font-mono">.worktreeinclude</code> file to automatically copy dependencies like <code className="bg-code-block-bg px-1 rounded font-mono">node_modules/</code> to new worktrees.
                  </p>
                  {wt.hasGitignore && (
                    <VSCodeButton
                      appearance="secondary"
                      disabled={wt.isCreatingWorktreeInclude}
                      onClick={wt.createWorktreeInclude}
                    >
                      {wt.isCreatingWorktreeInclude ? (
                        <span className="flex items-center gap-1.5"><Loader2 className="w-3" /> Creating...</span>
                      ) : (
                        "Create from .gitignore"
                      )}
                    </VSCodeButton>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* State Indicators */}
        {wt.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-description opacity-50" />
            <span className="text-sm text-description">Syncing worktrees...</span>
          </div>
        ) : wt.isMultiRoot ? (
          <StateMessage title="Multi-folder workspace" description="Worktrees are not supported when multiple folders are open. Please open a single repository root." />
        ) : wt.isSubfolder ? (
          <StateMessage title="Subfolder detected" description="You have a subfolder open. Please open the repository root to use worktrees.">
             <code className="mt-3 block px-2 py-1.5 bg-code-block-bg rounded text-[10px] font-mono whitespace-normal break-all opacity-80">
              {wt.gitRootPath}
            </code>
          </StateMessage>
        ) : !wt.isGitRepo ? (
          <StateMessage icon={<AlertCircle />} title="No Git Repository" description="Worktrees require a git repository. Please initialize git to use worktrees." />
        ) : wt.error ? (
          <StateMessage icon={<AlertCircle className="text-destructive" />} title="Connection Error" description={wt.error}>
            <VSCodeButton appearance="secondary" className="mt-4" onClick={wt.loadWorktrees}>Retry</VSCodeButton>
          </StateMessage>
        ) : wt.worktrees.length === 0 ? (
          <StateMessage icon={<GitBranch />} title="No Worktrees" description="Create a new worktree to start working on multiple branches in parallel." />
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {wt.worktrees.map((worktree) => (
              <WorktreeItem
                key={worktree.path}
                worktree={worktree}
                isMain={isMainWorktree(worktree.path, worktree.isBare)}
                mainBranch={wt.getMainBranch()}
                onSwitch={wt.handleSwitchWorktree}
                onMerge={wt.openMergeModal}
                onDelete={wt.setDeleteWorktree}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {wt.isGitRepo && !wt.isMultiRoot && !wt.isSubfolder && (
        <div className="flex-none px-5 py-3 border-t border-panel-border bg-sidebar-background/50">
          <VSCodeButton
            disabled={wt.isLoading}
            onClick={() => wt.setShowCreateForm(true)}
            style={{ width: "100%" }}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Worktree
          </VSCodeButton>
        </div>
      )}

      {/* Modals */}
      <CreateWorktreeModal
        onClose={() => wt.setShowCreateForm(false)}
        onSuccess={wt.loadWorktrees}
        open={wt.showCreateForm}
      />

      <DeleteWorktreeModal
        branchName={wt.deleteWorktree?.branch || ""}
        onClose={() => wt.setDeleteWorktree(null)}
        onConfirm={(del) => wt.handleDeleteWorktree(wt.deleteWorktree!.path, del, wt.deleteWorktree!.branch)}
        open={!!wt.deleteWorktree}
        worktreePath={wt.deleteWorktree?.path || ""}
      />

      {wt.mergeWorktree && (
        <MergeWorktreeModal
          worktree={wt.mergeWorktree}
          isMerging={wt.isMerging}
          mergeError={wt.mergeError}
          mergeResult={wt.mergeResult}
          deleteAfterMerge={wt.deleteAfterMerge}
          setDeleteAfterMerge={wt.setDeleteAfterMerge}
          onClose={() => wt.setMergeWorktree(null)}
          onMerge={wt.handleMergeWorktree}
          onResolve={wt.handleAskClineToResolve}
          mainBranch={wt.getMainBranch()}
        />
      )}
    </div>
  );
};

const StateMessage = ({ icon, title, description, children }: { icon?: React.ReactNode, title: string, description: string, children?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center max-w-[280px] mx-auto space-y-3 transition-all animate-in fade-in slide-in-from-bottom-2">
    {icon && <div className="text-description opacity-40 size-10">{icon}</div>}
    <div className="space-y-1">
      <h4 className="text-sm font-semibold opacity-90">{title}</h4>
      <p className="text-xs text-description leading-relaxed">{description}</p>
    </div>
    {children}
  </div>
);

export default memo(WorktreesView);

export default memo(WorktreesView);
