import { StickyUserMessage } from "@/components/chat/task-header/StickyUserMessage";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import type React from "react";
import { useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { useChatContext } from "../../context/ChatContext";
import { useResponseTiming } from "../../hooks/useResponseTiming";
import { createMessageRenderer } from "../messages/MessageRenderer";

/**
 * The scrollable messages area with virtualized list
 * Consumes ChatContext to avoid prop-drilling and uses useResponseTiming for loader logic.
 */
export const MessagesArea: React.FC = () => {
  const { clineMessages } = useExtensionState();
  const {
    task,
    groupedMessages,
    modifiedMessages,
    scrollBehavior,
    chatState,
    messageHandlers,
  } = useChatContext();

  const lastRawMessage = useMemo(() => clineMessages.at(-1), [clineMessages]);

  const {
    virtuosoRef,
    scrollContainerRef,
    toggleRowExpansion,
    handleRowHeightChange,
    setIsAtBottom,
    setShowScrollToBottom,
    disableAutoScrollRef,
    handleRangeChanged,
    scrolledPastUserMessage,
    scrollToMessage,
  } = scrollBehavior;

  const scrolledPastUserMessageIndex = useMemo(() => {
    if (!scrolledPastUserMessage) return -1;
    return clineMessages.findIndex((msg) => msg.ts === scrolledPastUserMessage.ts);
  }, [clineMessages, scrolledPastUserMessage]);

  const handleScrollToUserMessage = useCallback(() => {
    if (scrollToMessage && scrolledPastUserMessageIndex >= 0) {
      scrollToMessage(scrolledPastUserMessageIndex);
    }
  }, [scrollToMessage, scrolledPastUserMessageIndex]);

  const { expandedRows, inputValue, setActiveQuote } = chatState;

  // Utilize the new response timing hook to manage "Thinking..." row logic
  const { displayedGroupedMessages } = useResponseTiming(
    modifiedMessages,
    lastRawMessage,
    groupedMessages,
  );

  const itemContent = useMemo(
    () =>
      createMessageRenderer(
        displayedGroupedMessages,
        modifiedMessages,
        expandedRows,
        toggleRowExpansion,
        handleRowHeightChange,
        setActiveQuote,
        inputValue,
        messageHandlers,
        false,
      ),
    [
      displayedGroupedMessages,
      modifiedMessages,
      expandedRows,
      toggleRowExpansion,
      handleRowHeightChange,
      setActiveQuote,
      inputValue,
      messageHandlers,
    ],
  );

  const virtuosoComponents = useMemo(() => ({ Footer: () => <div className="min-h-1" /> }), []);

  return (
    <div className="overflow-hidden flex flex-col h-full relative">
      <div className={cn("absolute top-0 left-0 right-0 z-10 pl-[15px] pr-[14px] bg-background", scrolledPastUserMessage && "pb-2")}>
        <StickyUserMessage
          isVisible={!!scrolledPastUserMessage}
          lastUserMessage={scrolledPastUserMessage}
          onScrollToMessage={handleScrollToUserMessage}
        />
      </div>

      <div className="grow flex" ref={scrollContainerRef}>
        <Virtuoso
          atBottomStateChange={(isAtBottom) => {
            setIsAtBottom(isAtBottom);
            if (isAtBottom) disableAutoScrollRef.current = false;
            setShowScrollToBottom(disableAutoScrollRef.current && !isAtBottom);
          }}
          atBottomThreshold={10}
          className="scrollable grow overflow-y-scroll"
          components={virtuosoComponents}
          data={displayedGroupedMessages}
          increaseViewportBy={{ top: 3_000, bottom: Number.MAX_SAFE_INTEGER }}
          initialTopMostItemIndex={displayedGroupedMessages.length - 1}
          itemContent={itemContent}
          key={task.ts}
          rangeChanged={handleRangeChanged}
          ref={virtuosoRef}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", overflowAnchor: "none" }}
        />
      </div>
    </div>
  );
};
