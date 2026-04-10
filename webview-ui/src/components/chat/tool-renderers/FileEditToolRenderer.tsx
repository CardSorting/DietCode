import type React from "react";
import { DiffEditRow } from "../DiffEditRow";
import type { ClineSayTool } from "@shared/ExtensionMessage";
import { ToolRowWrapper } from "../ToolRowWrapper";
import { ExpandableCodeSection } from "../ExpandableCodeSection";

interface FileEditToolRendererProps {
  tool: ClineSayTool;
  isExpanded: boolean;
  onToggleExpand: () => void;
  backgroundEditEnabled: boolean;
  isPartial?: boolean;
}

/**
 * Renders file editing tool calls (edit, create, delete).
 * Integrated with ToolRowWrapper for consistent headers and workspace warnings.
 */
export const FileEditToolRenderer: React.FC<FileEditToolRendererProps> = ({
  tool,
  isExpanded,
  onToggleExpand,
  backgroundEditEnabled,
  isPartial,
}) => {
  const renderContent = () => {
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
  };

  return (
    <ToolRowWrapper tool={tool}>
      {renderContent()}
    </ToolRowWrapper>
  );
};

export default FileEditToolRenderer;

export default FileEditToolRenderer;

export default FileEditToolRenderer;
