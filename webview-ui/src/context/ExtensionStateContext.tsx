import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings.ts";
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings.ts";
import { DEFAULT_PLATFORM, type ExtensionState } from "@shared/ExtensionMessage.ts";
import { DEFAULT_FOCUS_CHAIN_SETTINGS } from "@shared/FocusChainSettings.ts";
import { DEFAULT_MCP_DISPLAY_MODE } from "@shared/McpDisplayMode.ts";
import {
  type ModelInfo,
  openRouterDefaultModelId,
  openRouterDefaultModelInfo,
} from "@shared/api";
import { findLastIndex } from "@shared/array.ts";
import { Environment } from "@shared/config-types.ts";
import type { McpMarketplaceCatalog, McpServer, McpViewTab } from "@shared/mcp";
import type { UserInfo } from "@shared/nice-grpc/cline/account";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";
import type { OpenRouterCompatibleModelInfo } from "@shared/nice-grpc/cline/models";
import type { OnboardingModelGroup, TerminalProfile } from "@shared/nice-grpc/cline/state.ts";
import { convertProtoToClineMessage } from "@shared/proto-conversions/cline-message.ts";
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion.ts";
import { fromProtobufModels } from "@shared/proto-conversions/models/typeConversion.ts";
import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  McpServiceClient,
  ModelsServiceClient,
  StateServiceClient,
  UiServiceClient,
} from "../services/grpc-client";

export interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  showWelcome: boolean;
  onboardingModels: OnboardingModelGroup | undefined;
  mcpServers: McpServer[];
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  totalTasksSize: number | null;
  lastDismissedCliBannerVersion: number;
  dismissedBanners?: Array<{ bannerId: string; dismissedAt: number }>;

  availableTerminalProfiles: TerminalProfile[];

  // View state
  showMcp: boolean;
  mcpTab?: McpViewTab;
  showSettings: boolean;
  settingsTargetSection?: string;
  settingsInitialModelTab?: "recommended" | "free";
  showHistory: boolean;
  showAccount: boolean;
  showWorktrees: boolean;
  showAnnouncement: boolean;
  expandTaskHeader: boolean;

  // Setters
  setShowAnnouncement: (value: boolean) => void;
  setShouldShowAnnouncement: (value: boolean) => void;
  setGlobalClineRulesToggles: (toggles: Record<string, boolean>) => void;
  setLocalClineRulesToggles: (toggles: Record<string, boolean>) => void;
  setLocalCursorRulesToggles: (toggles: Record<string, boolean>) => void;
  setLocalWindsurfRulesToggles: (toggles: Record<string, boolean>) => void;
  setLocalAgentsRulesToggles: (toggles: Record<string, boolean>) => void;
  setLocalWorkflowToggles: (toggles: Record<string, boolean>) => void;
  setGlobalWorkflowToggles: (toggles: Record<string, boolean>) => void;
  setGlobalSkillsToggles: (toggles: Record<string, boolean>) => void;
  setLocalSkillsToggles: (toggles: Record<string, boolean>) => void;
  setRemoteRulesToggles: (toggles: Record<string, boolean>) => void;
  setRemoteWorkflowToggles: (toggles: Record<string, boolean>) => void;
  setMcpMarketplaceCatalog: (value: McpMarketplaceCatalog) => void;
  setTotalTasksSize: (value: number | null) => void;
  setExpandTaskHeader: (value: boolean) => void;
  setShowWelcome: (value: boolean) => void;
  setOnboardingModels: (value: OnboardingModelGroup | undefined) => void;


  setUserInfo: (userInfo?: UserInfo) => void;

  // Navigation state setters
  setShowMcp: (value: boolean) => void;
  setMcpTab: (tab?: McpViewTab) => void;

  // Navigation functions
  navigateToMcp: (tab?: McpViewTab) => void;
  navigateToSettings: (targetSection?: string) => void;
  navigateToSettingsModelPicker: (opts: {
    targetSection?: string;
    initialModelTab?: "recommended" | "free";
  }) => void;
  navigateToHistory: () => void;
  navigateToAccount: () => void;
  navigateToWorktrees: () => void;
  navigateToChat: () => void;

  // Hide functions
  hideSettings: () => void;
  hideHistory: () => void;
  hideAccount: () => void;
  hideWorktrees: () => void;
  hideAnnouncement: () => void;
  closeMcpView: () => void;

  // Event callbacks
  onRelinquishControl: (callback: () => void) => () => void;
}

export const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(
  undefined,
);

export const ExtensionStateContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // UI view state
  const [showMcp, setShowMcp] = useState(false);
  const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTargetSection, setSettingsTargetSection] = useState<string | undefined>(undefined);
  const [settingsInitialModelTab, setSettingsInitialModelTab] = useState<
    "recommended" | "free" | undefined
  >(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showWorktrees, setShowWorktrees] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // Helper for MCP view
  const closeMcpView = useCallback(() => {
    setShowMcp(false);
    setMcpTab(undefined);
  }, [setShowMcp, setMcpTab]);

  // Hide functions
  const hideSettings = useCallback(() => {
    setShowSettings(false);
    setSettingsTargetSection(undefined);
    setSettingsInitialModelTab(undefined);
  }, []);
  const hideHistory = useCallback(() => setShowHistory(false), [setShowHistory]);
  const hideAccount = useCallback(() => setShowAccount(false), [setShowAccount]);
  const hideWorktrees = useCallback(() => setShowWorktrees(false), [setShowWorktrees]);
  const hideAnnouncement = useCallback(() => setShowAnnouncement(false), [setShowAnnouncement]);

  // Navigation functions
  const navigateToMcp = useCallback(
    (tab?: McpViewTab) => {
      setShowSettings(false);
      setShowHistory(false);
      setShowAccount(false);
      setShowWorktrees(false);
      if (tab) {
        setMcpTab(tab);
      }
      setShowMcp(true);
    },
    [setShowMcp, setMcpTab, setShowSettings, setShowHistory, setShowAccount, setShowWorktrees],
  );

  const navigateToSettings = useCallback(
    (targetSection?: string) => {
      setShowHistory(false);
      closeMcpView();
      setShowAccount(false);
      setShowWorktrees(false);
      setSettingsTargetSection(targetSection);
      setSettingsInitialModelTab(undefined);
      setShowSettings(true);
    },
    [closeMcpView],
  );

  const navigateToSettingsModelPicker = useCallback(
    (opts: { targetSection?: string; initialModelTab?: "recommended" | "free" }) => {
      setShowHistory(false);
      closeMcpView();
      setShowAccount(false);
      setShowWorktrees(false);
      setSettingsTargetSection(opts.targetSection);
      setSettingsInitialModelTab(opts.initialModelTab);
      setShowSettings(true);
    },
    [closeMcpView],
  );

  const navigateToHistory = useCallback(() => {
    setShowSettings(false);
    closeMcpView();
    setShowAccount(false);
    setShowWorktrees(false);
    setShowHistory(true);
  }, [setShowSettings, closeMcpView, setShowAccount, setShowWorktrees, setShowHistory]);

  const navigateToAccount = useCallback(() => {
    setShowSettings(false);
    closeMcpView();
    setShowHistory(false);
    setShowWorktrees(false);
    setShowAccount(true);
  }, [setShowSettings, closeMcpView, setShowHistory, setShowWorktrees, setShowAccount]);

  const navigateToWorktrees = useCallback(() => {
    setShowSettings(false);
    closeMcpView();
    setShowHistory(false);
    setShowAccount(false);
    setShowWorktrees(true);
  }, [setShowSettings, closeMcpView, setShowHistory, setShowAccount, setShowWorktrees]);

  const navigateToChat = useCallback(() => {
    setShowSettings(false);
    closeMcpView();
    setShowHistory(false);
    setShowAccount(false);
    setShowWorktrees(false);
  }, [setShowSettings, closeMcpView, setShowHistory, setShowAccount, setShowWorktrees]);

  const [state, setState] = useState<ExtensionState>({
    version: "",
    clineMessages: [],
    taskHistory: [],
    shouldShowAnnouncement: false,
    autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
    browserSettings: DEFAULT_BROWSER_SETTINGS,
    focusChainSettings: DEFAULT_FOCUS_CHAIN_SETTINGS,
    preferredLanguage: "English",
    mode: "act",
    platform: DEFAULT_PLATFORM,
    environment: Environment.production,
    telemetrySetting: "unset",
    distinctId: "",
    planActSeparateModelsSetting: true,
    enableCheckpointsSetting: true,
    mcpDisplayMode: DEFAULT_MCP_DISPLAY_MODE,
    globalClineRulesToggles: {},
    localClineRulesToggles: {},
    localCursorRulesToggles: {},
    localWindsurfRulesToggles: {},
    localAgentsRulesToggles: {},
    localWorkflowToggles: {},
    globalWorkflowToggles: {},
    shellIntegrationTimeout: 4000,
    terminalReuseEnabled: true,
    vscodeTerminalExecutionMode: "vscodeTerminal",
    terminalOutputLineLimit: 500,
    maxConsecutiveMistakes: 3,
    defaultTerminalProfile: "default",
    isNewUser: false,
    welcomeViewCompleted: true,
    onboardingModels: undefined,
    mcpResponsesCollapsed: false, // Default value (expanded), will be overwritten by extension state
    strictPlanModeEnabled: false,
    yoloModeToggled: false,
    customPrompt: undefined,
    useAutoCondense: false,
    subagentsEnabled: false,
    clineWebToolsEnabled: { user: true, featureFlag: false },
    worktreesEnabled: { user: true, featureFlag: false },
    favoritedModelIds: [],
    lastDismissedInfoBannerVersion: 0,
    lastDismissedModelBannerVersion: 0,
    optOutOfRemoteConfig: false,
    remoteConfigSettings: {},
    backgroundCommandRunning: false,
    backgroundCommandTaskId: undefined,
    lastDismissedCliBannerVersion: 0,
    backgroundEditEnabled: false,
    doubleCheckCompletionEnabled: false,
    lazyTeammateModeEnabled: false,
    showFeatureTips: true,
    globalSkillsToggles: {},
    localSkillsToggles: {},

    // NEW: Add workspace information with defaults
    workspaceRoots: [],
    primaryRootIndex: 0,
    isMultiRootWorkspace: false,
    multiRootSetting: { user: false, featureFlag: false },
    hooksEnabled: false,
    nativeToolCallSetting: false,
    enableParallelToolCalling: false,
  });
  const [expandTaskHeader, setExpandTaskHeader] = useState(true);
  const [didHydrateState, setDidHydrateState] = useState(false);

  // Navigation state is kept separate from backend state for local UI snappy-ness
  const [showWelcome, setShowWelcome] = useState(false);
  const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null);
  const [availableTerminalProfiles, setAvailableTerminalProfiles] = useState<TerminalProfile[]>([]);
  const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState<McpMarketplaceCatalog>({
    items: [],
  });


  // References to store subscription cancellation functions
  const stateSubscriptionRef = useRef<(() => void) | null>(null);

  const mcpButtonUnsubscribeRef = useRef<(() => void) | null>(null);
  const historyButtonClickedSubscriptionRef = useRef<(() => void) | null>(null);
  const chatButtonUnsubscribeRef = useRef<(() => void) | null>(null);
  const accountButtonClickedSubscriptionRef = useRef<(() => void) | null>(null);
  const settingsButtonClickedSubscriptionRef = useRef<(() => void) | null>(null);
  const worktreesButtonClickedSubscriptionRef = useRef<(() => void) | null>(null);
  const partialMessageUnsubscribeRef = useRef<(() => void) | null>(null);
  const mcpMarketplaceUnsubscribeRef = useRef<(() => void) | null>(null);
  const workspaceUpdatesUnsubscribeRef = useRef<(() => void) | null>(null);
  const relinquishControlUnsubscribeRef = useRef<(() => void) | null>(null);

  // Add ref for callbacks
  const relinquishControlCallbacks = useRef<Set<() => void>>(new Set());

  // Create hook function
  const onRelinquishControl = useCallback((callback: () => void) => {
    relinquishControlCallbacks.current.add(callback);
    return () => {
      relinquishControlCallbacks.current.delete(callback);
    };
  }, []);
  const mcpServersSubscriptionRef = useRef<(() => void) | null>(null);

  // Subscribe to state updates and UI events using the gRPC streaming API
  useEffect(() => {
    // Set up main state subscription
    stateSubscriptionRef.current = StateServiceClient.subscribeToState(EmptyRequest.create({}), {
      onResponse: (response) => {
        if (response.stateJson) {
          try {
            const stateData = JSON.parse(response.stateJson) as ExtensionState;
            setState((prevState) => {
              // Versioning logic for autoApprovalSettings
              const incomingVersion = stateData.autoApprovalSettings?.version ?? 1;
              const currentVersion = prevState.autoApprovalSettings?.version ?? 1;
              const shouldUpdateAutoApproval = incomingVersion > currentVersion;
              
              // HACK: Preserve clineMessages if currentTaskItem is the same
              if (stateData.currentTaskItem?.id === prevState.currentTaskItem?.id) {
                stateData.clineMessages = stateData.clineMessages?.length
                  ? stateData.clineMessages
                  : prevState.clineMessages;
              }

              const newState = {
                ...prevState,
                ...stateData,
              };

              // PRODUCTION HARDENING: Ensure onboarding is skipped globally
              setShowWelcome(false);
              setDidHydrateState(true);

              return newState as ExtensionState;
            });
          } catch (error) {
            console.error("Error parsing state JSON:", error);
          }
        }
      },
      onError: (error) => console.error("Error in state subscription:", error),
    });

    // Unified UI event subscriptions
    const setupUiSubscription = (client: any, method: string, handler: () => void, ref: any) => {
      ref.current = client[method]({}, { onResponse: handler, onError: (e: any) => console.error(`${method} error:`, e) });
    };

    setupUiSubscription(UiServiceClient, 'subscribeToMcpButtonClicked', navigateToMcp, mcpButtonUnsubscribeRef);
    setupUiSubscription(UiServiceClient, 'subscribeToHistoryButtonClicked', navigateToHistory, historyButtonClickedSubscriptionRef);
    setupUiSubscription(UiServiceClient, 'subscribeToChatButtonClicked', navigateToChat, chatButtonUnsubscribeRef);
    setupUiSubscription(UiServiceClient, 'subscribeToAccountButtonClicked', navigateToAccount, accountButtonClickedSubscriptionRef);
    setupUiSubscription(UiServiceClient, 'subscribeToSettingsButtonClicked', navigateToSettings, settingsButtonClickedSubscriptionRef);
    setupUiSubscription(UiServiceClient, 'subscribeToWorktreesButtonClicked', navigateToWorktrees, worktreesButtonClickedSubscriptionRef);
    
    // Relay control
    relinquishControlUnsubscribeRef.current = UiServiceClient.subscribeToRelinquishControl({}, {
      onResponse: () => relinquishControlCallbacks.current.forEach(cb => cb()),
      onError: (e) => console.error("relinquishControl error:", e)
    });

    // Initialize webview
    UiServiceClient.initializeWebview(EmptyRequest.create({})).catch(e => console.error("Init failed:", e));

    return () => {
      [stateSubscriptionRef, mcpButtonUnsubscribeRef, historyButtonClickedSubscriptionRef, 
       chatButtonUnsubscribeRef, accountButtonClickedSubscriptionRef, settingsButtonClickedSubscriptionRef,
       worktreesButtonClickedSubscriptionRef, relinquishControlUnsubscribeRef].forEach(ref => {
         if (ref.current) {
           ref.current();
           ref.current = null;
         }
       });
    };
  }, []);


  const contextValue: ExtensionStateContextType = {
    ...state,
    didHydrateState,
    showWelcome,
    mcpMarketplaceCatalog,
    totalTasksSize,
    availableTerminalProfiles,
    showMcp,
    mcpTab,

    showSettings,
    settingsTargetSection,
    settingsInitialModelTab,
    showHistory,
    showAccount,
    showWorktrees,
    showAnnouncement,
    globalClineRulesToggles: state.globalClineRulesToggles || {},
    localClineRulesToggles: state.localClineRulesToggles || {},
    localCursorRulesToggles: state.localCursorRulesToggles || {},
    localWindsurfRulesToggles: state.localWindsurfRulesToggles || {},
    localAgentsRulesToggles: state.localAgentsRulesToggles || {},
    localWorkflowToggles: state.localWorkflowToggles || {},
    globalWorkflowToggles: state.globalWorkflowToggles || {},
    remoteRulesToggles: state.remoteRulesToggles || {},
    remoteWorkflowToggles: state.remoteWorkflowToggles || {},
    enableCheckpointsSetting: state.enableCheckpointsSetting,
    currentFocusChainChecklist: state.currentFocusChainChecklist,

    // Navigation functions
    navigateToMcp,
    navigateToSettings,
    navigateToSettingsModelPicker,
    navigateToHistory,
    navigateToAccount,
    navigateToWorktrees,
    navigateToChat,

    // Hide functions
    hideSettings,
    hideHistory,
    hideAccount,
    hideWorktrees,
    hideAnnouncement,
    setShowAnnouncement,
    setShowWelcome,
    setMcpMarketplaceCatalog,
    setShowMcp,
    setOnboardingModels: (onboardingModels) => setState((prevState) => ({ ...prevState, onboardingModels })),
    closeMcpView,
    setGlobalClineRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        globalClineRulesToggles: toggles,
      })),
    setLocalClineRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localClineRulesToggles: toggles,
      })),
    setLocalCursorRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localCursorRulesToggles: toggles,
      })),
    setLocalWindsurfRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localWindsurfRulesToggles: toggles,
      })),
    setLocalAgentsRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localAgentsRulesToggles: toggles,
      })),
    setLocalWorkflowToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localWorkflowToggles: toggles,
      })),
    setGlobalWorkflowToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        globalWorkflowToggles: toggles,
      })),
    setGlobalSkillsToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        globalSkillsToggles: toggles,
      })),
    setLocalSkillsToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        localSkillsToggles: toggles,
      })),
    setRemoteRulesToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        remoteRulesToggles: toggles,
      })),
    setRemoteWorkflowToggles: (toggles) =>
      setState((prevState) => ({
        ...prevState,
        remoteWorkflowToggles: toggles,
      })),
    setMcpTab,
    setTotalTasksSize,
    onRelinquishControl,
    expandTaskHeader,
    setExpandTaskHeader,
  };

  return (
    <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
  );
};

export const useExtensionState = () => {
  const context = useContext(ExtensionStateContext);
  if (context === undefined) {
    throw new Error("useExtensionState must be used within an ExtensionStateContextProvider");
  }
  return context;
};
