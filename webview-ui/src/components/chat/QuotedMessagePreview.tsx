import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import type React from "react";
import { cn } from "@/lib/utils";

interface QuotedMessagePreviewProps {
  text: string;
  onDismiss: () => void;
  isFocused?: boolean;
}

const QuotedMessagePreview: React.FC<QuotedMessagePreviewProps> = ({
  text,
  onDismiss,
  isFocused,
}) => {
  return (
    <div className={cn(
      "bg-input-background px-1 pt-1 pb-0 mx-[15px] rounded-t-xs flex relative transition-all",
      isFocused && "ring-1 ring-focus"
    )}>
      <div className="bg-white/10 rounded-xs p-[8px_10px_10px_8px] flex items-start justify-between w-full">
        <span className="codicon codicon-reply text-description mr-0.5 shrink-0 text-[13px]" />
        <div 
          className="grow mx-0.5 whitespace-pre-wrap break-words overflow-hidden text-ellipsis line-clamp-3 text-[var(--vscode-editor-font-size)] opacity-90 leading-[1.4]"
          style={{ maxHeight: "calc(1.4 * var(--vscode-editor-font-size) * 3)" }}
          title={text}
        >
          {text}
        </div>
        <VSCodeButton 
          appearance="icon" 
          aria-label="Dismiss quote" 
          onClick={onDismiss}
          className="shrink-0 min-w-[22px] h-[22px] p-0 flex items-center justify-center m-0"
        >
          <span className="codicon codicon-close" />
        </VSCodeButton>
      </div>
    </div>
  );
};

export default QuotedMessagePreview;
