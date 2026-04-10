import { useEffect } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { convertHtmlToMarkdown } from "../utils/markdownUtils";

/**
 * Custom hook to handle global copy events, converting HTML to Markdown
 * where appropriate (e.g., in chat messages but not in code blocks).
 */
export const useCopyPasteHandler = () => {
	useEffect(() => {
		const handleCopy = async (e: ClipboardEvent) => {
			const targetElement = e.target as HTMLElement | null;
			// If the copy event originated from an input or textarea,
			// let the default browser behavior handle it.
			if (
				targetElement &&
				(targetElement.tagName === "INPUT" ||
					targetElement.tagName === "TEXTAREA" ||
					targetElement.isContentEditable)
			) {
				return;
			}

			if (window.getSelection) {
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					const commonAncestor = range.commonAncestorContainer;
					let textToCopy: string | null = null;

					// Check if the selection is inside an element where plain text copy is preferred
					let currentElement =
						commonAncestor.nodeType === Node.ELEMENT_NODE
							? (commonAncestor as HTMLElement)
							: commonAncestor.parentElement;
					let preferPlainTextCopy = false;
					while (currentElement) {
						if (currentElement.tagName === "PRE" && currentElement.querySelector("code")) {
							preferPlainTextCopy = true;
							break;
						}
						const computedStyle = window.getComputedStyle(currentElement);
						if (
							computedStyle.whiteSpace === "pre" ||
							computedStyle.whiteSpace === "pre-wrap" ||
							computedStyle.whiteSpace === "pre-line"
						) {
							preferPlainTextCopy = true;
							break;
						}

						if (
							currentElement.classList.contains("chat-row-assistant-message-container") ||
							currentElement.classList.contains("chat-row-user-message-container") ||
							currentElement.tagName === "BODY"
						) {
							break;
						}
						currentElement = currentElement.parentElement;
					}

					if (preferPlainTextCopy) {
						textToCopy = selection.toString();
					} else {
						const clonedSelection = range.cloneContents();
						const div = document.createElement("div");
						div.appendChild(clonedSelection);
						const selectedHtml = div.innerHTML;
						textToCopy = await convertHtmlToMarkdown(selectedHtml);
					}

					if (textToCopy !== null) {
						try {
							FileServiceClient.copyToClipboard(
								StringRequest.create({ value: textToCopy }),
							).catch((err: any) => {
								console.error("Error copying to clipboard:", err);
							});
							e.preventDefault();
						} catch (error) {
							console.error("Error copying to clipboard:", error);
						}
					}
				}
			}
		};
		document.addEventListener("copy", handleCopy);

		return () => {
			document.removeEventListener("copy", handleCopy);
		};
	}, []);
};
