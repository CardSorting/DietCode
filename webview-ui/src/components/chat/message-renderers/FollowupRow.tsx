import type React from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";

interface FollowupRowProps {
	message: ClineMessage;
}

export const FollowupRow: React.FC<FollowupRowProps> = ({ message }) => {
	return (
		<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-[9px] px-2.5">
			<span className="ph-no-capture wrap-break-word whitespace-pre-wrap">
				{message.text}
			</span>
		</div>
	);
};

export default FollowupRow;
