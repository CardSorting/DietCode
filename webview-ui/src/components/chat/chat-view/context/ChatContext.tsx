import type React from "react";
import { createContext, useContext } from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";
import type { ChatState, MessageHandlers, ScrollBehavior } from "../types/chatTypes";

interface ChatContextValue {
	task: ClineMessage;
	groupedMessages: (ClineMessage | ClineMessage[])[];
	modifiedMessages: ClineMessage[];
	scrollBehavior: ScrollBehavior;
	chatState: ChatState;
	messageHandlers: MessageHandlers;
	apiMetrics: {
		totalTokensIn: number;
		totalTokensOut: number;
		totalCacheWrites?: number;
		totalCacheReads?: number;
		totalCost: number;
	};
	lastApiReqTotalTokens?: number;
	selectedModelInfo: {
		supportsPromptCache: boolean;
		supportsImages: boolean;
	};
	lastProgressMessageText?: string;
	showFocusChainPlaceholder?: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{
	value: ChatContextValue;
	children: React.ReactNode;
}> = ({ value, children }) => {
	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
	const context = useContext(ChatContext);
	if (!context) {
		throw new Error("useChatContext must be used within a ChatProvider");
	}
	return context;
};
