import type React from "react";
import type { ClineSayTool, ClineMessage } from "@shared/ExtensionMessage";
import FileEditToolRenderer from "./tool-renderers/FileEditToolRenderer";
import FileReadToolRenderer from "./tool-renderers/FileReadToolRenderer";
import WebToolRenderer from "./tool-renderers/WebToolRenderer";
import GenericToolRenderer from "./tool-renderers/GenericToolRenderer";

interface ToolCallRendererProps {
  tool: ClineSayTool;
  message: ClineMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
  backgroundEditEnabled: boolean;
}

/**
 * Dispatches tool calls to specialized renderers.
 * Now a thin coordinator using standardized tool logic.
 */
export const ToolCallRenderer: React.FC<ToolCallRendererProps> = ({
  tool,
  message,
  isExpanded,
  onToggleExpand,
  backgroundEditEnabled,
}) => {
  const commonProps = {
    tool,
    isExpanded,
    onToggleExpand,
    messageType: message.type,
  };

  switch (tool.tool) {
    case "editedExistingFile":
    case "newFileCreated":
    case "fileDeleted":
      return (
        <FileEditToolRenderer
          {...commonProps}
          backgroundEditEnabled={backgroundEditEnabled}
          isPartial={message.partial}
        />
      );

    case "readFile":
    case "listFilesTopLevel":
    case "listFilesRecursive":
    case "listCodeDefinitionNames":
    case "searchFiles":
      return <FileReadToolRenderer {...commonProps} />;

    case "webFetch":
    case "webSearch":
      return <WebToolRenderer {...commonProps} />;

    case "summarizeTask":
    case "useSkill":
      return <GenericToolRenderer {...commonProps} />;

    default:
      return null;
  }
};

export default ToolCallRenderer;

export default ToolCallRenderer;
