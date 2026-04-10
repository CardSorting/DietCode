import type React from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";

interface MistakeLimitRowProps {
	message: ClineMessage;
}

export const MistakeLimitRow: React.FC<MistakeLimitRowProps> = ({ message }) => {
	return (
		<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs py-[9px] px-2.5 font-bold">
			<span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction:rtl]">
				{message.text}
			</span>
		</div>
	);
};

export default MistakeLimitRow;
