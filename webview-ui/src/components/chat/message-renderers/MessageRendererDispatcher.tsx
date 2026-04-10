import type React from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";
import type { Mode } from "@shared/storage/types.ts";
import { getMessageHeaderMetadata } from "../row-utils";
import ChatRowHeader from "../ChatRowHeader";
import RowContentWrapper from "../RowContentWrapper";

// Import renderers
import MistakeLimitRow from "./MistakeLimitRow";
import McpServerRow from "./McpServerRow";
import FollowupRow from "./FollowupRow";
import ExplanationRow from "./ExplanationRow";
import ApiRequestRow from "./ApiRequestRow";
import AskQuestionRow from "./AskQuestionRow";
import { CommandOutputRow } from "../CommandOutputRow";
import { CompletionOutputRow } from "../CompletionOutputRow";
import { MarkdownRow } from "../MarkdownRow";
import UserMessage from "../UserMessage";
import SubagentStatusRow from "../SubagentStatusRow";
import HookMessage from "../HookMessage";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import NewTaskPreview from "../NewTaskPreview";
import ReportBugPreview from "../ReportBugPreview";
import { FeatureTip } from "../FeatureTip";
import PlanCompletionOutputRow from "../PlanCompletionOutputRow";
import { BellIcon } from "lucide-react";
import { getMcpServerDisplayName } from "@/utils/mcp";

interface MessageRendererDispatcherProps {
	message: ClineMessage;
	isLast: boolean;
	lastModifiedMessage?: ClineMessage;
	isExpanded: boolean;
	onToggleExpand: (ts: number) => void;
	onHeightChange: (isTaller: boolean) => void;
	onSetQuote: (text: string) => void;
	inputValue?: string;
	sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void;
	onCancelCommand?: () => void;
	mode?: Mode;
	reasoningContent?: string;
	responseStarted?: boolean;
	isRequestInProgress?: boolean;
	mcpServers: any[];
	mcpMarketplaceCatalog: any;
}

export const MessageRendererDispatcher: React.FC<MessageRendererDispatcherProps> = (props) => {
	const {
		message,
		isLast,
		lastModifiedMessage,
		isExpanded,
		onToggleExpand,
		onHeightChange,
		onSetQuote,
		inputValue,
		sendMessageFromChatRow,
		onCancelCommand,
		mode,
		reasoningContent,
		responseStarted,
		isRequestInProgress,
		mcpServers,
		mcpMarketplaceCatalog,
	} = props;

	const type = message.type === "ask" ? message.ask : message.say;

	// Use wrapper only for types that need quoting
	const needsWrapper = [
		"error",
		"mistake_limit_reached",
		"command",
		"use_mcp_server",
		"completion_result",
		"followup",
		"text",
		"ask_question",
	].includes(type || "");

	const isMcpServerResponding = isLast && lastModifiedMessage?.say === "mcp_server_request_started";
	let mcpServerDisplayName = "";
	if (type === "use_mcp_server") {
		const mcpServerUse = JSON.parse(message.text || "{}");
		mcpServerDisplayName = getMcpServerDisplayName(
			mcpServerUse.serverName,
			mcpMarketplaceCatalog,
		);
	}

	const headerMetadata = getMessageHeaderMetadata(
		type || "",
		message,
		isMcpServerResponding,
		mcpServerDisplayName,
	);

	const renderContent = () => {
		switch (type) {
			case "error":
				// Using ErrorRow (already complex, we can keep it as is for now)
				// biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
				return <ErrorRow message={message} />;

			case "mistake_limit_reached":
				return <MistakeLimitRow message={message} />;

			case "command": {
				const commandHasOutput = message.text?.includes("OUTPUT") ?? false;
				const isCommandExecuting = !message.commandCompleted && commandHasOutput;
				const isCommandPending = isLast && !message.commandCompleted && !commandHasOutput;
				return (
					<CommandOutputRow
						isExecuting={isCommandExecuting}
						isPending={isCommandPending}
						isExpanded={isExpanded}
						onToggleExpand={() => onToggleExpand(message.ts)}
						message={message}
						onCancel={onCancelCommand}
					/>
				);
			}

			case "use_mcp_server":
				return (
					<McpServerRow
						mcpMarketplaceCatalog={mcpMarketplaceCatalog}
						mcpServers={mcpServers}
						message={message}
					/>
				);

			case "completion_result":
				return (
					<CompletionOutputRow
						isExpanded={isExpanded}
						message={message}
						onToggleExpand={() => onToggleExpand(message.ts)}
					/>
				);

			case "followup":
				return <FollowupRow message={message} />;

			case "mcp_server_response":
				return <McpResponseDisplay message={message} />;

			case "mcp_notification":
				return (
					<div className="flex items-center gap-2 text-description py-1 px-4">
						<BellIcon className="size-3" />
						<MarkdownRow message={message} />
					</div>
				);

			case "api_req_started":
				return (
					<ApiRequestRow
						isLast={isLast}
						isRequestInProgress={isRequestInProgress}
						lastModifiedMessage={lastModifiedMessage}
						message={message}
						reasoningContent={reasoningContent}
						responseStarted={responseStarted}
					/>
				);

			case "user_feedback":
				return (
					<UserMessage
						inputValue={inputValue}
						message={message}
						onSetQuote={onSetQuote}
						sendMessageFromChatRow={sendMessageFromChatRow}
					/>
				);

			case "subagent":
				return (
					<SubagentStatusRow
						message={message}
						onHeightChange={onHeightChange}
						onToggleExpand={() => onToggleExpand(message.ts)}
					/>
				);

			case "checkpoint_created":
				return <HookMessage message={message} />;

			case "generate_explanation":
				return <ExplanationRow message={message} />;

			case "text":
				return <MarkdownRow message={message} />;

			case "tool":
			case "ask_tool" as any: {
				const tool = JSON.parse(message.text || "{}");
				const { backgroundEditEnabled } = (props as any); // Assuming passed through or from context
				return (
					<ToolCallRenderer
						backgroundEditEnabled={backgroundEditEnabled}
						isExpanded={isExpanded}
						message={message}
						onToggleExpand={() => onToggleExpand(message.ts)}
						tool={tool}
					/>
				);
			}

			case "conditional_rules_applied": {
				const conditionalRulesInfo = JSON.parse(message.text || "{}");
				const names = conditionalRulesInfo.rules?.map((r: any) => r.name).join(", ");
				return (
					<>
						<span className="font-bold mr-1.5">Conditional rules applied:</span>
						<span className="ph-no-capture wrap-break-word whitespace-pre-wrap font-normal">
							{names}
						</span>
					</>
				);
			}

			case "plan_mode_response": {
				const planResponse = JSON.parse(message.text || "{}");
				return <PlanCompletionOutputRow message={message} response={planResponse} />;
			}

			case "ask_question":
				return <AskQuestionRow message={message} />;

			case "new_task":
				return <NewTaskPreview message={message} />;

			case "report_bug":
				return <ReportBugPreview />;

			case "feature_tip":
				return <FeatureTip message={message} />;

			default:
				return null;
		}
	};

	const content = (
		<>
			{headerMetadata && <ChatRowHeader {...headerMetadata} />}
			{renderContent()}
		</>
	);

	if (needsWrapper) {
		return <RowContentWrapper onSetQuote={onSetQuote}>{content}</RowContentWrapper>;
	}

	return content;
};

export default MessageRendererDispatcher;
