import { useEffect, useRef } from "react";
import { UiServiceClient } from "@/services/grpc-client";
import { EmptyRequest } from "@shared/nice-grpc/cline/common.ts";

interface UseChatSubscriptionsProps {
  isHidden: boolean;
  sendingDisabled: boolean;
  enableButtons: boolean;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
}

export const useChatSubscriptions = ({
  isHidden,
  sendingDisabled,
  enableButtons,
  setInputValue,
  textAreaRef,
}: UseChatSubscriptionsProps) => {
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
  }, [isHidden, textAreaRef]);

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
  }, [setInputValue, textAreaRef]);

  // Auto-focus logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHidden && !sendingDisabled && !enableButtons) {
        textAreaRef.current?.focus();
      }
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, [isHidden, sendingDisabled, enableButtons, textAreaRef]);
};
