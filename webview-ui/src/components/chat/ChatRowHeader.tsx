import type React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatRowHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
  isLoading?: boolean;
  isOutsideWorkspace?: boolean;
  className?: string;
}

export const ChatRowHeader: React.FC<ChatRowHeaderProps> = ({
  icon,
  title,
  isLoading,
  isOutsideWorkspace,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2.5 mb-2", className)}>
      {isLoading ? (
        <span className="codicon codicon-loading codicon-modifier-spin shrink-0 size-2" />
      ) : (
        icon && <div className="shrink-0">{icon}</div>
      )}
      {isOutsideWorkspace && (
        <span
          className="codicon codicon-sign-out text-editor-warning-foreground mb-[-1.5px] -rotate-90"
          title="Outside workspace"
        />
      )}
      <span className="font-bold text-foreground truncate">{title}</span>
    </div>
  );
};
