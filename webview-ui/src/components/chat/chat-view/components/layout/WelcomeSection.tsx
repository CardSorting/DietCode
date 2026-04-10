import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { GitBranch, SparklesIcon, ZapIcon, HistoryIcon, ArrowRightIcon } from "lucide-react";
import React, { useState } from "react";
import type { WelcomeSectionProps } from "../../types/chatTypes";
import { useWorktreeData } from "../../hooks/useWorktreeData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ showHistoryView, taskHistory }) => {
  const { worktreesEnabled } = useExtensionState();
  const { isGitRepo, currentWorktree, handleWorktreeClick } = useWorktreeData();

  return (
    <div className="flex flex-col flex-1 h-full animate-in fade-in duration-500 overflow-y-auto scrollbar-none">
      <div className="flex flex-col items-center justify-center pt-14 pb-10 px-6 text-center gap-6">
          <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-primary to-primary-foreground rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative size-16 bg-code border border-panel-border/50 rounded-2xl flex items-center justify-center text-primary shadow-2xl">
                  <ZapIcon size={32} strokeWidth={2.5} />
              </div>
          </div>
          
          <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">How can I help you today?</h1>
              <p className="text-sm opacity-50 max-w-xs mx-auto">DietCode is ready to build, debug, and optimize. Just type your task below to start.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Suggestion label="Optimize Code" icon={<SparklesIcon size={12}/>}/>
              <Suggestion label="Fix Bug" icon={<ZapIcon size={12}/>}/>
              <Suggestion label="Explain Plan" icon={<ArrowRightIcon size={12}/>}/>
          </div>
      </div>

      <div className="mt-auto p-6 space-y-4">
          {taskHistory.length > 0 && (
              <button 
                onClick={showHistoryView}
                className="w-full flex items-center justify-between p-4 bg-code border border-panel-border/30 rounded-xl hover:border-primary/30 transition-all group"
              >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary"><HistoryIcon size={16}/></div>
                      <div className="text-left">
                          <div className="text-xs font-bold">Pick up where you left off</div>
                          <div className="text-[10px] opacity-50 capitalize">{taskHistory[0].task.slice(0, 50)}...</div>
                      </div>
                  </div>
                  <ArrowRightIcon size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"/>
              </button>
          )}

          {isGitRepo && currentWorktree && (
              <div className="p-4 bg-code/50 border border-panel-border/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold opacity-70">
                          <GitBranch size={14}/> <span>Worktree</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Active</span>
                  </div>
                  <div className="text-xs opacity-50 font-mono truncate">{currentWorktree.path}</div>
                  <Button variant="secondary" size="sm" className="w-full h-8 text-[11px]" onClick={handleWorktreeClick}>Manage Worktrees</Button>
              </div>
          )}
      </div>
    </div>
  );
};

const Suggestion = ({ label, icon }: any) => (
    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-code border border-panel-border/50 rounded-full text-[11px] font-medium hover:border-primary/50 transition-colors shadow-sm">
        <span className="text-primary">{icon}</span>
        {label}
    </button>
);
