import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import type { ClineMessage } from "@shared/ExtensionMessage";
import type { Mode } from "@shared/storage/types.ts";
import deepEqual from "fast-deep-equal";
import { memo, useEffect, useRef } from "react";
import { useSize } from "react-use";
import MessageRendererDispatcher from "./message-renderers/MessageRendererDispatcher";

interface ChatRowProps {
  message: ClineMessage;
  isExpanded: boolean;
  onToggleExpand: (ts: number) => void;
  lastModifiedMessage?: ClineMessage;
  isLast: boolean;
  onHeightChange: (isTaller: boolean) => void;
  inputValue?: string;
  sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void;
  onSetQuote: (text: string) => void;
  onCancelCommand?: () => void;
  mode?: Mode;
  reasoningContent?: string;
  responseStarted?: boolean;
  isRequestInProgress?: boolean;
}

const ChatRow = memo((props: ChatRowProps) => {
  const { isLast, onHeightChange, message } = props;
  const prevHeightRef = useRef(0);

  const [chatrow, { height }] = useSize(
    <div className="relative pt-2.5 px-4 outline-none">
      <ChatRowContent {...props} />
    </div>
  );

  useEffect(() => {
    const isInitialRender = prevHeightRef.current === 0;
    if (
      isLast &&
      height !== 0 &&
      height !== Number.POSITIVE_INFINITY &&
      height !== prevHeightRef.current
    ) {
      if (!isInitialRender) {
        onHeightChange(height > prevHeightRef.current);
      }
      prevHeightRef.current = height;
    }
  }, [height, isLast, onHeightChange, message.ts]);

  return chatrow;
}, deepEqual);

export default ChatRow;

const ChatRowContent = memo((props: ChatRowProps) => {
  const { mcpServers, mcpMarketplaceCatalog } = useExtensionState();

  return (
    <MessageRendererDispatcher
      {...props}
      mcpMarketplaceCatalog={mcpMarketplaceCatalog}
      mcpServers={mcpServers}
    />
  );
}, deepEqual);
