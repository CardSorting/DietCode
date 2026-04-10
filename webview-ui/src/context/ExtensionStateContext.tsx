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

export type View = "chat" | "mcp" | "settings" | "history" | "account" | "worktrees";

export interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  mcpServers: McpServer[];
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  totalTasksSize: number | null;
  availableTerminalProfiles: TerminalProfile[];
  
  // Navigation
  activeView: View;
  mcpTab?: McpViewTab;
  settingsTarget?: { section?: string; tab?: "recommended" | "free" };
  navigate: (view: View, opts?: any) => void;
  
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
  const [settingsTarget, setSettingsTarget] = useState<any>();
  const [expandTaskHeader, setExpandTaskHeader] = useState(true);
  const [didHydrateState, setDidHydrateState] = useState(false);
  const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null);
  const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([]);
  const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({ items: [] });

  const [state, setState] = useState<ExtensionState>({
    version: "", clineMessages: [], taskHistory: [], shouldShowAnnouncement: false,
    autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS, browserSettings: DEFAULT_BROWSER_SETTINGS,
    focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS, preferredLanguage: "English", mode: "act",
    platform: DEFAULT_PLATFORM, environment: Environment.production, telemetrySetting: "unset",
    distinctId: "", planActSeparateModelsSetting: true, enableCheckpointsSetting: true,
    mcpDisplayMode: DEFAULT_MCP_DISPLAY_MODE, vscodeTerminalExecutionMode: "vscodeTerminal",
    terminalReuseEnabled: true, terminalOutputLineLimit: 500, maxConsecutiveMistakes: 3,
    welcomeViewCompleted: true, lastDismissedInfoBannerVersion: 0, lastDismissedModelBannerVersion: 0,
    remoteConfigSettings: {}, backgroundCommandRunning: false, backgroundEditEnabled: false,
    doubleCheckCompletionEnabled: false, lazyTeammateModeEnabled: false, showFeatureTips: true,
    workspaceRoots: [], primaryRootIndex: 0, isMultiRootWorkspace: false,
    multiRootSetting: { user: false, featureFlag: false }, hooksEnabled: false,
    nativeToolCallSetting: false, enableParallelToolCalling: false,
  });

  const navigate = useCallback((view: View, opts?: any) => {
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
          const stateData = JSON.parse(response.stateJson);
          setState(prev => {
              if (stateData.currentTaskItem?.id === prev.currentTaskItem?.id) {
                  stateData.clineMessages = stateData.clineMessages?.length ? stateData.clineMessages : prev.clineMessages;
              }
              setDidHydrateState(true);
              return { ...prev, ...stateData };
          });
        }
      }
    });

    const setupUiSub = (method: string, view: View) => UiServiceClient[method]({}, { onResponse: () => navigate(view) });
    const subs = [
        setupUiSub("subscribeToMcpButtonClicked", "mcp"),
        setupUiSub("subscribeToHistoryButtonClicked", "history"),
        setupUiSub("subscribeToChatButtonClicked", "chat"),
        setupUiSub("subscribeToAccountButtonClicked", "account"),
        setupUiSub("subscribeToSettingsButtonClicked", "settings"),
        setupUiSub("subscribeToWorktreesButtonClicked", "worktrees"),
        UiServiceClient.subscribeToRelinquishControl({}, { onResponse: () => relinquishControlCallbacks.current.forEach(cb => cb()) })
    ];

    UiServiceClient.initializeWebview({}).catch(console.error);
    return () => { stateSub(); subs.forEach(s => s()); };
  }, [navigate]);

  const contextValue: ExtensionStateContextType = {
    ...state, didHydrateState, mcpMarketplaceCatalog, totalTasksSize, availableTerminalProfiles,
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
