import type { ClineMessage } from "@shared/ExtensionMessage.ts";
import { useMemo } from "react";
import type { ChatState } from "../types/chatTypes";
import { useInputSelection } from "./useInputSelection";
import { useUIInteractions } from "./useUIInteractions";

/**
 * Custom hook for managing chat state.
 * Refactored into a thin coordinator of specialized domain hooks.
 */
export function useChatState(messages: ClineMessage[]): ChatState {
  const inputState = useInputSelection();
  const uiState = useUIInteractions(messages);

  // Derived state
  const lastMessage = useMemo(() => messages.at(-1), [messages]);
  const secondLastMessage = useMemo(() => messages.at(-2), [messages]);
  const clineAsk = useMemo(
    () => (lastMessage?.type === "ask" ? lastMessage.ask : undefined),
    [lastMessage],
  );
  const task = useMemo(() => messages.at(0), [messages]);

  return {
    ...inputState,
    ...uiState,
    
    // Derived values
    lastMessage,
    secondLastMessage,
    clineAsk,
    task,

    // Composite Handlers
    resetState: inputState.resetInput,
  };
}
