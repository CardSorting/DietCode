import { useState, useEffect, useCallback } from "react";
import { WorktreeServiceClient } from "@/services/grpc-client";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import { TrackWorktreeViewOpenedRequest } from "@shared/nice-grpc/cline/worktree.ts";
import type { Worktree } from "@shared/nice-grpc/cline/worktree";
import { useExtensionState } from "@/context/ExtensionStateContext";

export const useWorktreeData = () => {
    const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
    const [currentWorktree, setCurrentWorktree] = useState<Worktree | null>(null);
    const { navigateToWorktrees } = useExtensionState();

    useEffect(() => {
        WorktreeServiceClient.listWorktrees(EmptyRequest.create({}))
            .then((result) => {
                const canUseWorktrees = result.isGitRepo && !result.isMultiRoot && !result.isSubfolder;
                setIsGitRepo(canUseWorktrees);
                if (canUseWorktrees) {
                    const current = result.worktrees.find((w) => w.isCurrent);
                    setCurrentWorktree(current || null);
                }
            })
            .catch(() => setIsGitRepo(false));
    }, []);

    const handleWorktreeClick = useCallback(() => {
        WorktreeServiceClient.trackWorktreeViewOpened(
            TrackWorktreeViewOpenedRequest.create({ source: "home_page" })
        ).catch(console.error);
        navigateToWorktrees();
    }, [navigateToWorktrees]);

    return { isGitRepo, currentWorktree, handleWorktreeClick };
};
