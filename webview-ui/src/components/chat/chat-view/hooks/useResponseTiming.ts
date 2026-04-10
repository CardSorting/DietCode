import { useMemo } from "react";
import type { ClineMessage } from "@shared/ExtensionMessage";
import { isToolGroup } from "../utils/messageUtils";

/**
 * Custom hook to handle the complex timing state of "Thinking..." indicators.
 * It determines if the AI is still processing or if visible content has started streaming.
 */
export const useResponseTiming = (
	modifiedMessages: ClineMessage[],
	lastRawMessage: ClineMessage | undefined,
	groupedMessages: (ClineMessage | ClineMessage[])[],
) => {
	const lastVisibleRow = useMemo(() => groupedMessages.at(-1), [groupedMessages]);
	const lastVisibleMessage = useMemo(() => {
		if (!lastVisibleRow) return undefined;
		return Array.isArray(lastVisibleRow) ? lastVisibleRow.at(-1) : lastVisibleRow;
	}, [lastVisibleRow]);

	const isWaitingForResponse = useMemo(() => {
		const lastMsg = modifiedMessages[modifiedMessages.length - 1];

		// Never show thinking while waiting on user input
		if (lastRawMessage?.type === "ask") return false;

		// Handle completion result edge cases
		if (lastRawMessage?.type === "say" && lastRawMessage.say === "completion_result") {
			return false;
		}

		// Handle user cancellation
		if (lastRawMessage?.type === "say" && lastRawMessage.say === "api_req_started") {
			try {
				const info = JSON.parse(lastRawMessage.text || "{}");
				if (info.cancelReason === "user_cancelled") return false;
			} catch {
				/* ignore */
			}
		}

		// Loading indicator for various states
		if (groupedMessages.length === 0) return true;
		if (!lastVisibleMessage) return true;
		if (lastVisibleRow && isToolGroup(lastVisibleRow)) return true;
		if (lastVisibleMessage.partial !== true) return true;

		if (!lastMsg) return true;
		if (lastMsg.say === "user_feedback" || lastMsg.say === "user_feedback_diff") return true;

		if (lastMsg.say === "api_req_started") {
			try {
				const info = JSON.parse(lastMsg.text || "{}");
				return info.cost == null;
			} catch {
				return true;
			}
		}

		return false;
	}, [lastRawMessage, groupedMessages.length, lastVisibleMessage, lastVisibleRow, modifiedMessages]);

	const showThinkingLoaderRow = useMemo(() => {
		const handoffToReasoningPending =
			lastRawMessage?.type === "say" &&
			lastRawMessage.say === "reasoning" &&
			lastRawMessage.partial === true &&
			lastVisibleMessage?.say !== "reasoning";

		return isWaitingForResponse || handoffToReasoningPending;
	}, [isWaitingForResponse, lastRawMessage, lastVisibleMessage?.say]);

	const displayedGroupedMessages = useMemo<(ClineMessage | ClineMessage[])[]>(() => {
		if (!showThinkingLoaderRow) return groupedMessages;

		const waitingRow: ClineMessage = {
			ts: Number.MIN_SAFE_INTEGER,
			type: "say",
			say: "reasoning",
			partial: true,
			text: "",
		};

		return [...groupedMessages, waitingRow];
	}, [groupedMessages, showThinkingLoaderRow]);

	return {
		isWaitingForResponse,
		showThinkingLoaderRow,
		displayedGroupedMessages,
	};
};
