import BannerCarousel from "@/components/common/BannerCarousel";
import HistoryPreview from "@/components/history/HistoryPreview";
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import HomeHeader from "@/components/welcome/HomeHeader";
import { SuggestedTasks } from "@/components/welcome/SuggestedTasks";
import CreateWorktreeModal from "@/components/worktrees/CreateWorktreeModal";
import { useClineAuth } from "@/context/ClineAuthContext";
import { useExtensionState } from "@/context/ExtensionStateContext";
import {
  AccountServiceClient,
  StateServiceClient,
  UiServiceClient,
  WorktreeServiceClient,
} from "@/services/grpc-client";
import { convertBannerData } from "@/utils/bannerUtils";
import { getCurrentPlatform } from "@/utils/platformUtils";
import {
  BANNER_DATA,
  type BannerAction,
  BannerActionType,
  type BannerCardData,
} from "@shared/cline/banner.ts";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import type { Worktree } from "@shared/nice-grpc/cline/worktree";
import { TrackWorktreeViewOpenedRequest } from "@shared/nice-grpc/cline/worktree.ts";
import { GitBranch } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WelcomeSectionProps } from "../../types/chatTypes";

import { useExtensionState } from "@/context/ExtensionStateContext";
import { GitBranch } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { WelcomeSectionProps } from "../../types/chatTypes";
import { useBannerData } from "../../hooks/useBannerData";
import { useWorktreeData } from "../../hooks/useWorktreeData";

/**
 * Welcome section shown when there's no active task
 * Integrated with extracted hooks to maintain a thin component profile.
 */
export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  showHistoryView,
  taskHistory,
  shouldShowQuickWins,
}) => {
  const { worktreesEnabled } = useExtensionState();
  const [showCreateWorktreeModal, setShowCreateWorktreeModal] = useState(false);

  // Extracted hooks for heavy logic
  // Note: activeBanners is calculated but currently hidden as per request
  const { activeBanners } = useBannerData();
  const { isGitRepo, currentWorktree, handleWorktreeClick } = useWorktreeData();

  return (
    <div className="flex flex-col flex-1 w-full h-full p-0 m-0">
      <div className="overflow-y-auto flex flex-col pb-2.5">
        <HomeHeader shouldShowQuickWins={shouldShowQuickWins} />
        <>
          {/* BannerCarousel hidden as per request */}
          {!shouldShowQuickWins && taskHistory.length > 0 && (
            <HistoryPreview showHistoryView={showHistoryView} />
          )}
          {/* Quick launch worktree button */}
          {isGitRepo && worktreesEnabled?.featureFlag && worktreesEnabled?.user && (
            <div className="flex flex-col items-center gap-3 mt-2 mb-4 px-5">
              {/* TODO: Re-enable once worktree creation is stable
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											className="flex items-center gap-2 px-4 py-2 rounded-full border border-(--vscode-foreground)/30 text-(--vscode-foreground) bg-transparent hover:bg-(--vscode-list-hoverBackground) active:opacity-80 text-sm font-medium cursor-pointer"
											onClick={() => setShowCreateWorktreeModal(true)}
											type="button">
											<span className="codicon codicon-empty-window"></span>
											New Worktree Window
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										Create a new git worktree and open it in a separate window. Great for running parallel
										DietCode tasks.
									</TooltipContent>
								</Tooltip>
								*/}
              {currentWorktree && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex flex-col items-center gap-0.5 text-xs text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) cursor-pointer bg-transparent border-none p-1 rounded"
                      onClick={handleWorktreeClick}
                      type="button"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <GitBranch className="w-3 h-3 stroke-[2.5] shrink-0" />
                        <span className="break-all text-center">
                          <span className="font-semibold">Current:</span>{" "}
                          {currentWorktree.branch || "detached HEAD"}
                        </span>
                      </div>
                      <span className="break-all text-center max-w-[300px]">
                        {currentWorktree.path}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    View and manage git worktrees. Great for running parallel DietCode tasks.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </>
      </div>
      <SuggestedTasks shouldShowQuickWins={shouldShowQuickWins} />

      {/* Quick launch worktree modal */}
      <CreateWorktreeModal
        onClose={() => setShowCreateWorktreeModal(false)}
        open={showCreateWorktreeModal}
        openAfterCreate={true}
      />
    </div>
  );
};
