import type React from "react";
import { Link2Icon, SearchIcon } from "lucide-react";
import { ChatRowHeader } from "../ChatRowHeader";
import { UiServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import type { ClineSayTool } from "@shared/ExtensionMessage";

interface WebToolRendererProps {
	tool: ClineSayTool;
	messageType?: "ask" | "say";
}

export const WebToolRenderer: React.FC<WebToolRendererProps> = ({ tool, messageType }) => {
	const handleOpenUrl = () => {
		if (tool.path) {
			UiServiceClient.openUrl(StringRequest.create({ value: tool.path })).catch((err) => {
				console.error("Failed to open URL:", err);
			});
		}
	};

	if (tool.tool === "webFetch") {
		return (
			<div>
				<ChatRowHeader
					icon={<Link2Icon className="size-2" />}
					isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
					title={
						messageType === "ask"
							? "DietCode wants to fetch content from this URL:"
							: "DietCode fetched content from this URL:"
					}
				/>
				<button
					className="bg-code rounded-xs overflow-hidden border border-editor-group-border py-2 px-2.5 cursor-pointer select-none w-full text-left"
					onClick={handleOpenUrl}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") handleOpenUrl();
					}}
					type="button"
				>
					<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 [direction:rtl] text-left text-link underline">
						{`${tool.path}\u200E`}
					</span>
				</button>
			</div>
		);
	}

	return (
		<div>
			<ChatRowHeader
				icon={<SearchIcon className="size-2 rotate-90" />}
				isOutsideWorkspace={tool.operationIsLocatedInWorkspace === false}
				title={
					messageType === "ask"
						? "DietCode wants to search the web for:"
						: "DietCode searched the web for:"
				}
			/>
			<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs select-text py-[9px] px-2.5">
				<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction:rtl]">
					{`${tool.path}\u200E`}
				</span>
			</div>
		</div>
	);
};

export default WebToolRenderer;
