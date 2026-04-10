import type React from "react";
import { cn } from "@/lib/utils";

interface ChatRowHeaderProps {
	icon?: React.ReactNode;
	title: React.ReactNode;
	className?: string;
	isOutsideWorkspace?: boolean;
	isLoading?: boolean;
}

/**
 * A unified header for chat rows, ensuring consistent spacing and icon placement.
 */
export const ChatRowHeader: React.FC<ChatRowHeaderProps> = ({
	icon,
	title,
	className,
	isOutsideWorkspace,
	isLoading,
}) => {
	return (
		<div className={cn("flex items-center gap-2.5 mb-3", className)}>
			{isLoading ? (
				<span className="codicon codicon-loading codicon-modifier-spin shrink-0 size-2" />
			) : (
				icon && <div className="shrink-0">{icon}</div>
			)}
			{isOutsideWorkspace && (
				<span
					className="codicon codicon-sign-out ph-no-capture"
					style={{
						color: "var(--vscode-editorWarning-foreground)",
						marginBottom: "-1.5px",
						transform: "rotate(-90deg)",
					}}
					title="This operation is located outside of your workspace"
				/>
			)}
			<span className="font-bold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
				{title}
			</span>
		</div>
	);
};

export default ChatRowHeader;
