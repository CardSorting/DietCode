import { useClineAuth } from "./context/ClineAuthContext";
import { useExtensionState } from "./context/ExtensionStateContext";
import { Providers } from "./Providers";
import AccountView from "./components/account/AccountView";
import ChatView from "./components/chat/ChatView";
import HistoryView from "./components/history/HistoryView";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import SettingsView from "./components/settings/SettingsView";
import WorktreesView from "./components/worktrees/WorktreesView";

const AppContent = () => {
  const { didHydrateState, activeView, mcpTab, settingsTarget, navigate, navigateToHistory } = useExtensionState();
  const { clineUser, organizations, activeOrganization } = useClineAuth();

  if (!didHydrateState) return null;

  const renderView = () => {
    switch (activeView) {
      case "settings": return <SettingsView onDone={() => navigate("chat")} targetSection={settingsTarget?.section} />;
      case "history": return <HistoryView onDone={() => navigate("chat")} />;
      case "mcp": return <McpView initialTab={mcpTab} onDone={() => navigate("chat")} />;
      case "account": return <AccountView activeOrganization={activeOrganization} clineUser={clineUser} onDone={() => navigate("chat")} organizations={organizations} />;
      case "worktrees": return <WorktreesView onDone={() => navigate("chat")} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col font-sans antialiased overflow-hidden">
      {renderView()}
      <ChatView isHidden={activeView !== "chat"} showHistoryView={navigateToHistory} />
    </div>
  );
};

const App = () => <Providers><AppContent /></Providers>;
export default App;
