import { useState, useCallback, useEffect } from "react";
import { WorktreeServiceClient, FileServiceClient, TaskServiceClient } from "@/services/grpc-client";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import { NewTaskRequest } from "@shared/nice-grpc/cline/task.ts";
import { 
  type Worktree as WorktreeProto, 
  type MergeWorktreeResult,
  MergeWorktreeRequest,
  DeleteWorktreeRequest,
  SwitchWorktreeRequest,
  CreateWorktreeIncludeRequest
} from "@shared/nice-grpc/cline/worktree";

export const useWorktrees = (onDone: () => void) => {
  const [worktrees, setWorktrees] = useState<WorktreeProto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [isMultiRoot, setIsMultiRoot] = useState(false);
  const [isSubfolder, setIsSubfolder] = useState(false);
  const [gitRootPath, setGitRootPath] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteWorktree, setDeleteWorktree] = useState<WorktreeProto | null>(null);

  // Merge state
  const [mergeWorktree, setMergeWorktree] = useState<WorktreeProto | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeResult, setMergeResult] = useState<MergeWorktreeResult | null>(null);
  const [deleteAfterMerge, setDeleteAfterMerge] = useState(true);

  // .worktreeinclude state
  const [hasWorktreeInclude, setHasWorktreeInclude] = useState(false);
  const [hasGitignore, setHasGitignore] = useState(false);
  const [gitignoreContent, setGitignoreContent] = useState("");
  const [isCreatingWorktreeInclude, setIsCreatingWorktreeInclude] = useState(false);

  const loadWorktrees = useCallback(async () => {
    try {
      const response = await WorktreeServiceClient.listWorktrees(EmptyRequest.create({}));
      setWorktrees(prev => JSON.stringify(response.worktrees) === JSON.stringify(prev) ? prev : response.worktrees);
      setIsGitRepo(response.isGitRepo);
      setIsMultiRoot(response.isMultiRoot);
      setIsSubfolder(response.isSubfolder);
      setGitRootPath(response.gitRootPath);
      if (response.error) setError(response.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worktrees");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWorktreeIncludeStatus = useCallback(async () => {
    try {
      const status = await WorktreeServiceClient.getWorktreeIncludeStatus(EmptyRequest.create({}));
      setHasWorktreeInclude(status.exists);
      setHasGitignore(status.hasGitignore);
      setGitignoreContent(status.gitignoreContent);
    } catch (err) {
      console.error("Failed to load worktree include status:", err);
    }
  }, []);

  const createWorktreeInclude = useCallback(async () => {
    setIsCreatingWorktreeInclude(true);
    try {
      const result = await WorktreeServiceClient.createWorktreeInclude(
        CreateWorktreeIncludeRequest.create({ content: gitignoreContent })
      );
      if (result.success) {
        setHasWorktreeInclude(true);
        await FileServiceClient.openFileRelativePath({ value: ".worktreeinclude" });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create .worktreeinclude");
    } finally {
      setIsCreatingWorktreeInclude(false);
    }
  }, [gitignoreContent]);

  useEffect(() => {
    loadWorktrees();
    loadWorktreeIncludeStatus();
    const interval = setInterval(loadWorktrees, 3000);
    return () => clearInterval(interval);
  }, [loadWorktrees, loadWorktreeIncludeStatus]);

  const handleDeleteWorktree = useCallback(async (path: string, deleteBranch: boolean, branchName: string) => {
    try {
      const result = await WorktreeServiceClient.deleteWorktree(
        DeleteWorktreeRequest.create({ path, force: false, deleteBranch, branchName })
      );
      if (!result.success) setError(result.message);
      else await loadWorktrees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete worktree");
    }
  }, [loadWorktrees]);

  const handleSwitchWorktree = useCallback(async (path: string, newWindow: boolean) => {
    try {
      await WorktreeServiceClient.switchWorktree(SwitchWorktreeRequest.create({ path, newWindow }));
    } catch (err) {
      console.error("Failed to switch worktree:", err);
    }
  }, []);

  const getMainBranch = useCallback(() => {
    return worktrees[0]?.branch || "main";
  }, [worktrees]);

  const openMergeModal = useCallback((wt: WorktreeProto) => {
    setMergeWorktree(wt);
    setMergeError(null);
    setMergeResult(null);
    setDeleteAfterMerge(true);
  }, []);

  const handleMergeWorktree = useCallback(async () => {
    if (!mergeWorktree) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      const result = await WorktreeServiceClient.mergeWorktree(
        MergeWorktreeRequest.create({
          worktreePath: mergeWorktree.path,
          targetBranch: getMainBranch(),
          deleteAfterMerge,
        })
      );
      setMergeResult(result);
      if (result.success) await loadWorktrees();
      else if (!result.hasConflicts) setMergeError(result.message);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Failed to merge worktree");
    } finally {
      setIsMerging(false);
    }
  }, [mergeWorktree, getMainBranch, deleteAfterMerge, loadWorktrees]);

  const handleAskClineToResolve = useCallback(async () => {
    if (!mergeResult || !mergeResult.hasConflicts || !mergeWorktree) return;
    const prompt = `I tried to merge branch '${mergeResult.sourceBranch}' into '${mergeResult.targetBranch}' but there are merge conflicts in: ${mergeResult.conflictingFiles.join(", ")}\n\nPlease help me resolve these conflicts, then complete the merge, and delete the worktree at: ${mergeWorktree.path}`;
    try {
      await TaskServiceClient.newTask(NewTaskRequest.create({ text: prompt }));
      setMergeWorktree(null);
      onDone();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Failed to create task");
    }
  }, [mergeResult, mergeWorktree, onDone]);

  return {
    worktrees,
    isLoading,
    error,
    isGitRepo,
    isMultiRoot,
    isSubfolder,
    gitRootPath,
    showCreateForm,
    setShowCreateForm,
    deleteWorktree,
    setDeleteWorktree,
    mergeWorktree,
    setMergeWorktree,
    isMerging,
    mergeError,
    mergeResult,
    deleteAfterMerge,
    setDeleteAfterMerge,
    hasWorktreeInclude,
    hasGitignore,
    isCreatingWorktreeInclude,
    createWorktreeInclude,
    handleDeleteWorktree,
    handleSwitchWorktree,
    handleMergeWorktree,
    handleAskClineToResolve,
    loadWorktrees,
    getMainBranch,
    openMergeModal,
  };
};
