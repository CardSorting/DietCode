import { useExtensionState } from "@/context/ExtensionStateContext";
import { SlashServiceClient, TaskServiceClient } from "@/services/grpc-client";
import type { ClineMessage } from "@shared/ExtensionMessage";
import { EmptyRequest, StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { AskResponseRequest, NewTaskRequest } from "@shared/nice-grpc/cline/task.ts";
import { useCallback, useRef } from "react";
import type { ButtonActionType } from "../shared/buttonConfig";
import type { ChatState, MessageHandlers } from "../types/chatTypes";

/**
 * Custom hook for managing message handlers
 * Handles sending messages, button clicks, and task management
 */
export function useMessageHandlers(
  messages: ClineMessage[],
  chatState: ChatState,
): MessageHandlers {
  const { backgroundCommandRunning } = useExtensionState();
  const {
    setInputValue,
    activeQuote,
    setActiveQuote,
    setSelectedImages,
    setSelectedFiles,
    setSendingDisabled,
    setEnableButtons,
    clineAsk,
    lastMessage,
  } = chatState;
  const cancelInFlightRef = useRef(false);

  // Unified responder helper to reduce duplication in service calls
  const respond = useCallback(
    async (params: {
      type: "yesButtonClicked" | "noButtonClicked" | "messageResponse";
      text?: string;
      images?: string[];
      files?: string[];
    }) => {
      const { type, text, images, files } = params;
      await TaskServiceClient.askResponse(
        AskResponseRequest.create({
          responseType: type,
          text,
          images,
          files,
        }),
      );
      return true;
    },
    [],
  );

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (text: string, images: string[], files: string[]) => {
      let messageToSend = text.trim();
      const hasContent = messageToSend || images.length > 0 || files.length > 0;

      if (!hasContent) return;

      if (activeQuote) {
        messageToSend = `[context] \n> ${activeQuote} \n[/context] \n\n${messageToSend}`;
      }

      console.log("[ChatView] handleSendMessage - Sending message:", messageToSend);
      let messageSent = false;

      if (messages.length === 0) {
        await TaskServiceClient.newTask(NewTaskRequest.create({ text: messageToSend, images, files }));
        messageSent = true;
      } else if (clineAsk === "resume_task" || clineAsk === "resume_completed_task") {
        messageSent = await respond({ type: "yesButtonClicked", text: messageToSend, images, files });
      } else if (clineAsk) {
        messageSent = await respond({ type: "messageResponse", text: messageToSend, images, files });
      } else {
        const lastMsg = messages.at(-1);
        const isRunning = lastMsg?.partial || lastMsg?.say === "api_req_started";
        if (isRunning) {
          messageSent = await respond({ type: "messageResponse", text: messageToSend, images, files });
        }
      }

      if (messageSent) {
        setInputValue("");
        setActiveQuote(null);
        setSendingDisabled(true);
        setSelectedImages([]);
        setSelectedFiles([]);
        setEnableButtons(false);
        if ("disableAutoScrollRef" in chatState) {
          (chatState as any).disableAutoScrollRef.current = false;
        }
      }
    },
    [messages, clineAsk, activeQuote, respond, chatState, setInputValue, setActiveQuote, setSendingDisabled, setSelectedImages, setSelectedFiles, setEnableButtons],
  );

  // Execute button action based on type
  const executeButtonAction = useCallback(
    async (actionType: ButtonActionType, text?: string, images?: string[], files?: string[]) => {
      const trimmedInput = text?.trim();
      const hasContent = trimmedInput || images?.length || files?.length;
      const contentParams = hasContent ? { text: trimmedInput, images, files } : {};

      switch (actionType) {
        case "retry":
        case "approve":
        case "proceed":
          await respond({ type: "yesButtonClicked", ...contentParams });
          clearInputState();
          break;
        case "reject":
          await respond({ type: "noButtonClicked", ...contentParams });
          clearInputState();
          break;
        case "new_task":
          if (clineAsk === "new_task") {
            await TaskServiceClient.newTask(NewTaskRequest.create({ text: lastMessage?.text, images: [], files: [] }));
          } else {
            await startNewTask();
          }
          break;
        case "cancel":
          if (cancelInFlightRef.current) return;
          cancelInFlightRef.current = true;
          setSendingDisabled(true);
          setEnableButtons(false);
          try {
            if (backgroundCommandRunning) {
              await TaskServiceClient.cancelBackgroundCommand(EmptyRequest.create({})).catch(console.error);
            }
            await TaskServiceClient.cancelTask(EmptyRequest.create({}));
          } finally {
            cancelInFlightRef.current = false;
            setSendingDisabled(false);
            setEnableButtons(true);
          }
          break;
        case "utility":
          const utilMethod = clineAsk === "condense" ? SlashServiceClient.condense : SlashServiceClient.reportBug;
          if (clineAsk === "condense" || clineAsk === "report_bug") {
             await utilMethod.call(SlashServiceClient, StringRequest.create({ value: lastMessage?.text })).catch(console.error);
          }
          break;
      }

      if ("disableAutoScrollRef" in chatState) {
        (chatState as any).disableAutoScrollRef.current = false;
      }
    },
    [clineAsk, lastMessage, messages, clearInputState, respond, startNewTask, chatState, backgroundCommandRunning, setSendingDisabled, setEnableButtons],
  );

  const handleTaskCloseButtonClick = useCallback(() => startNewTask(), [startNewTask]);

  return { handleSendMessage, executeButtonAction, handleTaskCloseButtonClick, startNewTask };
}
