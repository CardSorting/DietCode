import type React from "react";
import { FileCode2Icon, ImageUpIcon, SquareArrowOutUpRightIcon, SearchIcon } from "lucide-react";
import { ChatRowHeader } from "../ChatRowHeader";
import CodeAccordian, { cleanPathPrefix } from "@/components/common/CodeAccordian";
import SearchResultsDisplay from "../SearchResultsDisplay";
import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { cn } from "@/lib/utils";
import type { ClineSayTool } from "@shared/ExtensionMessage";

interface FileReadToolRendererProps {
	tool: ClineSayTool;
	isExpanded: boolean;
	onToggleExpand: () => void;
	messageType?: "ask" | "say";
	isPartial?: boolean;
}

const isImageFile = (filePath: string): boolean => {
	const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
	const extension = filePath.toLowerCase().split(".").pop();
	return extension ? imageExtensions.includes(`.${extension}`) : false;
};

export const FileReadToolRenderer: React.FC<FileReadToolRendererProps> = ({
	tool,
	isExpanded,
	onToggleExpand,
	messageType,
	isPartial,
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

	if (tool.tool === "searchFiles") {
		return (
			<div>
				<ChatRowHeader
					icon={<SearchIcon className="size-2 rotate-90" />}
					isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
					title={
						<>
							DietCode wants to search this directory for{" "}
							<code className="break-all">{tool.regex}</code>:
						</>
					}
				/>
				<SearchResultsDisplay
					content={tool.content ?? ""}
					filePattern={tool.filePattern}
					isExpanded={isExpanded}
					onToggleExpand={onToggleExpand}
					path={tool.path ?? ""}
				/>
			</div>
		);
	}

	if (tool.tool === "readFile") {
		return (
			<div>
				<ChatRowHeader
					icon={isImage ? <ImageUpIcon className="size-2" /> : <FileCode2Icon className="size-2" />}
					isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
					title="DietCode wants to read this file:"
				/>
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
			</div>
		);
	}

	// Default for listFilesTopLevel, listFilesRecursive, listCodeDefinitionNames
	let title = "";
	switch (tool.tool) {
		case "listFilesTopLevel":
			title =
				messageType === "ask"
					? "DietCode wants to view the top level files in this directory:"
					: "DietCode viewed the top level files in this directory:";
			break;
		case "listFilesRecursive":
			title =
				messageType === "ask"
					? "DietCode wants to recursively view all files in this directory:"
					: "DietCode recursively viewed all files in this directory:";
			break;
		case "listCodeDefinitionNames":
			title =
				messageType === "ask"
					? "DietCode wants to view source code definition names used in this directory:"
					: "DietCode viewed source code definition names used in this directory:";
			break;
	}

	return (
		<div>
			<ChatRowHeader
				icon={<span className="codicon codicon-folder-opened" />}
				isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
				title={title}
			/>
			<CodeAccordian
				code={tool.content ?? ""}
				isExpanded={isExpanded}
				language={tool.tool === "listCodeDefinitionNames" ? undefined : "shell-session"}
				onToggleExpand={onToggleExpand}
				path={tool.path ?? ""}
			/>
		</div>
	);
};

export default FileReadToolRenderer;
