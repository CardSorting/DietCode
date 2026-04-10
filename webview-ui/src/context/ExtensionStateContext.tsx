import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings.ts";
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings.ts";
import { DEFAULT_PLATFORM, type ExtensionState } from "@shared/ExtensionMessage.ts";
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@shared/FocusChainSettings.ts";
import { DEFAULT_MCP_DISPLAY_MODE } from "@shared/McpDisplayMode.ts";
import { Environment } from "@shared/config-types.ts";
import type { McpMarketplaceCatalog, McpServer, McpViewTab } from "@shared/mcp";
import type { UserInfo } from "@shared/nice-grpc/cline/account";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import type { TerminalProfile } from "@shared/nice-grpc/cline/state.ts";
import { StateServiceClient, UiServiceClient } from "../services/grpc-client";

import type { ApiConfiguration, ModelInfo } from "@shared/api";
import type { ClineRulesToggles } from "@shared/cline-rules";

export type View = "chat" | "mcp" | "settings" | "history" | "account" | "worktrees";

export interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  mcpServers: McpServer[];
  setMcpServers: (servers: McpServer[]) => void;
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  totalTasksSize: number | null;
  availableTerminalProfiles: TerminalProfile[];
  openRouterModels: Record<string, ModelInfo>;
  setOpenRouterModels: (models: Record<string, ModelInfo>) => void;
  
  // Navigation
  activeView: View;
  mcpTab?: McpViewTab;
  settingsTarget?: { section?: string; tab?: string; targetProvider?: string };
  navigate: (view: View, opts?: { section?: string; tab?: string; targetProvider?: string }) => void;
  navigateToChat: () => void;
  navigateToHistory: () => void;
  navigateToSettings: (section?: string) => void;
  navigateToMcp: (tab?: McpViewTab) => void;
  navigateToAccount: () => void;
  navigateToWorktrees: () => void;
  navigateToSettingsModelPicker: (opts?: { targetProvider?: string }) => void;
  settingsInitialModelTab?: "recommended" | "free";
  
  // Compat View Flags
  showSettings: boolean;
  showHistory: boolean;
  showMcp: boolean;
  showAccount: boolean;
  showWorktrees: boolean;
  
  // State Updates
  updateToggles: (key: keyof ExtensionState, toggles: Record<string, boolean>) => void;
  setExpandTaskHeader: (value: boolean) => void;
  expandTaskHeader: boolean;
  onRelinquishControl: (callback: () => void) => () => void;
}

export const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined);

export const ExtensionStateContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<View>("chat");
  const [mcpTab, setMcpTab] = useState<McpViewTab>();
  const [settingsTarget, setSettingsTarget] = useState<ExtensionStateContextType["settingsTarget"]>();
  const [expandTaskHeader, setExpandTaskHeader] = useState(true);
  const [didHydrateState, setDidHydrateState] = useState(false);
  const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null);
  const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([]);
  const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] });
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({});

  const [state, setState] = useState<ExtensionState>({
    version: "", clineMessages: [], taskHistory: [], shouldShowAnnouncement: false,
    autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS, browserSettings: DEFAULT_BROWSER_SETTINGS,
    focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS, preferredLanguage: "English", mode: "act",
    platform: DEFAULT_PLATFORM, environment: Environment.production, telemetrySetting: "unset",
    distinctId: "", planActSeparateModelsSetting: true, enableCheckpointsSetting: true,
    mcpDisplayMode: DEFAULT_MCP_DISPLAY_MODE, vscodeTerminalExecutionMode: "vscodeTerminal",
    terminalReuseEnabled: true, terminalOutputLineLimit: 500, maxConsecutiveMistakes: 3,
    welcomeViewCompleted: true, lastDismissedInfoBannerVersion: 0, lastDismissedModelBannerVersion: 0,
    lastDismissedCliBannerVersion: 0,
    remoteConfigSettings: {}, backgroundCommandRunning: false, backgroundEditEnabled: false,
    doubleCheckCompletionEnabled: false, lazyTeammateModeEnabled: false, showFeatureTips: true,
    workspaceRoots: [], primaryRootIndex: 0, isMultiRootWorkspace: false,
    multiRootSetting: { user: false, featureFlag: false }, hooksEnabled: false,
    nativeToolCallSetting: false, enableParallelToolCalling: false,
    isNewUser: false, onboardingModels: undefined, shellIntegrationTimeout: 4000,
    globalClineRulesToggles: {}, localClineRulesToggles: {}, 
    localWorkflowToggles: {}, globalWorkflowToggles: {},
    localCursorRulesToggles: {}, localWindsurfRulesToggles: {},
    localAgentsRulesToggles: {}, favoritedModelIds: [],
    remoteRulesToggles: {}, remoteWorkflowToggles: {},
    globalSkillsToggles: {},
    localSkillsToggles: {}, banners: [], welcomeBanners: [],
    openRouterModels: {},
    settingsInitialModelTab: "recommended",
  });

  const navigate = useCallback((view: View, opts?: ExtensionStateContextType["settingsTarget"] & { tab?: McpViewTab }) => {
    setActiveView(view);
    if (view === "mcp") setMcpTab(opts?.tab);
    if (view === "settings") setSettingsTarget(opts);
  }, []);

  const updateToggles = useCallback((key: keyof ExtensionState, toggles: Record<string, boolean>) => {
    setState(prev => ({ ...prev, [key]: toggles }));
  }, []);

  const relinquishControlCallbacks = useRef<Set<() => void>>(new Set());
  const onRelinquishControl = useCallback((cb: () => void) => {
    relinquishControlCallbacks.current.add(cb);
    return () => relinquishControlCallbacks.current.delete(cb);
  }, []);

  useEffect(() => {
    const stateSub = StateServiceClient.subscribeToState(EmptyRequest.create({}), {
      onResponse: (response) => {
        if (response.stateJson) {
          try {
            const stateData = JSON.parse(response.stateJson);
            setState(prev => {
                if (stateData.currentTaskItem?.id === prev.currentTaskItem?.id) {
                    stateData.clineMessages = stateData.clineMessages?.length ? stateData.clineMessages : prev.clineMessages;
                }
                if (stateData.mcpServers) setMcpServers(stateData.mcpServers);
                setDidHydrateState(true);
                return { ...prev, ...stateData };
            });
          } catch (parseError) {
            console.error("[DietCode:State] Failed to parse state JSON:", parseError);
            console.debug("[DietCode:State] Raw payload:", response.stateJson);
          }
        }
      },
      onError: (err) => console.error("[ExtensionStateContext] State subscription error:", err),
      onComplete: () => console.log("[ExtensionStateContext] State subscription closed")
    });

    const setupUiSub = (method: string, view: View) => UiServiceClient[method]({}, { 
        onResponse: () => navigate(view),
        onError: (err: Error) => console.error(`[ExtensionStateContext] UI sub error (${method}):`, err),
        onComplete: () => {}
    });
    const subs = [
        setupUiSub("subscribeToMcpButtonClicked", "mcp"),
        setupUiSub("subscribeToHistoryButtonClicked", "history"),
        setupUiSub("subscribeToChatButtonClicked", "chat"),
        setupUiSub("subscribeToAccountButtonClicked", "account"),
        setupUiSub("subscribeToSettingsButtonClicked", "settings"),
        setupUiSub("subscribeToWorktreesButtonClicked", "worktrees"),
        UiServiceClient.subscribeToRelinquishControl({}, { 
            onResponse: () => {
                for (const cb of relinquishControlCallbacks.current) {
                    cb();
                }
            },
            onError: (err) => console.error("[ExtensionStateContext] Relinquish error:", err),
            onComplete: () => {}
        })
    ];

    UiServiceClient.initializeWebview({}).catch(console.error);
    return () => { stateSub(); for (const s of subs) s(); };
  }, [navigate]);

  const contextValue: ExtensionStateContextType = {
    ...state, didHydrateState, mcpMarketplaceCatalog, totalTasksSize, availableTerminalProfiles, mcpServers, setMcpServers,
    openRouterModels, setOpenRouterModels,
    settingsInitialModelTab: state.settingsInitialModelTab,
    activeView, mcpTab, settingsTarget, navigate, updateToggles, expandTaskHeader, setExpandTaskHeader,
    onRelinquishControl,
    // Compat shims for old code
    showSettings: activeView === "settings",
    showHistory: activeView === "history",
    showMcp: activeView === "mcp",
    showAccount: activeView === "account",
    showWorktrees: activeView === "worktrees",
    navigateToSettingsModelPicker: (opts) => navigate("settings", opts),
    navigateToChat: () => navigate("chat"),
    navigateToHistory: () => navigate("history"),
    navigateToSettings: (section) => navigate("settings", { section }),
    navigateToMcp: (tab) => navigate("mcp", { tab }),
    navigateToAccount: () => navigate("account"),
    navigateToWorktrees: () => navigate("worktrees"),
  };

  return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>;
};

export const useExtensionState = () => {
    const context = useContext(ExtensionStateContext);
    if (!context) throw new Error("useExtensionState must be used within Provider");
    return context;
};
