import PopoverButton from "@/components/common/PopoverButton";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { FileServiceClient } from "@/services/grpc-client";
import { isMacOSOrLinux } from "@/utils/platformUtils";
import type { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import {
  RuleScope,
  ToggleAgentsRuleRequest,
  ToggleClineRuleRequest,
  ToggleCursorRuleRequest,
  ToggleSkillRequest,
  ToggleWindsurfRuleRequest,
  ToggleWorkflowRequest,
} from "@shared/nice-grpc/cline/file";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import HookRow from "./HookRow";
import NewRuleRow from "./NewRuleRow";
import RuleRow from "./RuleRow";
import RulesToggleList from "./RulesToggleList";
import { cn } from "@/lib/utils";

const TabButton = ({ isActive, children, onClick }: { isActive: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors outline-none",
      isActive 
        ? "text-foreground border-foreground bg-white/5" 
        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
    )}
  >
    {children}
  </button>
);

const ClineRulesToggleModal: React.FC = () => {
  const state = useExtensionState();
  const {
    globalClineRulesToggles, localClineRulesToggles, localCursorRulesToggles,
    localWindsurfRulesToggles, localAgentsRulesToggles, localWorkflowToggles,
    globalWorkflowToggles, globalSkillsToggles, localSkillsToggles,
    remoteRulesToggles, remoteWorkflowToggles, remoteConfigSettings,
    hooksEnabled,
    setGlobalClineRulesToggles, setLocalClineRulesToggles, setLocalCursorRulesToggles,
    setLocalWindsurfRulesToggles, setLocalAgentsRulesToggles, setLocalWorkflowToggles,
    setGlobalWorkflowToggles, setGlobalSkillsToggles, setLocalSkillsToggles,
    setRemoteRulesToggles, setRemoteWorkflowToggles,
  } = state;

  const [globalHooks, setGlobalHooks] = useState<any[]>([]);
  const [workspaceHooks, setWorkspaceHooks] = useState<any[]>([]);
  const [globalSkills, setGlobalSkills] = useState<any[]>([]);
  const [localSkills, setLocalSkills] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<"rules" | "workflows" | "hooks" | "skills">("rules");

  const isWindows = !isMacOSOrLinux();

  const handleOpen = useCallback(() => {
    FileServiceClient.refreshRules({} as EmptyRequest)
      .then((response) => {
        if (response.globalClineRulesToggles?.toggles) setGlobalClineRulesToggles(response.globalClineRulesToggles.toggles);
        if (response.localClineRulesToggles?.toggles) setLocalClineRulesToggles(response.localClineRulesToggles.toggles);
        if (response.localCursorRulesToggles?.toggles) setLocalCursorRulesToggles(response.localCursorRulesToggles.toggles);
        if (response.localWindsurfRulesToggles?.toggles) setLocalWindsurfRulesToggles(response.localWindsurfRulesToggles.toggles);
        if (response.localAgentsRulesToggles?.toggles) setLocalAgentsRulesToggles(response.localAgentsRulesToggles.toggles);
        if (response.localWorkflowToggles?.toggles) setLocalWorkflowToggles(response.localWorkflowToggles.toggles);
        if (response.globalWorkflowToggles?.toggles) setGlobalWorkflowToggles(response.globalWorkflowToggles.toggles);
      })
      .catch((err) => console.error("Failed to refresh rules:", err));
  }, [state]);

  useEffect(() => {
    if (currentView === "hooks" && hooksEnabled) {
      FileServiceClient.refreshHooks({} as EmptyRequest).then(r => {
        setGlobalHooks(r.globalHooks || []);
        setWorkspaceHooks(r.workspaceHooks || []);
      });
    }
  }, [currentView, hooksEnabled]);

  useEffect(() => {
    if (currentView === "skills") {
      FileServiceClient.refreshSkills({} as EmptyRequest).then(r => {
        setGlobalSkills(r.globalSkills || []);
        setLocalSkills(r.localSkills || []);
      });
    }
  }, [currentView]);

  const toggleRule = (isGlobal: boolean, rulePath: string, enabled: boolean) => {
    FileServiceClient.toggleClineRule(ToggleClineRuleRequest.create({ scope: isGlobal ? RuleScope.GLOBAL : RuleScope.LOCAL, rulePath, enabled }))
      .then(r => {
        if (r.globalClineRulesToggles?.toggles) setGlobalClineRulesToggles(r.globalClineRulesToggles.toggles);
        if (r.localClineRulesToggles?.toggles) setLocalClineRulesToggles(r.localClineRulesToggles.toggles);
        if (r.remoteRulesToggles?.toggles) setRemoteRulesToggles(r.remoteRulesToggles.toggles);
      });
  };

  const toggleWorkflow = (isGlobal: boolean, workflowPath: string, enabled: boolean) => {
    FileServiceClient.toggleWorkflow(ToggleWorkflowRequest.create({ workflowPath, enabled, scope: isGlobal ? RuleScope.GLOBAL : RuleScope.LOCAL }))
      .then(r => r.toggles && (isGlobal ? setGlobalWorkflowToggles(r.toggles) : setLocalWorkflowToggles(r.toggles)));
  };

  const hasRemoteRules = (remoteConfigSettings.remoteGlobalRules?.length ?? 0) > 0;
  const hasRemoteWorkflows = (remoteConfigSettings.remoteGlobalWorkflows?.length ?? 0) > 0;

  return (
    <PopoverButton icon="law" onOpen={handleOpen} title="Rules & Workflows" tooltip="Manage Cline Rules & Workflows">
      <div className="flex gap-px border-b border-panel-border mb-2.5">
        <TabButton isActive={currentView === "rules"} onClick={() => setCurrentView("rules")}>Rules</TabButton>
        <TabButton isActive={currentView === "workflows"} onClick={() => setCurrentView("workflows")}>Workflows</TabButton>
        {hooksEnabled && <TabButton isActive={currentView === "hooks"} onClick={() => setCurrentView("hooks")}>Hooks</TabButton>}
        <TabButton isActive={currentView === "skills"} onClick={() => setCurrentView("skills")}>Skills</TabButton>
      </div>

      <div className="text-xs text-description mb-4">
        {currentView === "rules" && (
          <p>Rules provide system-level guidance. <VSCodeLink className="text-xs inline" href="https://docs.cline.bot/features/cline-rules">Docs</VSCodeLink></p>
        )}
        {currentView === "workflows" && (
          <p>Define steps for repetitive tasks (.clinerules/workflows/). <VSCodeLink className="text-xs inline" href="https://docs.cline.bot/features/slash-commands/workflows">Docs</VSCodeLink></p>
        )}
        {currentView === "skills" && (
          <p>Reusable instruction sets Cline can activate on-demand.</p>
        )}
        {currentView === "hooks" && (
          <p>Execute custom scripts at specific points. <VSCodeLink className="text-xs inline" href="https://docs.cline.bot/features/hooks">Docs</VSCodeLink></p>
        )}
      </div>

      {currentView === "rules" && (
        <div className="space-y-4">
          {hasRemoteRules && (
            <div>
              <div className="text-sm font-normal mb-2">Enterprise Rules</div>
              {remoteConfigSettings.remoteGlobalRules?.map((rule: any) => (
                <RuleRow key={rule.name} enabled={rule.alwaysEnabled || remoteRulesToggles[rule.name]} isRemote={true} rulePath={rule.name} ruleType="cline" toggleRule={(name, e) => FileServiceClient.toggleClineRule(ToggleClineRuleRequest.create({ scope: RuleScope.REMOTE, rulePath: name, enabled: e })).then(r => r.remoteRulesToggles && setRemoteRulesToggles(r.remoteRulesToggles.toggles))} />
              ))}
            </div>
          )}
          <div>
            <div className="text-sm font-normal mb-2">Global Rules</div>
            <RulesToggleList isGlobal={true} rules={Object.entries(globalClineRulesToggles || {})} ruleType="cline" showNewRule={true} showNoRules={false} toggleRule={(r, e) => toggleRule(true, r, e)} />
          </div>
          <div>
            <div className="text-sm font-normal mb-2">Workspace Rules</div>
            <RulesToggleList isGlobal={false} rules={Object.entries(localClineRulesToggles || {})} ruleType="cline" showNewRule={false} showNoRules={false} toggleRule={(r, e) => toggleRule(false, r, e)} />
            <RulesToggleList isGlobal={false} rules={Object.entries(localCursorRulesToggles || {})} ruleType="cursor" showNewRule={false} showNoRules={false} toggleRule={(r, e) => FileServiceClient.toggleCursorRule(ToggleCursorRuleRequest.create({ rulePath: r, enabled: e })).then(r => r.toggles && setLocalCursorRulesToggles(r.toggles))} />
            <RulesToggleList isGlobal={false} rules={Object.entries(localWindsurfRulesToggles || {})} ruleType="windsurf" showNewRule={false} showNoRules={false} toggleRule={(r, e) => FileServiceClient.toggleWindsurfRule(ToggleWindsurfRuleRequest.create({ rulePath: r, enabled: e })).then(r => r.toggles && setLocalWindsurfRulesToggles(r.toggles))} />
            <RulesToggleList isGlobal={false} rules={Object.entries(localAgentsRulesToggles || {})} ruleType="agents" showNewRule={true} showNoRules={false} toggleRule={(r, e) => FileServiceClient.toggleAgentsRule(ToggleAgentsRuleRequest.create({ rulePath: r, enabled: e })).then(r => r.toggles && setLocalAgentsRulesToggles(r.toggles))} />
          </div>
        </div>
      )}

      {currentView === "workflows" && (
        <div className="space-y-4">
          {hasRemoteWorkflows && (
            <div>
              <div className="text-sm font-normal mb-2">Enterprise Workflows</div>
              {remoteConfigSettings.remoteGlobalWorkflows?.map((w: any) => (
                <RuleRow key={w.name} enabled={w.alwaysEnabled || remoteWorkflowToggles[w.name]} isRemote={true} rulePath={w.name} ruleType="workflow" toggleRule={(name, e) => FileServiceClient.toggleWorkflow(ToggleWorkflowRequest.create({ workflowPath: name, enabled: e, scope: RuleScope.REMOTE })).then(r => r.toggles && setRemoteWorkflowToggles(r.toggles))} />
              ))}
            </div>
          )}
          <div>
            <div className="text-sm font-normal mb-2">Global Workflows</div>
            <RulesToggleList isGlobal={true} rules={Object.entries(globalWorkflowToggles || {})} ruleType="workflow" showNewRule={true} showNoRules={false} toggleRule={(r, e) => toggleWorkflow(true, r, e)} />
          </div>
          <div>
            <div className="text-sm font-normal mb-2">Workspace Workflows</div>
            <RulesToggleList isGlobal={false} rules={Object.entries(localWorkflowToggles || {})} ruleType="workflow" showNewRule={true} showNoRules={false} toggleRule={(r, e) => toggleWorkflow(false, r, e)} />
          </div>
        </div>
      )}

      {currentView === "hooks" && (
        <div className="space-y-4">
          {isWindows && <div className="p-3 mb-4 bg-warning/20 border-l-4 border-warning text-xs font-semibold">Windows support: Creating/editing hooks only. Lifecycle toggling coming soon.</div>}
          <div>
            <div className="text-sm font-normal mb-2">Global Hooks</div>
            {globalHooks.map(h => <HookRow key={h.name} absolutePath={h.absolutePath} enabled={h.enabled} hookName={h.name} isGlobal={true} isWindows={isWindows} onDelete={r => { setGlobalHooks(r.globalHooks || []); setWorkspaceHooks(r.workspaceHooks || []); }} onToggle={(n, e) => FileServiceClient.toggleHook({ hookName: n, isGlobal: true, enabled: e, workspaceName: "", metadata: {} as any }).then(r => { setGlobalHooks(r.hooksToggles?.globalHooks || []); setWorkspaceHooks(r.hooksToggles?.workspaceHooks || []); })} />)}
            <NewRuleRow existingHooks={globalHooks.map(h => h.name)} isGlobal={true} ruleType="hook" />
          </div>
          {workspaceHooks.map(w => (
            <div key={w.workspaceName}>
              <div className="text-sm font-normal mb-2">{w.workspaceName}/.clinerules/hooks/</div>
              {w.hooks.map((h: any) => <HookRow key={h.absolutePath} absolutePath={h.absolutePath} enabled={h.enabled} hookName={h.name} isGlobal={false} isWindows={isWindows} onDelete={r => { setGlobalHooks(r.globalHooks || []); setWorkspaceHooks(r.workspaceHooks || []); }} onToggle={(n, e) => FileServiceClient.toggleHook({ hookName: n, isGlobal: false, enabled: e, workspaceName: w.workspaceName, metadata: {} as any }).then(r => { setGlobalHooks(r.hooksToggles?.globalHooks || []); setWorkspaceHooks(r.hooksToggles?.workspaceHooks || []); })} />)}
              <NewRuleRow existingHooks={w.hooks.map((h: any) => h.name)} isGlobal={false} ruleType="hook" workspaceName={w.workspaceName} />
            </div>
          ))}
        </div>
      )}

      {currentView === "skills" && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-normal mb-2">Global Skills</div>
            {globalSkills.map(s => <RuleRow key={s.path} enabled={s.enabled} isGlobal={true} rulePath={s.path} ruleType="skill" toggleRule={(p, e) => FileServiceClient.toggleSkill(ToggleSkillRequest.create({ skillPath: p, isGlobal: true, enabled: e })).then(r => { setGlobalSkillsToggles(r.globalSkillsToggles || {}); setGlobalSkills(prev => prev.map(i => i.path === p ? { ...i, enabled: e } : i)); })} />)}
            <NewRuleRow isGlobal={true} ruleType="skill" />
          </div>
          <div>
            <div className="text-sm font-normal mb-2">Workspace Skills</div>
            {localSkills.map(s => <RuleRow key={s.path} enabled={s.enabled} isGlobal={false} rulePath={s.path} ruleType="skill" toggleRule={(p, e) => FileServiceClient.toggleSkill(ToggleSkillRequest.create({ skillPath: p, isGlobal: false, enabled: e })).then(r => { setLocalSkillsToggles(r.localSkillsToggles || {}); setLocalSkills(prev => prev.map(i => i.path === p ? { ...i, enabled: e } : i)); })} />)}
            <NewRuleRow isGlobal={false} ruleType="skill" />
          </div>
        </div>
      )}
    </PopoverButton>
  );
};

export default ClineRulesToggleModal;
                              // Use response data directly, no need to refresh
                              setGlobalHooks(hooksToggles.globalHooks || []);
                              setWorkspaceHooks(hooksToggles.workspaceHooks || []);
                            }}
                            onToggle={(name: string, newEnabled: boolean) =>
                              toggleHook(false, name, newEnabled, workspace.workspaceName)
                            }
                            workspaceName={workspace.workspaceName}
                          />
                        ))}
                      <NewRuleRow
                        existingHooks={workspace.hooks.map((h) => h.name)}
                        isGlobal={false}
                        ruleType="hook"
                        workspaceName={workspace.workspaceName}
                      />
                    </div>
                  </div>
                ))}
              </>
            ) : currentView === "skills" ? (
              <>
                {/* Global Skills Section */}
                <div className="mb-3">
                  <div className="text-sm font-normal mb-2">Global Skills</div>
                  <div className="flex flex-col gap-0">
                    {globalSkills
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((skill) => (
                        <RuleRow
                          enabled={skill.enabled}
                          isGlobal={true}
                          key={skill.path}
                          rulePath={skill.path}
                          ruleType="skill"
                          toggleRule={(path, enabled) => toggleSkill(true, path, enabled)}
                        />
                      ))}
                    <NewRuleRow isGlobal={true} ruleType="skill" />
                  </div>
                </div>

                {/* Workspace Skills Section */}
                <div className="-mb-2.5">
                  <div className="text-sm font-normal mb-2">Workspace Skills</div>
                  <div className="flex flex-col gap-0">
                    {localSkills
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((skill) => (
                        <RuleRow
                          enabled={skill.enabled}
                          isGlobal={false}
                          key={skill.path}
                          rulePath={skill.path}
                          ruleType="skill"
                          toggleRule={(path, enabled) => toggleSkill(false, path, enabled)}
                        />
                      ))}
                    <NewRuleRow isGlobal={false} ruleType="skill" />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </PopupModalContainer>
      )}
    </div>
  );
};

const StyledTabButton = styled.button<{ isActive: boolean }>`
	background: none;
	border: none;
	border-bottom: 2px solid ${(props) => (props.isActive ? "var(--vscode-foreground)" : "transparent")};
	color: ${(props) => (props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)")};
	padding: 8px 12px;
	cursor: pointer;
	font-size: 13px;
	margin-bottom: -1px;
	font-family: inherit;
	white-space: nowrap;

	&:hover {
		color: var(--vscode-foreground);
	}
`;

export const TabButton = ({
  children,
  isActive,
  onClick,
}: {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) => (
  <StyledTabButton aria-pressed={isActive} isActive={isActive} onClick={onClick}>
    {children}
  </StyledTabButton>
);

export default ClineRulesToggleModal;
