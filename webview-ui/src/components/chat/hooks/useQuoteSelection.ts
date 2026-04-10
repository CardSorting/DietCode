import { useCallback, useState, type MouseEvent, type RefObject } from "react";

interface QuoteButtonState {
  visible: boolean;
  top: number;
  left: number;
  selectedText: string;
}

export const useQuoteSelection = (containerRef: RefObject<HTMLDivElement | null>, onSetQuote: (text: string) => void) => {
  const [quoteState, setQuoteState] = useState<QuoteButtonState>({
    visible: false,
    top: 0,
    left: 0,
    selectedText: "",
  });

  const handleQuoteClick = useCallback(() => {
    onSetQuote(quoteState.selectedText);
    window.getSelection()?.removeAllRanges();
    setQuoteState({ visible: false, top: 0, left: 0, selectedText: "" });
  }, [onSetQuote, quoteState.selectedText]);

  const handleMouseUp = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const targetElement = event.target as Element;
    const isClickOnButton = !!targetElement.closest(".quote-button-class");

    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() ?? "";

      if (selectedText && containerRef.current && selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rangeRect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        if (containerRect) {
          const tolerance = 5;
          const isSelectionWithin =
            rangeRect.top >= containerRect.top &&
            rangeRect.left >= containerRect.left &&
            rangeRect.bottom <= containerRect.bottom + tolerance &&
            rangeRect.right <= containerRect.right;

          if (isSelectionWithin) {
            setQuoteState({
              visible: true,
              top: rangeRect.top - containerRect.top - 35,
              left: Math.max(0, rangeRect.left - containerRect.left),
              selectedText,
            });
            return;
          }
        }
      }
      
      if (!isClickOnButton) {
        setQuoteState({ visible: false, top: 0, left: 0, selectedText: "" });
      }
    }, 0);
  }, [containerRef]);

  return { quoteState, handleMouseUp, handleQuoteClick };
};
