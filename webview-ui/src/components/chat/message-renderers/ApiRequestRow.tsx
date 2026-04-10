import type React from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";
import { RequestStartRow } from "../RequestStartRow";

interface ApiRequestRowProps {
	message: ClineMessage;
	isLast: boolean;
	lastModifiedMessage?: ClineMessage;
	isRequestInProgress?: boolean;
	reasoningContent?: string;
	responseStarted?: boolean;
}

export const ApiRequestRow: React.FC<ApiRequestRowProps> = ({
	message,
	isLast,
	lastModifiedMessage,
	isRequestInProgress,
	reasoningContent,
	responseStarted,
}) => {
	return (
		<RequestStartRow
			isRequestInProgress={isRequestInProgress}
			message={message}
			reasoningContent={reasoningContent}
			responseStarted={responseStarted}
		/>
	);
};

export default ApiRequestRow;
