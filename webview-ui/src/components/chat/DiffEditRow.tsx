import { cn } from "@/lib/utils";
import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { FilePlus, FileText, FileX, SquareArrowOutUpRightIcon } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { parsePatch, type Patch } from "./utils/diff-parser";

// Style mappings for actions
const ACTION_STYLES = {
  Add: { icon: FilePlus, iconClass: "text-success", borderClass: "border-l-success" },
  Delete: { icon: FileX, iconClass: "text-error", borderClass: "border-l-error" },
  default: { icon: FileText, iconClass: "text-info", borderClass: "border-l-background" },
} as const;

interface DiffEditRowProps {
  patch: string;
  path: string;
  isLoading?: boolean;
  startLineNumbers?: number[];
}

export const DiffEditRow = memo<DiffEditRowProps>(
  ({ patch, path, isLoading, startLineNumbers }) => {
    const { parsedFiles, isStreaming } = useMemo(() => {
      const parsed = parsePatch(patch, path);
      return {
        parsedFiles: parsed.parsedFiles,
        isStreaming: isLoading || parsed.isStreaming,
      };
    }, [patch, path, isLoading]);

    if (!path) return null;

    return (
      <div className="space-y-4 rounded-xs">
        {parsedFiles.map((file, index) => (
          <FileBlock
            file={file}
            isStreaming={isStreaming}
            key={`${file.path}-${index}`}
            startLineNumber={startLineNumbers?.[index]}
          />
        ))}
      </div>
    );
  },
);

const FileBlock = memo<{ file: Patch; isStreaming: boolean; startLineNumber?: number }>(
  ({ file, isStreaming, startLineNumber }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldFollowRef = useRef(true);
    const isProgrammaticScrollRef = useRef(false);

    // Auto-scroll to bottom during streaming
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!isExpanded || !isStreaming || !shouldFollowRef.current || !container) return;

      isProgrammaticScrollRef.current = true;
      container.scrollTop = container.scrollHeight - container.clientHeight;
      requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
    }, [file.lines.length, isExpanded, isStreaming]);

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container || isProgrammaticScrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      shouldFollowRef.current = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    };

    const handleOpenFile = (event: React.MouseEvent) => {
      event.stopPropagation();
      if (file.path) {
        FileServiceClient.openFileRelativePath(StringRequest.create({ value: file.path }))
          .catch((err) => console.error("Failed to open file:", err));
      }
    };

    const actionStyle = ACTION_STYLES[file.action as keyof typeof ACTION_STYLES] ?? ACTION_STYLES.default;
    const ActionIcon = actionStyle.icon;

    const lineNumbers = useMemo(() => {
      if (startLineNumber === undefined) return undefined;
      let oldLine = startLineNumber;
      let newLine = startLineNumber;

      return file.lines.map((line) => {
        const isAddition = line.startsWith("+");
        const isDeletion = line.startsWith("-");
        if (isDeletion) {
          const display = oldLine;
          oldLine += 1;
          return display;
        }
        const display = newLine;
        newLine += 1;
        if (!isAddition) oldLine += 1;
        return display;
      });
    }, [file.lines, startLineNumber]);

    return (
      <div className="bg-code rounded-xs border border-editor-group-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-2 bg-code hover:bg-list-hover transition-colors cursor-pointer group"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <div className={cn("flex items-center gap-2 truncate", actionStyle.borderClass)}>
            <ActionIcon className={cn("w-4 h-4 shrink-0", actionStyle.iconClass)} />
            <span className="font-medium truncate text-description group-hover:text-foreground" onClick={handleOpenFile} title="Open file in editor">
              {file.path}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DiffStats additions={file.additions} deletions={file.deletions} />
            <span className="p-1 hover:bg-white/10 rounded transition-colors" onClick={handleOpenFile}>
              <SquareArrowOutUpRightIcon className="size-3 text-description hover:text-foreground" />
            </span>
          </div>
        </button>

        {isExpanded && (
          <div
            className="border-t border-code-block-background max-h-80 overflow-auto scroll-smooth"
            onScroll={handleScroll}
            ref={scrollContainerRef}
          >
            <div className="font-mono text-xs w-max min-w-full">
              {file.lines.map((line, index) => (
                <DiffLine key={index} line={line} lineNumber={lineNumbers?.[index]} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => 
    prev.isStreaming === next.isStreaming && 
    prev.startLineNumber === next.startLineNumber && 
    prev.file.lines === next.file.lines
);

const DiffStats = memo<{ additions: number; deletions: number }>(({ additions, deletions }) => (
  <div className="text-[10px] flex items-center gap-1 font-medium opacity-80">
    {additions > 0 && <span className="text-success">+{additions}</span>}
    {additions > 0 && deletions > 0 && <span className="opacity-30">·</span>}
    {deletions > 0 && <span className="text-error">-{deletions}</span>}
  </div>
));

const DiffLine = memo<{ line: string; lineNumber?: number }>(({ line, lineNumber }) => {
  const isAddition = line.startsWith("+");
  const isDeletion = line.startsWith("-");
  const hasSpacePrefix = line.startsWith("+ ") || line.startsWith("- ");
  const code = isAddition || isDeletion ? line.slice(hasSpacePrefix ? 2 : 1) : line;
  const prefix = isAddition ? "+" : isDeletion ? "-" : " ";

  return (
    <div className={cn(
      "flex pl-1",
      isAddition && "bg-success/10 border-l-2 border-success",
      isDeletion && "bg-destructive/10 border-l-2 border-destructive",
      !isAddition && !isDeletion && "border-l-2 border-transparent"
    )}>
      <span className={cn(
        "w-8 min-w-[32px] text-right pr-2 py-0.5 select-none opacity-40 border-r border-white/5",
        isAddition && "text-success",
        isDeletion && "text-destructive"
      )}>
        {lineNumber ?? ""}
      </span>
      <span className={cn(
        "w-4 min-w-[16px] text-center py-0.5 select-none opacity-60",
        isAddition && "text-success",
        isDeletion && "text-destructive"
      )}>
        {prefix}
      </span>
      <span className={cn(
        "flex-1 px-2 py-0.5 whitespace-pre",
        isAddition && "text-success opacity-90",
        isDeletion && "text-destructive opacity-90",
        !isAddition && !isDeletion && "text-foreground/80"
      )}>
        {code}
      </span>
    </div>
  );
});
