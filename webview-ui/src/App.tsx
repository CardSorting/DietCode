import type { Boolean as ProtoBoolean, EmptyRequest } from "@shared/nice-grpc/cline/common";
import { useCallback, useEffect, useState } from "react";
import { Providers } from "./Providers";
import AccountView from "./components/account/AccountView";
import ChatView from "./components/chat/ChatView";
import HistoryView from "./components/history/HistoryView";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import OnboardingView from "./components/onboarding/OnboardingView";
import SettingsView from "./components/settings/SettingsView";
import WelcomeView from "./components/welcome/WelcomeView";
import WorktreesView from "./components/worktrees/WorktreesView";
import { useClineAuth } from "./context/ClineAuthContext";
import { useExtensionState } from "./context/ExtensionStateContext";
import { StateServiceClient, UiServiceClient } from "./services/grpc-client";

const AppContent = () => {
  const {
    didHydrateState,
    showWelcome,
    showMcp,
    mcpTab,
    showSettings,
    settingsTargetSection,
    showHistory,
    showAccount,
    showWorktrees,
    onboardingModels,
    setShouldShowAnnouncement,
    closeMcpView,
    navigateToHistory,
    hideSettings,
    hideHistory,
    hideAccount,
    hideWorktrees,
  } = useExtensionState();

  const { clineUser, organizations, activeOrganization } = useClineAuth();

  if (!didHydrateState) {
    return null;
  }



  return (
    <div className="flex h-screen w-full flex-col">
      {showSettings && <SettingsView onDone={hideSettings} targetSection={settingsTargetSection} />}
      {showHistory && <HistoryView onDone={hideHistory} />}
      {showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
      {showAccount && (
        <AccountView
          activeOrganization={activeOrganization}
          clineUser={clineUser}
          onDone={hideAccount}
          organizations={organizations}
        />
      )}
      {showWorktrees && <WorktreesView onDone={hideWorktrees} />}
      {/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
      <ChatView
        isHidden={showSettings || showHistory || showMcp || showAccount || showWorktrees}
        showHistoryView={navigateToHistory}
      />
    </div>
  );
};

const App = () => {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
};

export default App;
