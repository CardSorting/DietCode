import type React from "react";
import type { ClineMessage, ClineAskQuestion } from "@shared/ExtensionMessage";

interface AskQuestionRowProps {
	message: ClineMessage;
}

export const AskQuestionRow: React.FC<AskQuestionRowProps> = ({ message }) => {
	const parsed = JSON.parse(message.text || "{}") as ClineAskQuestion;
	return (
		<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-[9px] px-2.5">
			<span className="ph-no-capture wrap-break-word whitespace-pre-wrap">
				{parsed.text}
			</span>
		</div>
	);
};

export default AskQuestionRow;
