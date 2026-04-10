import * as React from "react";
import { cn } from "@/lib/utils";

interface TabProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const Tab = ({ children, value, onValueChange, className }: TabProps) => {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { activeValue: value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export const TabList = ({ children, activeValue, onValueChange, className }: TabListProps) => {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-secondary/50 rounded-lg", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { activeValue, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

interface TabTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  activeValue?: string;
  onValueChange?: (value: string) => void;
}

export const TabTrigger = ({ children, value, activeValue, onValueChange, className }: TabTriggerProps) => {
  const isActive = activeValue === value;
  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-all outline-none",
        isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      type="button"
    >
      {children}
    </button>
  );
};

interface TabContentProps {
  children: React.ReactNode;
  value: string;
  activeValue?: string;
  className?: string;
}

export const TabContent = ({ children, value, activeValue, className }: TabContentProps) => {
  if (activeValue !== value) return null;
  return (
    <div
      className={cn("flex-1 overflow-auto animate-in fade-in slide-in-from-bottom-1", className)}
    >
      {children}
    </div>
  );
};
