import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useShowNavbar } from "@/context/PlatformContext";
import { useCallback, useMemo } from "react";
import { Navbar } from "../menu/Navbar";
import { ChatProvider } from "./chat-view/context/ChatContext";
import AutoApproveBar from "./auto-approve-menu/AutoApproveBar";
import {
  ActionButtons,
  CHAT_CONSTANTS,
  ChatLayout,
  InputSection,
  MessagesArea,
  TaskSection,
  WelcomeSection,
  filterVisibleMessages,
  groupLowStakesTools,
  groupMessages,
  useChatState,
  useMessageHandlers,
  useScrollBehavior,
  useCopyPasteHandler,
  useChatSubscriptions,
} from "./chat-view";

const QUICK_WINS_HISTORY_THRESHOLD = CHAT_CONSTANTS.QUICK_WINS_HISTORY_THRESHOLD;

const ChatView = ({ isHidden, showHistoryView }: { isHidden: boolean; showHistoryView: () => void }) => {
  const showNavbar = useShowNavbar();
  const {
    clineMessages: messages,
    taskHistory,
    apiConfiguration,
    mode,
    userInfo,
    currentFocusChainChecklist,
    focusChainSettings,
  } = useExtensionState();
  
  const isProdHostedApp = userInfo?.apiBaseUrl === "https://app.cline.bot";
  const shouldShowQuickWins = isProdHostedApp && (!taskHistory || taskHistory.length < QUICK_WINS_HISTORY_THRESHOLD);

  const task = useMemo(() => messages.at(0), [messages]); 

  // Use custom hooks for state management
  const chatState = useChatState(messages);
  const {
    setInputValue,
    sendingDisabled,
    enableButtons,
    expandedRows,
    setExpandedRows,
    textAreaRef,
    selectFilesAndImages,
    shouldDisableFilesAndImages,
  } = chatState;

  // Use custom hooks for copy handling and subscriptions
  useCopyPasteHandler();
  useChatSubscriptions({
    isHidden,
    sendingDisabled,
    enableButtons,
    setInputValue,
    textAreaRef,
  });

  const visibleMessages = useMemo(() => filterVisibleMessages(messages), [messages]);
  const lastProgressMessageText = useMemo(() => focusChainSettings.enabled ? currentFocusChainChecklist : undefined, [focusChainSettings.enabled, currentFocusChainChecklist]);
  const showFocusChainPlaceholder = useMemo(() => focusChainSettings.enabled && !lastProgressMessageText, [focusChainSettings.enabled, lastProgressMessageText]);
  const groupedMessages = useMemo(() => groupLowStakesTools(groupMessages(visibleMessages)), [visibleMessages]);

  const scrollBehavior = useScrollBehavior(messages, visibleMessages, groupedMessages, expandedRows, setExpandedRows);
  const messageHandlers = useMessageHandlers(messages, chatState, scrollBehavior.disableAutoScrollRef);

  const { selectedModelInfo } = useMemo(() => normalizeApiConfiguration(apiConfiguration, mode), [apiConfiguration, mode]);

  const chatContextValue = useMemo(() => ({
    task,
    groupedMessages,
    modifiedMessages: messages,
    scrollBehavior,
    chatState,
    messageHandlers,
    apiMetrics: { totalTokensIn: 0, totalTokensOut: 0, totalCost: 0 },
    selectedModelInfo: {
      supportsPromptCache: selectedModelInfo.supportsPromptCache,
      supportsImages: selectedModelInfo.supportsImages || false,
    },
    lastProgressMessageText,
    showFocusChainPlaceholder,
  }), [task, groupedMessages, messages, scrollBehavior, chatState, messageHandlers, selectedModelInfo, lastProgressMessageText, showFocusChainPlaceholder]);

  return (
    <ChatLayout isHidden={isHidden}>
      <ChatProvider value={chatContextValue}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {showNavbar && <Navbar />}
          {task ? <TaskSection /> : <WelcomeSection showHistoryView={showHistoryView} taskHistory={taskHistory} shouldShowQuickWins={shouldShowQuickWins} telemetrySetting="" version="" />}
          {task && <MessagesArea />}
        </div>
        <footer className="bg-(--vscode-sidebar-background)" style={{ gridRow: "2" }}>
          <AutoApproveBar />
          <ActionButtons />
          <InputSection
            placeholderText={task ? "Type a message..." : "Type your task here..."}
            selectFilesAndImages={() => selectFilesAndImages(selectedModelInfo.supportsImages || false)}
            shouldDisableFilesAndImages={shouldDisableFilesAndImages}
          />
        </footer>
      </ChatProvider>
    </ChatLayout>
  );
};

export default ChatView;
