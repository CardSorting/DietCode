import type React from "react";
import type { ClineMessage, ClineAskQuestion, ClineSayGenerateExplanation, ClineSayTool, ClineSayBrowserAction } from "@shared/ExtensionMessage";
import type { Mode } from "@shared/storage/types.ts";
import { getMessageHeaderMetadata } from "../row-utils";
import { useQuoteSelection } from "../hooks/useQuoteSelection";
import QuoteButton from "../QuoteButton";
import { useRef, memo, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// Components
import { CommandOutputRow } from "../CommandOutputRow";
import { CompletionOutputRow } from "../CompletionOutputRow";
import { MarkdownRow } from "../MarkdownRow";
import UserMessage from "../UserMessage";
import SubagentStatusRow from "../SubagentStatusRow";
import PlanCompletionOutputRow from "../PlanCompletionOutputRow";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import { RequestStartRow } from "../RequestStartRow";

// Icons & Utils
import { BellIcon, RefreshCwIcon, InfoIcon, GiftIcon, BugIcon, TerminalIcon } from "lucide-react";
import { getMcpServerDisplayName, findMatchingResourceOrTemplate } from "@/utils/mcp";
import { HOOK_OUTPUT_STRING } from "../constants";

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
	clineMessages?: ClineMessage[];
}

export const MessageRendererDispatcher: React.FC<MessageRendererDispatcherProps> = (props) => {
	const {
		message, isLast, lastModifiedMessage, isExpanded, onToggleExpand,
		onHeightChange, onSetQuote, inputValue, sendMessageFromChatRow,
		onCancelCommand, mode, reasoningContent, responseStarted,
		isRequestInProgress, mcpServers, mcpMarketplaceCatalog, clineMessages = []
	} = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const { quoteState, handleMouseUp, handleQuoteClick } = useQuoteSelection(containerRef, onSetQuote);

	const type = message.type === "ask" ? message.ask : message.say;
	const isMcpServerResponding = isLast && lastModifiedMessage?.say === "mcp_server_request_started";
	
	let mcpServerDisplayName = "";
	if (type === "use_mcp_server") {
		const mcpServerUse = JSON.parse(message.text || "{}");
		mcpServerDisplayName = getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog);
	}

	const headerMetadata = getMessageHeaderMetadata(type || "", message, isMcpServerResponding, mcpServerDisplayName);

	const renderContent = () => {
		switch (type) {
			case "mistake_limit_reached":
			case "followup":
			case "ask_question": {
				const text = type === "ask_question" ? (JSON.parse(message.text || "{}") as ClineAskQuestion).text : message.text;
				return <ChatBox text={text} />;
			}

			case "command":
				return (
					<CommandOutputRow 
						isExecuting={!message.commandCompleted && (message.text?.includes("OUTPUT") ?? false)}
						isPending={isLast && !message.commandCompleted && !(message.text?.includes("OUTPUT") ?? false)}
						isExpanded={isExpanded}
						onToggleExpand={() => onToggleExpand(message.ts)}
						message={message}
						onCancel={onCancelCommand}
					/>
				);

			case "use_mcp_server": {
				const mcpServerUse = JSON.parse(message.text || "{}");
				const server = mcpServers.find((s) => s.name === mcpServerUse.serverName);
				return (
					<div className="bg-code border border-editor-group-border rounded-xs flex flex-col gap-2 p-2 mt-[-4px]">
						{mcpServerUse.type === "use_mcp_tool" ? (
							<McpToolRow alwaysExpanded mcpMarketplaceCatalog={mcpMarketplaceCatalog} mcpServers={mcpServers} server={server} toolName={mcpServerUse.toolName!} />
						) : (
							<McpResourceRow alwaysExpanded mcpMarketplaceCatalog={mcpMarketplaceCatalog} mcpServers={mcpServers} resource={findMatchingResourceOrTemplate(server?.resources ?? [], server?.resourceTemplates ?? [], mcpServerUse.uri!)} server={server} />
						)}
					</div>
				);
			}

			case "completion_result":
				return <CompletionOutputRow isExpanded={isExpanded} message={message} onToggleExpand={() => onToggleExpand(message.ts)} />;

			case "mcp_server_response":
				return <McpResponseDisplay message={message} />;

			case "mcp_notification":
				return <div className="flex items-center gap-2 text-description py-1 px-4"><BellIcon className="size-3" /><MarkdownRow message={message} /></div>;

			case "api_req_started":
				return <RequestStartRow isRequestInProgress={isRequestInProgress} message={message} reasoningContent={reasoningContent} responseStarted={responseStarted} isExpanded={isExpanded} handleToggle={() => onToggleExpand(message.ts)} clineMessages={clineMessages} />;

			case "user_feedback":
				return <UserMessage messageTs={message.ts} text={message.text} images={message.images} files={message.files} sendMessageFromChatRow={sendMessageFromChatRow} />;

			case "subagent":
				return <SubagentStatusRow message={message} onHeightChange={onHeightChange} onToggleExpand={() => onToggleExpand(message.ts)} />;

			case "checkpoint_created":
				return <HookMessageRenderer message={message} />;

			case "generate_explanation": {
				const value = JSON.parse(message.text || "{}") as ClineSayGenerateExplanation;
				return (
					<div className="flex flex-col gap-2.5 px-4 py-2 border border-editor-group-border rounded-sm bg-code mx-4 mb-2">
						<div className="flex items-center gap-2 text-description"><RefreshCwIcon className="size-3" /><span className="font-semibold text-[11px]">Explanation Needed</span></div>
						<p className="text-[13px] leading-normal">{value.explanation}</p>
					</div>
				);
			}

			case "text":
				return <MarkdownRow message={message} />;

			case "conditional_rules_applied": {
				const names = JSON.parse(message.text || "{}").rules?.map((r: any) => r.name).join(", ");
				return <div className="ph-no-capture wrap-break-word whitespace-pre-wrap font-bold bg-code/50 p-2 rounded-xs border border-editor-group-border/30">Conditional rules applied: <span className="font-normal opacity-70">{names}</span></div>;
			}

			case "plan_mode_response":
				return <PlanCompletionOutputRow message={message} response={JSON.parse(message.text || "{}")} />;

			case "new_task":
				return (
					<div className="bg-badge text-badge-foreground rounded-xs p-3.5 pb-1.5 border border-panel-border/30 shadow-sm animate-in fade-in slide-in-from-bottom-1">
						<div className="flex items-center gap-2 mb-2 opacity-80"><TerminalIcon size={14} /><span className="font-bold text-xs uppercase tracking-wider">New Task Initiated</span></div>
						<MarkdownRow message={{ ...message, text: JSON.parse(message.text || "{}").text }} />
					</div>
				);

			case "report_bug":
				return (
					<div className="p-4 border border-destructive/20 bg-destructive/5 rounded-md flex flex-col gap-3">
						<div className="flex items-center gap-2 text-destructive"><BugIcon size={18} /><span className="font-bold">Bug Detected</span></div>
						<p className="text-sm opacity-80">DietCode encountered a potential issue. You can help improve it by reporting this bug.</p>
					</div>
				);

			case "feature_tip":
				return (
					<div className="p-4 border border-button-background/20 bg-button-background/5 rounded-md flex items-start gap-3">
						<GiftIcon className="text-button-background shrink-0 mt-0.5" size={18} />
						<div className="space-y-1">
							<span className="font-bold text-sm block">Pro Tip</span>
							<p className="text-sm opacity-80">{message.text}</p>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="relative isolate group/dispatcher" onMouseUp={handleMouseUp} ref={containerRef}>
			{headerMetadata && (
				<div className={cn("flex items-center gap-2.5 mb-3", headerMetadata.className)}>
					{headerMetadata.isLoading ? (
						<span className="codicon codicon-loading codicon-modifier-spin shrink-0 size-2" />
					) : (
						headerMetadata.icon && <div className="shrink-0">{headerMetadata.icon}</div>
					)}
					{headerMetadata.isOutsideWorkspace && (
						<span className="codicon codicon-sign-out text-editor-warning-foreground mb-[-1.5px] rotate-[-90deg]" title="Outside workspace" />
					)}
					<span className="font-bold text-foreground truncate">{headerMetadata.title}</span>
				</div>
			)}
			{renderContent()}
			{quoteState.visible && <QuoteButton left={quoteState.left} onClick={handleQuoteClick} top={quoteState.top} />}
		</div>
	);
};

const ChatBox = ({ text }: { text?: string }) => (
	<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-2 px-3 shadow-inner">
		<span className="ph-no-capture block whitespace-pre-wrap break-words text-sm opacity-90 leading-relaxed">{text}</span>
	</div>
);

const HookMessageRenderer = ({ message }: { message: ClineMessage }) => {
	const { name, status, output } = useMemo(() => {
		const outputIndex = (message.text || "").indexOf(HOOK_OUTPUT_STRING);
		const metaStr = outputIndex === -1 ? (message.text || "") : (message.text || "").slice(0, outputIndex).trim();
		const meta = JSON.parse(metaStr || "{}");
		return {
			name: meta.hookName || "Unknown",
			status: meta.status || "unknown",
			output: outputIndex === -1 ? "" : (message.text || "").slice(outputIndex + HOOK_OUTPUT_STRING.length).trim()
		};
	}, [message.text]);

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-xs opacity-70"><InfoIcon size={12} /><b>Hook:</b> {name}</div>
			<div className="bg-code border border-editor-group-border rounded-xs overflow-hidden">
				<div className="flex items-center justify-between px-3 py-1.5 border-b border-editor-group-border/50 bg-black/10">
					<div className="flex items-center gap-2">
						<div className={cn("size-2 rounded-full", status === "running" ? "bg-success animate-pulse" : "bg-description")} />
						<span className="text-[11px] font-medium uppercase tracking-tight opacity-70">{status}</span>
					</div>
				</div>
				{output && <div className="p-2 font-mono text-[11px] max-h-48 overflow-auto opacity-80">{output}</div>}
			</div>
		</div>
	);
};

export default memo(MessageRendererDispatcher);
