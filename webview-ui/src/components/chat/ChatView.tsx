import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useShowNavbar } from "@/context/PlatformContext";
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client";
import { combineApiRequests } from "@shared/combineApiRequests.ts";
import { combineCommandSequences } from "@shared/combineCommandSequences.ts";
import { combineErrorRetryMessages } from "@shared/combineErrorRetryMessages.ts";
import { combineHookSequences } from "@shared/combineHookSequences.ts";
import { getApiMetrics, getLastApiReqTotalTokens } from "@shared/getApiMetrics.ts";
import { BooleanRequest, StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { useCallback, useEffect, useMemo } from "react";
import { useMount } from "react-use";
import { Navbar } from "../menu/Navbar";
import { ChatProvider } from "./chat-view/context/ChatContext";
import AutoApproveBar from "./auto-approve-menu/AutoApproveBar";
// Import utilities and hooks from the new structure
import {
  ActionButtons,
  CHAT_CONSTANTS,
  ChatLayout,
  InputSection,
  MessagesArea,
  TaskSection,
  WelcomeSection,
  convertHtmlToMarkdown,
  filterVisibleMessages,
  groupLowStakesTools,
  groupMessages,
  useChatState,
  useMessageHandlers,
  useScrollBehavior,
  useCopyPasteHandler,
} from "./chat-view";

interface ChatViewProps {
  isHidden: boolean;
  showHistoryView: () => void;
}

// Use constants from the imported module
const MAX_IMAGES_AND_FILES_PER_MESSAGE = CHAT_CONSTANTS.MAX_IMAGES_AND_FILES_PER_MESSAGE;
const QUICK_WINS_HISTORY_THRESHOLD = 3;

const ChatView = ({ isHidden, showHistoryView }: ChatViewProps) => {
  const showNavbar = useShowNavbar();
  const {
    version,
    clineMessages: messages,
    taskHistory,
    apiConfiguration,
    telemetrySetting,
    mode,
    userInfo,
    currentFocusChainChecklist,
    focusChainSettings,
    hooksEnabled,
  } = useExtensionState();
  const isProdHostedApp = userInfo?.apiBaseUrl === "https://app.cline.bot";
  const shouldShowQuickWins =
    isProdHostedApp && (!taskHistory || taskHistory.length < QUICK_WINS_HISTORY_THRESHOLD);

  //const task = messages.length > 0 ? (messages[0].say === "task" ? messages[0] : undefined) : undefined) : undefined
  const task = useMemo(() => messages.at(0), [messages]); // leaving this less safe version here since if the first message is not a task, then the extension is in a bad state and needs to be debugged (see Cline.abort)
  const modifiedMessages = useMemo(() => {
    const slicedMessages = messages.slice(1);
    // Only combine hook sequences if hooks are enabled
    const withHooks = hooksEnabled ? combineHookSequences(slicedMessages) : slicedMessages;
    return combineErrorRetryMessages(combineApiRequests(combineCommandSequences(withHooks)));
  }, [messages, hooksEnabled]);
  // has to be after api_req_finished are all reduced into api_req_started messages
  const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages]);

  const lastApiReqTotalTokens = useMemo(
    () => getLastApiReqTotalTokens(modifiedMessages) || undefined,
    [modifiedMessages],
  );

  // Use custom hooks for state management
  const chatState = useChatState(messages);
  const {
    setInputValue,
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    sendingDisabled,
    enableButtons,
    expandedRows,
    setExpandedRows,
    textAreaRef,
  } = chatState;

  // Use custom hooks for copy handling
  useCopyPasteHandler();
  // Button state is now managed by useButtonState hook

  // handleFocusChange is already provided by chatState

  // Use message handlers hook
  const messageHandlers = useMessageHandlers(messages, chatState);

  const { selectedModelInfo } = useMemo(() => {
    return normalizeApiConfiguration(apiConfiguration, mode);
  }, [apiConfiguration, mode]);

  const selectFilesAndImages = useCallback(async () => {
    try {
      const response = await FileServiceClient.selectFiles(
        BooleanRequest.create({
          value: selectedModelInfo.supportsImages,
        }),
      );
      if (
        response?.values1 &&
        response.values2 &&
        (response.values1.length > 0 || response.values2.length > 0)
      ) {
        const currentTotal = selectedImages.length + selectedFiles.length;
        const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - currentTotal;

        if (availableSlots > 0) {
          // Prioritize images first
          const imagesToAdd = Math.min(response.values1.length, availableSlots);
          if (imagesToAdd > 0) {
            setSelectedImages((prevImages) => [
              ...prevImages,
              ...response.values1.slice(0, imagesToAdd),
            ]);
          }

          // Use remaining slots for files
          const remainingSlots = availableSlots - imagesToAdd;
          if (remainingSlots > 0) {
            setSelectedFiles((prevFiles) => [
              ...prevFiles,
              ...response.values2.slice(0, remainingSlots),
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Error selecting images & files:", error);
    }
  }, [selectedModelInfo.supportsImages]);

  const shouldDisableFilesAndImages =
    selectedImages.length + selectedFiles.length >= MAX_IMAGES_AND_FILES_PER_MESSAGE;

  // Subscribe to show webview events from the backend
  useEffect(() => {
    const cleanup = UiServiceClient.subscribeToShowWebview(
      {},
      {
        onResponse: (event) => {
          // Only focus if not hidden and preserveEditorFocus is false
          if (!isHidden && !event.preserveEditorFocus) {
            textAreaRef.current?.focus();
          }
        },
        onError: (error) => {
          console.error("Error in showWebview subscription:", error);
        },
        onComplete: () => {
          console.log("showWebview subscription completed");
        },
      },
    );

    return cleanup;
  }, [isHidden]);

  // Set up addToInput subscription
  useEffect(() => {
    const cleanup = UiServiceClient.subscribeToAddToInput(
      {},
      {
        onResponse: (event) => {
          if (event.value) {
            setInputValue((prevValue) => {
              const newText = event.value;
              const newTextWithNewline = `${newText}\n`;
              return prevValue ? `${prevValue}\n${newTextWithNewline}` : newTextWithNewline;
            });
            // Add scroll to bottom after state update
            // Auto focus the input and start the cursor on a new line for easy typing
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
                textAreaRef.current.focus();
              }
            }, 0);
          }
        },
        onError: (error) => {
          console.error("Error in addToInput subscription:", error);
        },
        onComplete: () => {
          console.log("addToInput subscription completed");
        },
      },
    );

    return cleanup;
  }, []);

  useMount(() => {
    // NOTE: the vscode window needs to be focused for this to work
    textAreaRef.current?.focus();
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHidden && !sendingDisabled && !enableButtons) {
        textAreaRef.current?.focus();
      }
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, [isHidden, sendingDisabled, enableButtons]);

  const visibleMessages = useMemo(() => {
    return filterVisibleMessages(modifiedMessages);
  }, [modifiedMessages]);

  const lastProgressMessageText = useMemo(() => {
    if (!focusChainSettings.enabled) {
      return undefined;
    }

    // First check if we have a current focus chain list from the extension state
    if (currentFocusChainChecklist) {
      return currentFocusChainChecklist;
    }

    // Fall back to the last task_progress message if no state focus chain list
    const lastProgressMessage = [...modifiedMessages]
      .reverse()
      .find((message) => message.say === "task_progress");
    return lastProgressMessage?.text;
  }, [focusChainSettings.enabled, modifiedMessages, currentFocusChainChecklist]);

  const showFocusChainPlaceholder = useMemo(() => {
    // Show placeholder whenever focus chain is enabled and no checklist exists yet.
    return focusChainSettings.enabled && !lastProgressMessageText;
  }, [focusChainSettings.enabled, lastProgressMessageText]);

  const groupedMessages = useMemo(() => {
    return groupLowStakesTools(groupMessages(visibleMessages));
  }, [visibleMessages]);

  // Use scroll behavior hook
  const scrollBehavior = useScrollBehavior(
    messages,
    visibleMessages,
    groupedMessages,
    expandedRows,
    setExpandedRows,
  );

  const placeholderText = useMemo(() => {
    const text = task ? "Type a message..." : "Type your task here...";
    return text;
  }, [task]);


  const chatContextValue = useMemo(
    () => ({
      task,
      groupedMessages,
      modifiedMessages,
      scrollBehavior,
      chatState,
      messageHandlers,
      apiMetrics,
      lastApiReqTotalTokens,
      selectedModelInfo: {
        supportsPromptCache: selectedModelInfo.supportsPromptCache,
        supportsImages: selectedModelInfo.supportsImages || false,
      },
      lastProgressMessageText,
      showFocusChainPlaceholder,
    }),
    [
      task,
      groupedMessages,
      modifiedMessages,
      scrollBehavior,
      chatState,
      messageHandlers,
      apiMetrics,
      lastApiReqTotalTokens,
      selectedModelInfo,
      lastProgressMessageText,
      showFocusChainPlaceholder,
    ],
  );

  return (
    <ChatLayout isHidden={isHidden}>
      <ChatProvider value={chatContextValue}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {showNavbar && <Navbar />}
          {task ? <TaskSection /> : <WelcomeSection showHistoryView={showHistoryView} />}
          {task && <MessagesArea />}
        </div>
        <footer className="bg-(--vscode-sidebar-background)" style={{ gridRow: "2" }}>
          <AutoApproveBar />
          <ActionButtons />
          <InputSection
            placeholderText={placeholderText}
            selectFilesAndImages={selectFilesAndImages}
            shouldDisableFilesAndImages={shouldDisableFilesAndImages}
          />
        </footer>
      </ChatProvider>
    </ChatLayout>
  );
};

export default ChatView;
