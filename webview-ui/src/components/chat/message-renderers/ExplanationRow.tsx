import type React from "react";
import type { ClineMessage, ClineSayGenerateExplanation } from "@shared/ExtensionMessage";
import { RefreshCwIcon } from "lucide-react";

interface ExplanationRowProps {
	message: ClineMessage;
}

export const ExplanationRow: React.FC<ExplanationRowProps> = ({ message }) => {
	const value = JSON.parse(message.text || "{}") as ClineSayGenerateExplanation;
	return (
		<div className="flex flex-col gap-2.5 px-4 py-2 border border-editor-group-border rounded-sm bg-code mx-4 mb-2">
			<div className="flex items-center gap-2 text-description">
				<RefreshCwIcon className="size-3" />
				<span className="font-semibold text-[11px]">Explanation Needed</span>
			</div>
			<p className="text-[13px] leading-normal">{value.explanation}</p>
		</div>
	);
};

export default ExplanationRow;
