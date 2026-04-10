import type { ClineMessage, ClineSayTool } from "@shared/ExtensionMessage";
import { useMemo, useState } from "react";
import { cleanPathPrefix } from "../common/CodeAccordian";
import ErrorRow from "./ErrorRow";
import { TypewriterText } from "./TypewriterText";
import { getIconByToolName } from "./chat-view";
import { isApiReqAbsorbable } from "./chat-view/utils/messageUtils";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

interface RequestStartRowProps {
  message: ClineMessage;
  apiRequestFailedMessage?: string;
  apiReqStreamingFailedMessage?: string;
  cost?: number;
  reasoningContent?: string;
  clineMessages: ClineMessage[];
  isExpanded: boolean;
  handleToggle: () => void;
}

export const RequestStartRow: React.FC<RequestStartRowProps> = ({
  apiRequestFailedMessage,
  apiReqStreamingFailedMessage,
  cost,
  reasoningContent,
  clineMessages,
  handleToggle,
  isExpanded,
  message,
}) => {
  const hasError = !!(apiRequestFailedMessage || apiReqStreamingFailedMessage);
  
  const currentActivities = useMemo(() => {
    if (cost != null) return [];
    const activities: { icon: React.ComponentType<{ className?: string }>; text: string }[] = [];
    const startIdx = clineMessages.findIndex(m => m.ts === message.ts) + 1;
    
    for (let i = startIdx; i < clineMessages.length; i++) {
      const msg = clineMessages[i];
      if (msg.say === "api_req_started") break;
      if (msg.ask === "tool") {
        try {
          const tool = JSON.parse(msg.text || "{}") as ClineSayTool;
          const path = cleanPathPrefix(tool.path || "");
          let text = "";
          if (tool.tool === "readFile") text = `Reading ${path}...`;
          else if (tool.tool?.startsWith("list")) text = `Exploring ${path}...`;
          else if (tool.tool === "searchFiles") text = `Searching ${path}...`;
          
          if (text) activities.push({ icon: getIconByToolName(tool.tool), text });
        } catch {}
      }
    }
    return activities;
  }, [clineMessages, message.ts, cost]);

  return (
    <div className="space-y-1">
      {cost == null && currentActivities.length > 0 && (
        <div className="flex flex-col gap-0.5 ml-1">
          {currentActivities.map((a) => (
            <div key={a.text} className="flex items-center gap-2 text-xs opacity-70">
              <a.icon className="size-2 shrink-0" />
              <TypewriterText speed={15} text={a.text} />
            </div>
          ))}
        </div>
      )}

      {reasoningContent && (
        <div className="ml-1">
          <button 
            type="button"
            onClick={handleToggle}
            className="flex items-center gap-1 text-description hover:text-foreground transition-colors text-[13px] font-medium py-0.5"
          >
            <span className={cn(cost == null && "animate-shimmer bg-linear-90 from-foreground to-description bg-[length:200%_100%] bg-clip-text text-transparent")}>
              {cost == null ? "Thinking..." : "Thought process"}
            </span>
            {cost != null && (isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />)}
          </button>
          
          {isExpanded && cost != null && (
            <div className="mt-1 text-sm text-description whitespace-pre-wrap leading-relaxed opacity-80 border-l-2 border-description/20 pl-3 py-1 animate-in fade-in slide-in-from-top-1">
              {reasoningContent}
            </div>
          )}
        </div>
      )}

      {hasError && (
        <ErrorRow
          apiReqStreamingFailedMessage={apiReqStreamingFailedMessage}
          apiRequestFailedMessage={apiRequestFailedMessage}
          message={message}
        />
      )}
    </div>
  );
};
