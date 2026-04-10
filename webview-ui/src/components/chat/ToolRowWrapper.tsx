import type React from "react";
import type { ReactNode } from "react";
import { ChatRowHeader } from "./ChatRowHeader";
import { getToolMetadata } from "./tool-utils";
import type { ClineSayTool } from "@shared/ExtensionMessage";

interface ToolRowWrapperProps {
    tool: ClineSayTool;
    messageType?: string;
    children: ReactNode;
    isOutsideWorkspace?: boolean;
}

/**
 * Standardized wrapper for tool rows.
 * Handles headers, icons, and workspace warnings consistently.
 */
export const ToolRowWrapper: React.FC<ToolRowWrapperProps> = ({
    tool,
    messageType,
    children,
    isOutsideWorkspace,
}) => {
    const { icon, title, shouldShowWorkspaceWarning } = getToolMetadata(tool, messageType);
    
    // Explicitly check isOutsideWorkspace prop, fallback to tool-specific metadata
    const showWarning = isOutsideWorkspace ?? (shouldShowWorkspaceWarning && tool.operationIsLocatedInWorkspace === false);

    return (
        <div className="flex flex-col gap-2">
            <ChatRowHeader 
                icon={icon}
                title={title}
                isOutsideWorkspace={showWarning}
            />
            <div className="flex flex-col gap-1.5 ml-0">
                {children}
            </div>
        </div>
    );
};
