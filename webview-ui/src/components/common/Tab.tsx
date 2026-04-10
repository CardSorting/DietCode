import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabContextType {
  activeValue: string;
  onValueChange: (value: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("Tab sub-components must be used within a Tab component");
  }
  return context;
};

interface TabProps {
  children: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export const Tab = ({ children, value, onValueChange, className }: TabProps) => {
  return (
    <TabContext.Provider value={{ activeValue: value, onValueChange }}>
      <div className={cn("flex flex-col h-full overflow-hidden", className)}>
        {children}
      </div>
    </TabContext.Provider>
  );
};

interface TabListProps {
  children: ReactNode;
  className?: string;
}

export const TabList = ({ children, className }: TabListProps) => {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-secondary/50 rounded-lg", className)}>
      {children}
    </div>
  );
};

interface TabTriggerProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export const TabTrigger = ({ children, value, className }: TabTriggerProps) => {
  const { activeValue, onValueChange } = useTabContext();
  const isActive = activeValue === value;
  
  return (
    <button
      onClick={() => onValueChange(value)}
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
  children: ReactNode;
  value: string;
  className?: string;
}

export const TabContent = ({ children, value, className }: TabContentProps) => {
  const { activeValue } = useTabContext();
  
  if (activeValue !== value) return null;
  
  return (
    <div
      className={cn("flex-1 overflow-auto animate-in fade-in slide-in-from-bottom-1", className)}
    >
      {children}
    </div>
  );
};
