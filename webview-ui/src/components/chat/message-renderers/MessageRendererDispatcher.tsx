import type React from "react";
import type { ClineMessage, ClineAskQuestion, ClineSayGenerateExplanation } from "@shared/ExtensionMessage";
import type { Mode } from "@shared/storage/types.ts";
import { getMessageHeaderMetadata } from "../row-utils";
import { useQuoteSelection } from "../hooks/useQuoteSelection";
import QuoteButton from "../QuoteButton";
import { useRef, memo, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import { Int64Request } from "@shared/nice-grpc/cline/common.ts";
import { PLATFORM_CONFIG, PlatformType } from "@/config/platform.config";
import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING } from "@shared/combineCommandSequences.ts";

// Components
import { RequestStartRow } from "../RequestStartRow";
import UserMessage from "../UserMessage";
import SubagentStatusRow from "../SubagentStatusRow";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";

// Icons & Utils
import { BellIcon, RefreshCwIcon, GiftIcon, BugIcon, TerminalIcon, CheckIcon, FileTextIcon, MessageSquareIcon, NotepadTextIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { getMcpServerDisplayName, findMatchingResourceOrTemplate } from "@/utils/mcp";
import { HOOK_OUTPUT_STRING } from "../constants";
import { Button } from "@/components/ui/button";

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
		onHeightChange, onSetQuote, sendMessageFromChatRow,
		onCancelCommand, reasoningContent, responseStarted,
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
				return <CommandOutput message={message} isExpanded={isExpanded} onToggleExpand={() => onToggleExpand(message.ts)} onCancel={onCancelCommand} isLast={isLast} />;

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
				return <CompletionResult text={message.text || ""} messageTs={message.ts} />;

			case "mcp_server_response":
				return <McpResponseDisplay message={message} />;

			case "mcp_notification":
				return <div className="flex items-center gap-2 text-description py-1 px-4"><BellIcon className="size-3" /><MarkdownRenderer content={message.text || ""} compact /></div>;

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
				return <div className="px-4 py-1 [&_p]:mb-0"><MarkdownRenderer content={message.text || ""} /></div>;

			case "conditional_rules_applied": {
				const names = JSON.parse(message.text || "{}").rules?.map((r: any) => r.name).join(", ");
				return <div className="ph-no-capture wrap-break-word whitespace-pre-wrap font-bold bg-code/50 p-2 rounded-xs border border-editor-group-border/30">Conditional rules applied: <span className="font-normal opacity-70">{names}</span></div>;
			}

			case "plan_mode_response":
				return <PlanResult text={message.text || ""} />;

			case "new_task":
				return (
					<div className="bg-badge text-badge-foreground rounded-xs p-3.5 pb-1.5 border border-panel-border/30 shadow-sm animate-in fade-in slide-in-from-bottom-1">
						<div className="flex items-center gap-2 mb-2 opacity-80"><TerminalIcon size={14} /><span className="font-bold text-xs uppercase tracking-wider">New Task Initiated</span></div>
						<MarkdownRenderer content={JSON.parse(message.text || "{}").text || ""} />
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

const CommandOutput = memo(({ message, isExpanded, onToggleExpand, onCancel, isLast }: any) => {
	const { command, output, requestsApproval } = useMemo(() => {
		const text = message.text || "";
		const outputIndex = text.indexOf(COMMAND_OUTPUT_STRING);
		const rawCommand = outputIndex === -1 ? text : text.slice(0, outputIndex).trim();
		const isReqApp = rawCommand.endsWith(COMMAND_REQ_APP_STRING);
		return {
			command: isReqApp ? rawCommand.slice(0, -COMMAND_REQ_APP_STRING.length) : rawCommand,
			output: outputIndex === -1 ? "" : text.slice(outputIndex + COMMAND_OUTPUT_STRING.length).trim(),
			requestsApproval: isReqApp,
		};
	}, [message.text]);

	const isExecuting = !message.commandCompleted && output.length > 0;
	const isPending = isLast && !message.commandCompleted && output.length === 0;
	const statusText = isExecuting ? "Running" : isPending ? "Pending" : message.commandCompleted ? "Completed" : "Skipped";

	return (
		<div className="space-y-2">
			<div className="bg-code rounded-sm border border-editor-group-border overflow-hidden">
				<div className="flex items-center justify-between px-2 py-1.5 border-b border-editor-group-border bg-black/10">
					<div className="flex items-center gap-2">
						<div className={cn("size-2 rounded-full", isExecuting ? "bg-success animate-pulse" : isPending ? "bg-warning" : "bg-description")} />
						<span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{statusText}</span>
					</div>
					{onCancel && (isExecuting || isPending) && <Button onClick={onCancel} size="sm" variant="secondary" className="h-5 text-[10px] px-1.5">cancel</Button>}
				</div>
				<div className="p-2 font-mono text-xs opacity-80 break-all"><span className="text-primary mr-1.5">$</span>{command}</div>
				{output.length > 0 && (
					<div className="border-t border-editor-group-border">
						<button onClick={onToggleExpand} className="w-full flex items-center justify-between px-2 py-1 bg-black/5 hover:bg-black/10 transition-colors">
							<span className="text-[10px] uppercase font-bold opacity-40">Output</span>
							{isExpanded ? <ChevronUpIcon size={12}/> : <ChevronDownIcon size={12}/>}
						</button>
						{isExpanded && <pre className="p-2 font-mono text-[11px] max-h-60 overflow-auto whitespace-pre-wrap opacity-70">{output}</pre>}
					</div>
				)}
			</div>
			{requestsApproval && <div className="flex items-center gap-2 px-1 text-[10px] text-warning font-medium">Requires approval</div>}
		</div>
	);
});

const CompletionResult = memo(({ text, messageTs }: { text: string; messageTs: number }) => {
	const [vDisabled, setVDisabled] = useState(false);
	const [eDisabled, setEDisabled] = useState(false);
	return (
		<div className="space-y-3">
			<div className="rounded-sm border border-success/30 bg-success/5 overflow-hidden">
				<div className="flex items-center gap-2 px-3 py-2 border-b border-success/20 bg-success/10">
					<CheckIcon className="size-3.5 text-success" /><span className="text-success font-bold text-sm uppercase tracking-tight">Task Completed</span>
				</div>
				<div className="p-3"><MarkdownRenderer content={text} compact /></div>
			</div>
			<div className="flex gap-2">
				<Button disabled={vDisabled} onClick={() => { setVDisabled(true); TaskServiceClient.taskCompletionViewChanges(Int64Request.create({ value: messageTs })); }} className="flex-1 bg-success hover:bg-success/90 h-9 font-bold text-xs"><FileTextIcon size={14} className="mr-2"/>View Changes</Button>
				{PLATFORM_CONFIG.type === PlatformType.VSCODE && <Button disabled={eDisabled} onClick={() => { setEDisabled(true); TaskServiceClient.explainChanges({ metadata: {}, messageTs }).catch(() => setEDisabled(false)); }} variant="outline" className="flex-1 border-success/30 text-success h-9 font-bold text-xs"><MessageSquareIcon size={14} className="mr-2"/>Explain</Button>}
			</div>
		</div>
	);
});

const PlanResult = memo(({ text }: { text: string }) => (
	<div className="rounded-sm border border-description/30 bg-code overflow-hidden">
		<div className="flex items-center gap-2 px-3 py-2 border-b border-editor-group-border bg-black/10">
			<NotepadTextIcon className="size-3.5 text-description" /><span className="font-bold text-sm uppercase tracking-tight opacity-70">Plan Created</span>
		</div>
		<div className="p-3"><MarkdownRenderer content={text} compact /></div>
	</div>
));

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
		<div className="bg-code border border-editor-group-border rounded-sm overflow-hidden">
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-editor-group-border/50 bg-black/10">
				<div className="flex items-center gap-2">
					<div className={cn("size-2 rounded-full", status === "running" ? "bg-success animate-pulse" : "bg-description")} />
					<span className="text-[10px] font-bold uppercase tracking-tight opacity-70">Hook: {name}</span>
				</div>
			</div>
			{output && <pre className="p-2 font-mono text-[11px] max-h-48 overflow-auto opacity-70 whitespace-pre-wrap">{output}</pre>}
		</div>
	);
};

export default memo(MessageRendererDispatcher);
