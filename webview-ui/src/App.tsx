import { useEffect, useState, useMemo } from "react";

import { useExtensionState } from "./context/ExtensionStateContext";
import { Providers } from "./Providers";

import ChatView from "./components/chat/ChatView";
import HistoryView from "./components/history/HistoryView";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import SettingsView from "./components/settings/SettingsView";
import WorktreesView from "./components/worktrees/WorktreesView";
import ErrorBoundary from "./components/common/ErrorBoundary";
import DiagnosticErrorView from "./components/common/DiagnosticErrorView";

const AppContent = () => {
  const { didHydrateState, activeView, mcpTab, settingsTarget, navigate, navigateToHistory, environment } = useExtensionState();
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  useEffect(() => {
    console.log(`[DietCode:App] State hydration: ${didHydrateState ? "COMPLETE" : "PENDING"}`);
    if (didHydrateState) {
        console.log(`[DietCode:App] Active view: ${activeView}`);
    }
  }, [didHydrateState, activeView]);

  // Set up a timeout for state hydration to prevent permanent blank screen
  useEffect(() => {
    if (!didHydrateState) {
      const timer = setTimeout(() => {
        setHydrationTimedOut(true);
      }, 5000); // 5 seconds timeout
      return () => clearTimeout(timer);
    }
    setHydrationTimedOut(false);
  }, [didHydrateState]);

  const renderView = () => {
    switch (activeView) {
      case "settings": return <SettingsView onDone={() => navigate("chat")} targetSection={settingsTarget?.section} />;
      case "history": return <HistoryView onDone={() => navigate("chat")} />;
      case "mcp": return <McpView initialTab={mcpTab} onDone={() => navigate("chat")} />;

      case "worktrees": return <WorktreesView onDone={() => navigate("chat")} />;
      default: return null;
    }
  };

  if (!didHydrateState) {
    if (hydrationTimedOut) {
      return (
        <DiagnosticErrorView 
          title="Connection Alert: State Hydration Timeout"
          error={new Error("The webview has not received state from the extension host within the expected time window.")}
          onReset={() => {
            setHydrationTimedOut(false);
            window.location.reload();
          }}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium animate-pulse">Initializing extension state...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col font-sans antialiased overflow-hidden">
      <ErrorBoundary name="MainViewContent" title="View Render Failure">
        {renderView()}
      </ErrorBoundary>
      <ChatView isHidden={activeView !== "chat"} showHistoryView={navigateToHistory} />
    </div>
  );
};

const App = () => (
  <ErrorBoundary name="GlobalApp" title="Fatal Infrastructure Error">
    <Providers>
      <AppContent />
    </Providers>
  </ErrorBoundary>
);

export default App;
