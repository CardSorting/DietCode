import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import { TaskServiceClient } from "@/services/grpc-client";
import { AskResponseRequest } from "@shared/nice-grpc/cline/task.ts";
import { cn } from "@/lib/utils";

export const OptionsButtons = ({
  options,
  selected,
  isActive,
  inputValue,
}: {
  options?: string[];
  selected?: string;
  isActive?: boolean;
  inputValue?: string;
}) => {
  if (!options?.length) return null;

  const hasSelected = selected !== undefined && options.includes(selected);

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <button
          key={index}
          id={`options-button-${index}`}
          disabled={hasSelected || !isActive}
          onClick={async () => {
            if (hasSelected || !isActive) return;
            try {
              await TaskServiceClient.askResponse(
                AskResponseRequest.create({
                  responseType: "messageResponse",
                  text: option + (inputValue ? `: ${inputValue?.trim()}` : ""),
                  images: [],
                }),
              );
            } catch (error) {
              console.error("Error sending option response:", error);
            }
          }}
          className={cn(
            "options-button p-[8px_12px] border border-vscode-editorGroup-border rounded-xs text-left text-xs transition-colors",
            option === selected 
              ? "bg-focus text-white" 
              : "bg-code-block-bg text-input-foreground",
            !(hasSelected || !isActive) && "cursor-pointer hover:bg-focus hover:text-white"
          )}
          style={{ backgroundColor: option === selected ? undefined : CODE_BLOCK_BG_COLOR }}
        >
          <span className="ph-no-capture">{option}</span>
        </button>
      ))}
    </div>
  );
};
