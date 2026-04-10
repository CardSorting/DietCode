import { OptionsButtons } from "@/components/chat/OptionsButtons";
import { CheckmarkControl } from "@/components/common/CheckmarkControl";
import { WithCopyButton } from "@/components/common/CopyButton";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { FileServiceClient, UiServiceClient } from "@/services/grpc-client";
import { findMatchingResourceOrTemplate, getMcpServerDisplayName } from "@/utils/mcp";
import {
  COMPLETION_RESULT_CHANGES_FLAG,
  type ClineApiReqInfo,
  type ClineAskQuestion,
  type ClineAskUseMcpServer,
  type ClineMessage,
  type ClinePlanModeResponse,
  type ClineSayGenerateExplanation,
  type ClineSayTool,
} from "@shared/ExtensionMessage";
import { COMMAND_OUTPUT_STRING } from "@shared/combineCommandSequences.ts";
import { BooleanRequest, StringRequest } from "@shared/nice-grpc/cline/common.ts";
import type { Mode } from "@shared/storage/types.ts";
import deepEqual from "fast-deep-equal";
import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleSlashIcon,
  CircleXIcon,
  FileCode2Icon,
  FilePlus2Icon,
  FoldVerticalIcon,
  ImageUpIcon,
  LightbulbIcon,
  Link2Icon,
  LoaderCircleIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SettingsIcon,
  SquareArrowOutUpRightIcon,
  SquareMinusIcon,
  TerminalIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { type MouseEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSize } from "react-use";
import CodeAccordian, { cleanPathPrefix } from "../common/CodeAccordian";
import { CommandOutputContent, CommandOutputRow } from "./CommandOutputRow";
import { CompletionOutputRow } from "./CompletionOutputRow";
import { DiffEditRow } from "./DiffEditRow";
import ErrorRow from "./ErrorRow";
import { FeatureTip } from "./FeatureTip";
import HookMessage from "./HookMessage";
import { MarkdownRow } from "./MarkdownRow";
import NewTaskPreview from "./NewTaskPreview";
import PlanCompletionOutputRow from "./PlanCompletionOutputRow";
import QuoteButton from "./QuoteButton";
import ReportBugPreview from "./ReportBugPreview";
import { RequestStartRow } from "./RequestStartRow";
import SearchResultsDisplay from "./SearchResultsDisplay";
import SubagentStatusRow from "./SubagentStatusRow";
import { ThinkingRow } from "./ThinkingRow";
import UserMessage from "./UserMessage";
import ChatRowHeader from "./ChatRowHeader";
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


interface ChatRowContentProps extends Omit<ChatRowProps, "onHeightChange"> {}

export const ProgressIndicator = () => <LoaderCircleIcon className="size-2 mr-2 animate-spin" />;
const InvisibleSpacer = () => <div aria-hidden className="h-px" />;

const ChatRow = memo(
  (props: ChatRowProps) => {
    const { isLast, onHeightChange, message } = props;
    // Store the previous height to compare with the current height
    // This allows us to detect changes without causing re-renders
    const prevHeightRef = useRef(0);

    const [chatrow, { height }] = useSize(
      <div className="relative pt-2.5 px-4">
        <ChatRowContent {...props} />
      </div>,
    );

    useEffect(() => {
      // used for partials command output etc.
      // NOTE: it's important we don't distinguish between partial or complete here since our scroll effects in chatview need to handle height change during partial -> complete
      const isInitialRender = prevHeightRef.current === 0; // prevents scrolling when new element is added since we already scroll for that
      // height starts off at Infinity
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
    }, [height, isLast, onHeightChange, message]);

    // we cannot return null as virtuoso does not support it so we use a separate visibleMessages array to filter out messages that should not be rendered
    return chatrow;
  },
  // memo does shallow comparison of props, so we need to do deep comparison of arrays/objects whose properties might change
  deepEqual,
);

export default ChatRow;

export const ChatRowContent = memo(
  ({
    message,
    isExpanded,
    onToggleExpand,
    lastModifiedMessage,
    isLast,
    inputValue,
    sendMessageFromChatRow,
    onSetQuote,
    onCancelCommand,
    mode,
    isRequestInProgress,
    reasoningContent,
    responseStarted,
  }: ChatRowContentProps) => {
    const {
      backgroundEditEnabled,
      mcpServers,
      mcpMarketplaceCatalog,
      onRelinquishControl,
      vscodeTerminalExecutionMode,
      clineMessages,
      showFeatureTips,
    } = useExtensionState();

    // Command output expansion state (for all messages, but only used by command messages)
    const [isOutputFullyExpanded, setIsOutputFullyExpanded] = useState(false);
    const prevCommandExecutingRef = useRef<boolean>(false);

    const hasAutoExpandedRef = useRef(false);
    const hasAutoCollapsedRef = useRef(false);
    const prevIsLastRef = useRef(isLast);

    // Auto-expand completion output when it's the last message (runs once per message)
    useEffect(() => {
      const isCompletionResult =
        message.ask === "completion_result" || message.say === "completion_result";

      // Auto-expand if it's last and we haven't already auto-expanded
      if (isLast && isCompletionResult && !hasAutoExpandedRef.current) {
        hasAutoExpandedRef.current = true;
        hasAutoCollapsedRef.current = false; // Reset the auto-collapse flag when expanding
      }
    }, [isLast, message.ask, message.say]);

    // Auto-collapse completion output ONCE when transitioning from last to not-last
    useEffect(() => {
      const isCompletionResult =
        message.ask === "completion_result" || message.say === "completion_result";
      const wasLast = prevIsLastRef.current;

      // Only auto-collapse if transitioning from last to not-last, and we haven't already auto-collapsed
      if (wasLast && !isLast && isCompletionResult && !hasAutoCollapsedRef.current) {
        hasAutoCollapsedRef.current = true;
        hasAutoExpandedRef.current = false; // Reset the auto-expand flag when collapsing
      }

      prevIsLastRef.current = isLast;
    }, [isLast, message.ask, message.say]);

    const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] = useMemo(() => {
      if (message.text != null && message.say === "api_req_started") {
        const info: ClineApiReqInfo = JSON.parse(message.text);
        return [info.cost, info.cancelReason, info.streamingFailedMessage, info.retryStatus];
      }
      return [undefined, undefined, undefined, undefined, undefined];
    }, [message.text, message.say]);

    // when resuming task last won't be api_req_failed but a resume_task message so api_req_started will show loading spinner. that's why we just remove the last api_req_started that failed without streaming anything
    const apiRequestFailedMessage =
      isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
        ? lastModifiedMessage?.text
        : undefined;

    const type = message.type === "ask" ? message.ask : message.say;

    const isCommandMessage = type === "command";
    // Check if command has output to determine if it's actually executing
    const commandHasOutput = message.text?.includes(COMMAND_OUTPUT_STRING) ?? false;
    // A command is executing if it has output but hasn't completed yet
    const isCommandExecuting = isCommandMessage && !message.commandCompleted && commandHasOutput;
    // A command is pending if it hasn't started (no output) and hasn't completed
    const isCommandPending =
      isCommandMessage && isLast && !message.commandCompleted && !commandHasOutput;
    const isCommandCompleted = isCommandMessage && message.commandCompleted === true;

    const isMcpServerResponding =
      isLast && lastModifiedMessage?.say === "mcp_server_request_started";



    if (conditionalRulesInfo) {
      const names = conditionalRulesInfo.rules.map((r: { name: string }) => r.name).join(", ");
      return (
        <ChatRowHeader
          title={
            <>
              <span className="font-bold mr-1.5">Conditional rules applied:</span>
              <span className="ph-no-capture wrap-break-word whitespace-pre-wrap font-normal">{names}</span>
            </>
          }
        />
      );
    }

    return (
      <MessageRendererDispatcher
        isExpanded={isExpanded}
        isLast={isLast}
        isRequestInProgress={isRequestInProgress}
        lastModifiedMessage={lastModifiedMessage}
        mcpMarketplaceCatalog={mcpMarketplaceCatalog}
        mcpServers={mcpServers}
        message={message}
        mode={mode}
        onCancelCommand={onCancelCommand}
        onHeightChange={onHeightChange}
        onSetQuote={onSetQuote}
        onToggleExpand={onToggleExpand}
        reasoningContent={reasoningContent}
        responseStarted={responseStarted}
        sendMessageFromChatRow={sendMessageFromChatRow}
      />
    );
  },
  deepEqual,
);

);
