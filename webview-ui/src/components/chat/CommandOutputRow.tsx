import type React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClineMessage } from "@shared/ExtensionMessage.ts";
import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING } from "@shared/combineCommandSequences.ts";
import { memo, useMemo } from "react";
import { ExpandableCodeSection } from "./ExpandableCodeSection";

interface CommandOutputRowProps {
  message: ClineMessage;
  isExecuting?: boolean;
  isPending?: boolean;
  onCancel?: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
}

/**
 * Standardized renderer for command execution and output.
 * Uses ExpandableCodeSection for high-performance terminal display.
 */
export const CommandOutputRow: React.FC<CommandOutputRowProps> = memo(({
  message,
  isExecuting,
  isPending,
  onCancel,
  onToggleExpand,
  isExpanded,
}) => {
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

  const statusText = isExecuting ? "Running" : isPending ? "Pending" : message.commandCompleted ? "Completed" : "Skipped";

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-code rounded-sm border border-editor-group-border overflow-hidden">
        {/* Command Header */}
        <div className="flex items-center justify-between px-2 py-2 border-b border-editor-group-border bg-code">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full w-2 h-2 shrink-0", {
              "bg-success animate-pulse": isExecuting,
              "bg-editor-warning-foreground": isPending,
              "bg-description": !isExecuting && !isPending
            })} />
            <span className={cn("text-description font-medium text-xs", {
              "text-success": isExecuting,
              "text-editor-warning-foreground": isPending
            })}>
              {statusText}
            </span>
          </div>
          {onCancel && (isExecuting || isPending) && (
            <Button onClick={onCancel} size="sm" variant="secondary" className="h-6 text-xs px-2">
              cancel
            </Button>
          )}
        </div>

        {/* Command String */}
        <div className="bg-code opacity-70 p-2 font-mono text-xs break-all">
          <span className="text-vscode-symbolIcon-stringForeground mr-1.5">$</span>
          {command}
        </div>

        {/* Output Section */}
        {output.length > 0 && (
          <ExpandableCodeSection
            content={output}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            type="terminal"
            className="border-0 border-t rounded-none"
          />
        )}
      </div>

      {requestsApproval && (
        <div className="flex items-center gap-2 px-1 text-[11px] text-editor-warning-foreground opacity-80">
          <i className="codicon codicon-warning text-[12px]" />
          <span>Requires explicit approval</span>
        </div>
      )}
    </div>
  );
});

CommandOutputRow.displayName = "CommandOutputRow";
