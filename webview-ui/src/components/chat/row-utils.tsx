import type React from "react";
import {
	TerminalIcon,
	CircleXIcon,
} from "lucide-react";
import type { ClineMessage } from "@shared/ExtensionMessage";

export interface RowHeaderMetadata {
	icon?: React.ReactNode;
	title: React.ReactNode;
	className?: string;
	isLoading?: boolean;
	isOutsideWorkspace?: boolean;
}

/**
 * Maps message types to their respective icons and titles for consistent header rendering.
 */
export const getMessageHeaderMetadata = (
	type: string,
	message: ClineMessage,
	isMcpServerResponding?: boolean,
	mcpServerDisplayName?: string,
): RowHeaderMetadata | null => {
	switch (type) {
		case "error":
			return {
				icon: <span className="codicon codicon-error text-error mb-[-1.5px]" />,
				title: <span className="text-error font-bold">Error</span>,
			};
		case "mistake_limit_reached":
			return {
				icon: <CircleXIcon className="text-error size-2" />,
				title: <span className="text-error font-bold">DietCode is having trouble...</span>,
			};
		case "command":
			return {
				icon: <TerminalIcon className="text-foreground size-2" />,
				title: <span className="font-bold text-foreground">DietCode wants to execute this command:</span>,
			};
		case "use_mcp_server":
			return {
				icon: isMcpServerResponding ? (
					<span className="codicon codicon-loading codicon-modifier-spin shrink-0 size-2" />
				) : (
					<span className="codicon codicon-server text-foreground mb-[-1.5px]" />
				),
				title: (
					<span className="ph-no-capture font-bold text-foreground wrap-break-word">
						DietCode wants to use a tool on the{" "}
						<code className="break-all">{mcpServerDisplayName}</code> MCP server:
					</span>
				),
			};
		case "completion_result":
			return {
				icon: <span className="codicon codicon-check text-success mb-[-1.5px]" />,
				title: <span className="text-success font-bold">Task Completed</span>,
			};
		case "followup":
			return {
				icon: <span className="codicon codicon-question text-foreground mb-[-1.5px]" />,
				title: <span className="font-bold text-foreground">DietCode has a question:</span>,
			};
		case "ask_question":
			return {
				icon: <span className="codicon codicon-question text-foreground mb-[-1.5px]" />,
				title: <span className="font-bold text-foreground">DietCode has a question:</span>,
			};
		default:
			return null;
	}
};
