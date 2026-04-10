import { useState, useCallback, useRef } from "react";

/**
 * Manages the state of the chat input area, including text, quotes, and attachments.
 */
export const useInputSelection = () => {
    const [inputValue, setInputValue] = useState("");
    const [activeQuote, setActiveQuote] = useState<string | null>(null);
    const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const resetInput = useCallback(() => {
        setInputValue("");
        setActiveQuote(null);
        setSelectedImages([]);
        setSelectedFiles([]);
    }, []);

    const handleFocusChange = useCallback((isFocused: boolean) => {
        setIsTextAreaFocused(isFocused);
    }, []);

    return {
        inputValue,
        setInputValue,
        activeQuote,
        setActiveQuote,
        isTextAreaFocused,
        setIsTextAreaFocused,
        selectedImages,
        setSelectedImages,
        selectedFiles,
        setSelectedFiles,
        textAreaRef,
        resetInput,
        handleFocusChange,
    };
};
