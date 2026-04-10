import type React from "react";
import { FoldVerticalIcon, LightbulbIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { ChatRowHeader } from "../ChatRowHeader";
import type { ClineSayTool } from "@shared/ExtensionMessage";

interface GenericToolRendererProps {
	tool: ClineSayTool;
	isExpanded: boolean;
	onToggleExpand: () => void;
}

export const GenericToolRenderer: React.FC<GenericToolRendererProps> = ({
	tool,
	isExpanded,
	onToggleExpand,
}) => {
	if (tool.tool === "summarizeTask") {
		return (
			<div>
				<ChatRowHeader icon={<FoldVerticalIcon className="size-2" />} title="DietCode is condensing the conversation:" />
				<div className="bg-code overflow-hidden border border-editor-group-border rounded-[3px]">
					<div
						aria-label={isExpanded ? "Collapse summary" : "Expand summary"}
						className="text-description py-2 px-2.5 cursor-pointer select-none"
						onClick={onToggleExpand}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								e.stopPropagation();
								onToggleExpand();
							}
						}}
					>
						{isExpanded ? (
							<div>
								<div className="flex items-center mb-2">
									<span className="font-bold mr-1">Summary:</span>
									<div className="grow" />
									<ChevronDownIcon className="my-0.5 shrink-0 size-4" />
								</div>
								<span className="ph-no-capture wrap-break-word whitespace-pre-wrap">
									{tool.content}
								</span>
							</div>
						) : (
							<div className="flex items-center">
								<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis text-left flex-1 mr-2 [direction:rtl]">
									{`${tool.content}\u200E`}
								</span>
								<ChevronRightIcon className="my-0.5 shrink-0 size-4" />
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	if (tool.tool === "useSkill") {
		return (
			<div>
				<ChatRowHeader icon={<LightbulbIcon className="size-2" />} title="DietCode loaded the skill:" />
				<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-[9px] px-2.5">
					<span className="ph-no-capture font-medium">{tool.path}</span>
				</div>
			</div>
		);
	}

	return null;
};

export default GenericToolRenderer;
