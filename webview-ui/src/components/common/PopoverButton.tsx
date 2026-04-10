import type React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PopoverButtonProps {
  icon: string;
  title: string;
  tooltip: string;
  onOpen?: () => void;
  headerAction?: {
    icon: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  className?: string;
  triggerClassName?: string;
}

const PopoverButton: React.FC<PopoverButtonProps> = ({
  icon,
  title,
  tooltip,
  onOpen,
  headerAction,
  children,
  className,
  triggerClassName,
}) => {
  return (
    <Popover onOpenChange={(open) => open && onOpen?.()}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "p-2 hover:bg-vscode-toolbar-hoverBackground rounded-xs transition-colors text-vscode-foreground",
                triggerClassName
              )}
            >
              <i className={`codicon codicon-${icon} text-[16px]`} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent className={cn("w-80 p-0 flex flex-col", className)} align="end" side="top">
        <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border bg-sidebar-background">
          <span className="text-xs font-bold uppercase tracking-wider text-description">
            {title}
          </span>
          {headerAction && (
            <button
              type="button"
              onClick={headerAction.onClick}
              className="p-1 hover:bg-vscode-toolbar-hoverBackground rounded-xs transition-colors"
            >
              <i className={`codicon codicon-${headerAction.icon} text-[12px]`} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto max-h-[300px]">
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PopoverButton;
