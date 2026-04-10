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
 * Dispatches tool calls to their respective specialized renderers.
 */
export const ToolCallRenderer: React.FC<ToolCallRendererProps> = ({
	tool,
	message,
	isExpanded,
	onToggleExpand,
	backgroundEditEnabled,
}) => {
	const props = {
		tool,
		isExpanded,
		onToggleExpand,
		messageType: message.type,
		isPartial: message.partial,
	};

	switch (tool.tool) {
		case "editedExistingFile":
		case "newFileCreated":
		case "fileDeleted":
			return (
				<FileEditToolRenderer {...props} backgroundEditEnabled={backgroundEditEnabled} />
			);

		case "readFile":
		case "listFilesTopLevel":
		case "listFilesRecursive":
		case "listCodeDefinitionNames":
		case "searchFiles":
			return <FileReadToolRenderer {...props} />;

		case "webFetch":
		case "webSearch":
			return <WebToolRenderer {...props} />;

		case "summarizeTask":
		case "useSkill":
			return <GenericToolRenderer {...props} />;

		default:
			return null;
	}
};

export default ToolCallRenderer;
