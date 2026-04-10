import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import type { ActionMetadata } from "./types";
import { cn } from "@/lib/utils";

interface AutoApproveMenuItemProps {
  action: ActionMetadata;
  isChecked: (action: ActionMetadata) => boolean;
  onToggle: (action: ActionMetadata, checked: boolean) => Promise<void>;
  showIcon?: boolean;
  disabled?: boolean;
}

const AutoApproveMenuItem = ({
  action,
  isChecked,
  onToggle,
  showIcon = true,
  disabled = false,
}: AutoApproveMenuItemProps) => {
  const checked = isChecked(action);

  const onChange = async (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    await onToggle(action, !checked);
  };

  return (
    <div className="w-full" style={{ opacity: disabled ? 0.5 : 1 }}>
      <div 
        className={cn("w-full py-[2px] px-[0.125rem] m-0", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        onClick={onChange}
      >
        <VSCodeCheckbox checked={checked} disabled={disabled}>
          <div className="w-full flex text-sm items-center justify-start text-foreground gap-2">
            {showIcon && <span className={`codicon ${action.icon} icon`} />}
            <span className="label text-ellipsis overflow-hidden whitespace-nowrap">{action.label}</span>
          </div>
        </VSCodeCheckbox>
      </div>
      {action.subAction && (
        <div 
          className={cn(
            "relative pl-6 origin-top transition-all duration-200 ease-in-out",
            checked ? "scale-y-100 opacity-100 h-auto overflow-visible" : "scale-y-0 opacity-0 h-0 overflow-hidden"
          )}
          {...(!checked ? { inert: "" } : {})}
        >
          <AutoApproveMenuItem
            action={action.subAction}
            isChecked={isChecked}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
};

export default AutoApproveMenuItem;
