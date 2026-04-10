import type React from "react";
import { useCallback, useRef, useState, type MouseEvent } from "react";
import QuoteButton from "./QuoteButton";

interface QuoteButtonState {
	visible: boolean;
	top: number;
	left: number;
	selectedText: string;
}

interface RowContentWrapperProps {
	children: React.ReactNode;
	onSetQuote: (text: string) => void;
	className?: string;
}

/**
 * RowContentWrapper provides a unified container for chat messages,
 * handling text selection and the "Quote" button logic in a single place.
 */
export const RowContentWrapper: React.FC<RowContentWrapperProps> = ({
	children,
	onSetQuote,
	className,
}) => {
	const [quoteButtonState, setQuoteButtonState] = useState<QuoteButtonState>({
		visible: false,
		top: 0,
		left: 0,
		selectedText: "",
	});
	const contentRef = useRef<HTMLDivElement>(null);

	const handleQuoteClick = useCallback(() => {
		onSetQuote(quoteButtonState.selectedText);
		window.getSelection()?.removeAllRanges();
		setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" });
	}, [onSetQuote, quoteButtonState.selectedText]);

	const handleMouseUp = useCallback((event: MouseEvent<HTMLDivElement>) => {
		const targetElement = event.target as Element;
		const isClickOnButton = !!targetElement.closest(".quote-button-class");

		setTimeout(() => {
			const selection = window.getSelection();
			const selectedText = selection?.toString().trim() ?? "";

			let shouldShowButton = false;
			let buttonTop = 0;
			let buttonLeft = 0;
			let textToQuote = "";

			if (
				selectedText &&
				contentRef.current &&
				selection &&
				selection.rangeCount > 0 &&
				!selection.isCollapsed
			) {
				const range = selection.getRangeAt(0);
				const rangeRect = range.getBoundingClientRect();
				const containerRect = contentRef.current.getBoundingClientRect();

				if (containerRect) {
					const tolerance = 5;
					const isSelectionWithin =
						rangeRect.top >= containerRect.top &&
						rangeRect.left >= containerRect.left &&
						rangeRect.bottom <= containerRect.bottom + tolerance &&
						rangeRect.right <= containerRect.right;

					if (isSelectionWithin) {
						shouldShowButton = true;
						const buttonHeight = 30;
						buttonTop = rangeRect.top - containerRect.top - buttonHeight - 5;
						buttonLeft = Math.max(0, rangeRect.left - containerRect.left);
						textToQuote = selectedText;
					}
				}
			}

			if (shouldShowButton) {
				setQuoteButtonState({
					visible: true,
					top: buttonTop,
					left: buttonLeft,
					selectedText: textToQuote,
				});
			} else if (!isClickOnButton) {
				setQuoteButtonState({ visible: false, top: 0, left: 0, selectedText: "" });
			}
		}, 0);
	}, []);

	return (
		<div
			className={className}
			onMouseUp={handleMouseUp}
			ref={contentRef}
			style={{ position: "relative" }}
		>
			{children}
			{quoteButtonState.visible && (
				<QuoteButton
					left={quoteButtonState.left}
					onClick={handleQuoteClick}
					top={quoteButtonState.top}
				/>
			)}
		</div>
	);
};

export default RowContentWrapper;
