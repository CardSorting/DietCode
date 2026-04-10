import type React from "react";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import { cleanPathPrefix } from "@/components/common/CodeAccordian";
import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { cn } from "@/lib/utils";
import type { ClineSayTool } from "@shared/ExtensionMessage";
import { ToolRowWrapper } from "../ToolRowWrapper";
import { ExpandableCodeSection } from "../ExpandableCodeSection";

interface FileReadToolRendererProps {
  tool: ClineSayTool;
  isExpanded: boolean;
  onToggleExpand: () => void;
  messageType?: "ask" | "say";
}

const isImageFile = (filePath: string): boolean => {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
  const extension = filePath.toLowerCase().split(".").pop();
  return extension ? imageExtensions.includes(`.${extension}`) : false;
};

/**
 * Renders file read and directory listing tool calls.
 * Integrated with ToolRowWrapper for consistent headers.
 */
export const FileReadToolRenderer: React.FC<FileReadToolRendererProps> = ({
  tool,
  isExpanded,
  onToggleExpand,
  messageType,
}) => {
  const isImage = isImageFile(tool.path || "");
  const cleanedPath = cleanPathPrefix(tool.path ?? "");

  const handleOpenFile = () => {
    if (!isImage && tool.content) {
      FileServiceClient.openFile(StringRequest.create({ value: tool.content })).catch((err) =>
        console.error("Failed to open file:", err),
      );
    }
  };

  const renderContent = () => {
    if (tool.tool === "searchFiles") {
      return (
        <ExpandableCodeSection
          content={tool.content ?? ""}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          path={tool.path ?? ""}
          type="search"
        />
      );
    }

    if (tool.tool === "readFile") {
      return (
        <div className="bg-code rounded-sm overflow-hidden border border-editor-group-border">
          <div
            className={cn("text-description flex items-center cursor-pointer select-none py-2 px-2.5", {
              "cursor-default select-text": isImage,
            })}
            onClick={handleOpenFile}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleOpenFile();
            }}
            role={isImage ? undefined : "button"}
            tabIndex={isImage ? undefined : 0}
          >
            {tool.path?.startsWith(".") && <span>.</span>}
            {tool.path && !tool.path.startsWith(".") && <span>/</span>}
            <span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction: rtl]">
              {`${cleanedPath}\u200E`}
              {tool.readLineStart != null && tool.readLineEnd != null ? (
                <span className="opacity-80">
                  {" "}
                  ({tool.readLineStart}-{tool.readLineEnd})
                </span>
              ) : null}
            </span>
            <div className="grow" />
            {!isImage && <SquareArrowOutUpRightIcon className="size-2" />}
          </div>
        </div>
      );
    }

    // Default for listFilesTopLevel, listFilesRecursive, listCodeDefinitionNames
    return (
      <ExpandableCodeSection
        content={tool.content ?? ""}
        isExpanded={isExpanded}
        language={tool.tool === "listCodeDefinitionNames" ? undefined : "shell-session"}
        onToggleExpand={onToggleExpand}
        path={tool.path ?? ""}
      />
    );
  };

  return (
    <ToolRowWrapper messageType={messageType} tool={tool}>
      {renderContent()}
    </ToolRowWrapper>
  );
};

export default FileReadToolRenderer;

export default FileReadToolRenderer;
