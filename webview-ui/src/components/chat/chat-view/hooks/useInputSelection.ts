import { useState, useCallback, useRef } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import { BooleanRequest } from "@shared/nice-grpc/cline/common.ts";
import { CHAT_CONSTANTS } from "../constants";

const MAX_IMAGES_AND_FILES_PER_MESSAGE = CHAT_CONSTANTS.MAX_IMAGES_AND_FILES_PER_MESSAGE;

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

    const selectFilesAndImages = useCallback(async (supportsImages: boolean) => {
        try {
            const response = await FileServiceClient.selectFiles(
                BooleanRequest.create({
                    value: supportsImages,
                }),
            );
            if (
                response?.values1 &&
                response.values2 &&
                (response.values1.length > 0 || response.values2.length > 0)
            ) {
                const currentTotal = selectedImages.length + selectedFiles.length;
                const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - currentTotal;

                if (availableSlots > 0) {
                    // Prioritize images first
                    const imagesToAdd = Math.min(response.values1.length, availableSlots);
                    if (imagesToAdd > 0) {
                        setSelectedImages((prevImages) => [
                            ...prevImages,
                            ...response.values1.slice(0, imagesToAdd),
                        ]);
                    }

                    // Use remaining slots for files
                    const remainingSlots = availableSlots - imagesToAdd;
                    if (remainingSlots > 0) {
                        setSelectedFiles((prevFiles) => [
                            ...prevFiles,
                            ...response.values2.slice(0, remainingSlots),
                        ]);
                    }
                }
            }
        } catch (error) {
            console.error("Error selecting images & files:", error);
        }
    }, [selectedImages.length, selectedFiles.length]);

    const shouldDisableFilesAndImages =
        selectedImages.length + selectedFiles.length >= MAX_IMAGES_AND_FILES_PER_MESSAGE;

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
        selectFilesAndImages,
        shouldDisableFilesAndImages,
    };
};
