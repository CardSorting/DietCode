import TaskHeader from "@/components/chat/task-header/TaskHeader";
import type React from "react";
import { useChatContext } from "../../context/ChatContext";

/**
 * Task section shown when there's an active task
 * Consumes ChatContext to integrate with TaskHeader without prop-drilling.
 */
export const TaskSection: React.FC = () => {
  const {
    task,
    apiMetrics,
    lastApiReqTotalTokens,
    selectedModelInfo,
    messageHandlers,
    lastProgressMessageText,
    showFocusChainPlaceholder,
  } = useChatContext();
  return (
    <TaskHeader
      cacheReads={apiMetrics.totalCacheReads}
      cacheWrites={apiMetrics.totalCacheWrites}
      doesModelSupportPromptCache={selectedModelInfo.supportsPromptCache}
      lastApiReqTotalTokens={lastApiReqTotalTokens}
      lastProgressMessageText={lastProgressMessageText}
      onClose={messageHandlers.handleTaskCloseButtonClick}
      onSendMessage={messageHandlers.handleSendMessage}
      showFocusChainPlaceholder={showFocusChainPlaceholder}
      task={task}
      tokensIn={apiMetrics.totalTokensIn}
      tokensOut={apiMetrics.totalTokensOut}
      totalCost={apiMetrics.totalCost}
    />
  );
};
