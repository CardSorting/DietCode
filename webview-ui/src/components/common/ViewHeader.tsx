import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewHeaderProps {
  title: string;
  onDone: () => void;
  environment?: string;
  className?: string;
}

export default function ViewHeader({ title, onDone, environment, className }: ViewHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border-b border-border bg-sidebar-background shrink-0",
        className,
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDone}
          className="size-8 hover:bg-secondary/50"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <h2 className="text-sm font-bold truncate leading-none">{title}</h2>
      </div>
      {environment && (
        <div className="text-[10px] font-mono opacity-40 px-2 py-0.5 rounded-full bg-secondary truncate max-w-[120px]">
          {environment}
        </div>
      )}
    </div>
  );
}
