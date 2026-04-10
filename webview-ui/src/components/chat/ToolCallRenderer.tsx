import type React from "react";
import type { ClineSayTool, ClineMessage } from "@shared/ExtensionMessage";
import { DiffEditRow } from "./DiffEditRow";
import { ToolRowWrapper } from "./ToolRowWrapper";
import { ExpandableCodeSection } from "./ExpandableCodeSection";
import MarkdownBlock from "./common/MarkdownBlock";
import { cn } from "@/lib/utils";

interface ToolCallRendererProps {
  tool: ClineSayTool;
  message: ClineMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
  backgroundEditEnabled: boolean;
}

export const ToolCallRenderer: React.FC<ToolCallRendererProps> = ({
  tool, message, isExpanded, onToggleExpand, backgroundEditEnabled
}) => {
  const isPartial = message.partial;

  const renderToolBody = () => {
    switch (tool.tool) {
      case "editedExistingFile":
      case "newFileCreated":
      case "fileDeleted":
        if (backgroundEditEnabled && tool.path && tool.content) {
          return (
            <DiffEditRow
              isLoading={isPartial}
              patch={tool.content}
              path={tool.path}
              startLineNumbers={tool.startLineNumbers}
            />
          );
        }
        return (
          <ExpandableCodeSection
            content={tool.content ?? ""}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            path={tool.path ?? ""}
          />
        );

      case "readFile":
      case "listFilesTopLevel":
      case "listFilesRecursive":
      case "listCodeDefinitionNames":
      case "searchFiles":
        return (
          <ExpandableCodeSection
            content={tool.content ?? ""}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            path={tool.path ?? ""}
          />
        );

      case "webFetch":
      case "webSearch":
        return (
          <ExpandableCodeSection
            content={tool.content ?? ""}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            language="markdown"
          />
        );

      case "summarizeTask":
      case "useSkill":
        return (
          <div className="p-3 bg-code border border-editor-group-border rounded-xs text-[13px] opacity-90 leading-relaxed">
            <MarkdownBlock markdown={tool.content || ""} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ToolRowWrapper tool={tool}>
      {renderToolBody()}
    </ToolRowWrapper>
  );
};

export default ToolCallRenderer;
