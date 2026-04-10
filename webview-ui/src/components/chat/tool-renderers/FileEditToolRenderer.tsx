import type React from "react";
import { PencilIcon, FilePlus2Icon, SquareMinusIcon } from "lucide-react";
import { ChatRowHeader } from "../ChatRowHeader";
import { DiffEditRow } from "../DiffEditRow";
import CodeAccordian from "../common/CodeAccordian";
import type { ClineSayTool } from "@shared/ExtensionMessage";

interface FileEditToolRendererProps {
	tool: ClineSayTool;
	isExpanded: boolean;
	onToggleExpand: () => void;
	backgroundEditEnabled: boolean;
	isPartial?: boolean;
}

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
			<CodeAccordian
				code={tool.content ?? ""}
				isExpanded={isExpanded}
				isLoading={isPartial}
				onToggleExpand={onToggleExpand}
				path={tool.path ?? ""}
			/>
		);
	};

	let icon = <PencilIcon className="size-2" />;
	let title = "DietCode wants to edit this file:";

	switch (tool.tool) {
		case "newFileCreated":
			icon = <FilePlus2Icon className="size-2" />;
			title = "DietCode wants to create a new file:";
			break;
		case "fileDeleted":
			icon = <SquareMinusIcon className="size-2" />;
			title = "DietCode wants to delete this file:";
			break;
		case "editedExistingFile":
			if (tool.content?.startsWith("%%bash") && !tool.content.endsWith("*** End Patch\nEOF")) {
				title = "DietCode is creating patches to edit this file:";
			}
			break;
	}

	return (
		<div>
			<ChatRowHeader
				icon={icon}
				isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
				title={title}
			/>
			{renderContent()}
		</div>
	);
};

export default FileEditToolRenderer;
