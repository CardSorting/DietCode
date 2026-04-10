import ChatTextArea from "@/components/chat/ChatTextArea";
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview";
import type React from "react";
import { useChatContext } from "../../context/ChatContext";

interface InputSectionProps {
  placeholderText: string;
  shouldDisableFilesAndImages: boolean;
  selectFilesAndImages: () => Promise<void>;
}

/**
 * Input section including quoted message preview and chat text area
 * Consumes ChatContext to reduce prop-drilling complexity.
 */
export const InputSection: React.FC<InputSectionProps> = ({
  placeholderText,
  shouldDisableFilesAndImages,
  selectFilesAndImages,
}) => {
  const { chatState, messageHandlers, scrollBehavior } = useChatContext();
  const {
    activeQuote,
    setActiveQuote,
    isTextAreaFocused,
    inputValue,
    setInputValue,
    sendingDisabled,
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
    textAreaRef,
    handleFocusChange,
  } = chatState;

  const { isAtBottom, scrollToBottomAuto } = scrollBehavior;

  return (
    <>
      {activeQuote && (
        <div style={{ marginBottom: "-12px", marginTop: "10px" }}>
          <QuotedMessagePreview
            isFocused={isTextAreaFocused}
            onDismiss={() => setActiveQuote(null)}
            text={activeQuote}
          />
        </div>
      )}

      <ChatTextArea
        activeQuote={activeQuote}
        inputValue={inputValue}
        onFocusChange={handleFocusChange}
        onHeightChange={() => {
          if (isAtBottom) {
            scrollToBottomAuto();
          }
        }}
        onSelectFilesAndImages={selectFilesAndImages}
        onSend={() => messageHandlers.handleSendMessage(inputValue, selectedImages, selectedFiles)}
        placeholderText={placeholderText}
        ref={textAreaRef}
        selectedFiles={selectedFiles}
        selectedImages={selectedImages}
        sendingDisabled={sendingDisabled}
        setInputValue={setInputValue}
        setSelectedFiles={setSelectedFiles}
        setSelectedImages={setSelectedImages}
        shouldDisableFilesAndImages={shouldDisableFilesAndImages}
      />
    </>
  );
};
