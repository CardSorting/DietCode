import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { GitMerge, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Worktree as WorktreeProto, MergeWorktreeResult } from "@shared/nice-grpc/cline/worktree";

interface MergeWorktreeModalProps {
  worktree: WorktreeProto;
  isMerging: boolean;
  mergeError: string | null;
  mergeResult: MergeWorktreeResult | null;
  deleteAfterMerge: boolean;
  setDeleteAfterMerge: (v: boolean) => void;
  onClose: () => void;
  onMerge: () => void;
  onResolve: () => void;
  mainBranch: string;
}

const MergeWorktreeModal = ({
  worktree,
  isMerging,
  mergeError,
  mergeResult,
  deleteAfterMerge,
  setDeleteAfterMerge,
  onClose,
  onMerge,
  onResolve,
  mainBranch,
}: MergeWorktreeModalProps) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isMerging) onClose();
      }}
    >
      <div className="bg-editor-background border border-panel-border rounded-lg p-5 w-[450px] max-w-[90vw] relative shadow-xl">
        <button
          className="absolute top-3 right-3 p-1 rounded hover:bg-toolbar-hover text-description hover:text-foreground transition-colors"
          disabled={isMerging}
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <GitMerge className="w-5 h-5 text-testing-passed" />
          <h4 className="m-0 text-lg font-semibold">Merge Worktree</h4>
        </div>

        {mergeResult?.success ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-3 rounded bg-testing-passed/10 border border-testing-passed">
              <Check className="w-5 h-5 text-testing-passed" />
              <p className="text-sm m-0">{mergeResult.message}</p>
            </div>
            <div className="flex justify-end">
              <VSCodeButton onClick={onClose}>Done</VSCodeButton>
            </div>
          </div>
        ) : mergeResult?.hasConflicts ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 p-3 rounded bg-inputValidation-warningBackground/20 border border-inputValidation-warningBackground">
              <AlertCircle className="w-5 h-5 shrink-0 text-inputValidation-warningForeground mt-0.5" />
              <div>
                <p className="text-sm font-medium m-0 mb-1">Merge conflicts detected</p>
                <p className="text-xs text-description m-0 mb-2">
                  The following files have conflicts:
                </p>
                <ul className="m-0 pl-4 text-xs font-mono text-description">
                  {mergeResult.conflictingFiles.slice(0, 3).map((f) => <li key={f}>{f}</li>)}
                  {mergeResult.conflictingFiles.length > 3 && (
                    <li className="italic">...and {mergeResult.conflictingFiles.length - 3} more</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <VSCodeButton onClick={onResolve} style={{ width: "100%" }}>
                Ask DietCode to Resolve
              </VSCodeButton>
              <VSCodeButton appearance="secondary" onClick={onClose} style={{ width: "100%" }}>
                I'll Resolve Manually
              </VSCodeButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-description m-0 leading-relaxed">
              This will merge branch <code className="bg-code-block-bg px-1 rounded text-foreground font-mono">{worktree.branch}</code> into <code className="bg-code-block-bg px-1 rounded text-foreground font-mono">{mainBranch}</code>.
            </p>

            <label className="flex items-center gap-2 cursor-pointer group">
              <VSCodeCheckbox
                checked={deleteAfterMerge}
                onChange={(e) => setDeleteAfterMerge((e.target as HTMLInputElement).checked)}
              />
              <span className="text-sm group-hover:text-foreground transition-colors">Delete worktree after successful merge</span>
            </label>

            {mergeError && (
              <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="m-0">{mergeError}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <VSCodeButton appearance="secondary" disabled={isMerging} onClick={onClose}>
                Cancel
              </VSCodeButton>
              <VSCodeButton disabled={isMerging} onClick={onMerge}>
                {isMerging ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Merging...</span>
                ) : (
                  <span className="flex items-center gap-1.5"><GitMerge className="w-4 h-4" /> Merge</span>
                )}
              </VSCodeButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeWorktreeModal;
