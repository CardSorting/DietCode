import { useState, useCallback, useEffect } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import { RelativePathsRequest } from "@shared/nice-grpc/cline/file.ts";
import { CHAT_CONSTANTS } from "../chat-view/constants";

const { MAX_IMAGES_AND_FILES_PER_MESSAGE } = CHAT_CONSTANTS;

interface UseChatDropHandlerProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  cursorPosition: number;
  setCursorPosition: (pos: number) => void;
  setSelectedImages: (update: (prev: string[]) => string[]) => void;
  setSelectedFiles: (update: (prev: string[]) => string[]) => void;
  selectedImages: string[];
  selectedFiles: string[];
  shouldDisableFilesAndImages: boolean;
  setPendingInsertions: (paths: string[]) => void;
}

export function useChatDropHandler({
  inputValue,
  setInputValue,
  cursorPosition,
  setCursorPosition,
  setSelectedImages,
  setSelectedFiles,
  selectedImages,
  selectedFiles,
  shouldDisableFilesAndImages,
  setPendingInsertions,
}: UseChatDropHandlerProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showUnsupportedFileError, setShowUnsupportedFileError] = useState(false);
  const [showDimensionError, setShowDimensionError] = useState(false);

  const showDimensionErrorMessage = useCallback(() => {
    setShowDimensionError(true);
    setTimeout(() => setShowDimensionError(false), 3000);
  }, []);

  const showUnsupportedFileErrorMessage = useCallback(() => {
    setShowUnsupportedFileError(true);
    setTimeout(() => setShowUnsupportedFileError(false), 3000);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
    if (e.dataTransfer.types.includes("Files")) {
      const items = Array.from(e.dataTransfer.items);
      if (items.some(item => item.kind === "file" && item.type.split("/")[0] !== "image")) {
        showUnsupportedFileErrorMessage();
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setShowUnsupportedFileError(false);

    let uris: string[] = [];
    const resourceUrls = e.dataTransfer.getData("resourceurls");
    const uriList = e.dataTransfer.getData("application/vnd.code.uri-list");

    if (resourceUrls) {
      try { uris = JSON.parse(resourceUrls).map((u: string) => decodeURIComponent(u)); } catch {}
    } else if (uriList) {
      uris = uriList.split("\n").map(u => u.trim());
    }

    const validUris = uris.filter(u => u && (u.startsWith("vscode-file:") || u.startsWith("file:") || u.startsWith("vscode-remote:")));

    if (validUris.length > 0) {
      FileServiceClient.getRelativePaths(RelativePathsRequest.create({ uris: validUris }))
        .then(r => r.paths.length > 0 && setPendingInsertions(r.paths))
        .catch(console.error);
      return;
    }

    const text = e.dataTransfer.getData("text");
    if (text) {
      const newValue = inputValue.slice(0, cursorPosition) + text + inputValue.slice(cursorPosition);
      setInputValue(newValue);
      setCursorPosition(cursorPosition + text.length);
      return;
    }

    const imageFiles = Array.from(e.dataTransfer.files).filter(f => ["png", "jpeg", "webp"].includes(f.type.split("/")[1]));
    if (shouldDisableFilesAndImages || imageFiles.length === 0) return;

    const dataUrls = await Promise.all(imageFiles.map(file => new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const img = new Image();
        img.onload = () => (img.naturalWidth > 7500 || img.naturalHeight > 7500) ? (showDimensionErrorMessage(), resolve(null)) : resolve(result);
        img.onerror = () => resolve(null);
        img.src = result;
      };
      reader.readAsDataURL(file);
    })));

    const validUrls = dataUrls.filter((u): u is string => u !== null);
    if (validUrls.length > 0) {
      const slots = MAX_IMAGES_AND_FILES_PER_MESSAGE - (selectedImages.length + selectedFiles.length);
      if (slots > 0) setSelectedImages(prev => [...prev, ...validUrls.slice(0, slots)]);
    }
  };

  useEffect(() => {
    const end = () => setIsDraggingOver(false);
    document.addEventListener("dragend", end);
    return () => document.removeEventListener("dragend", end);
  }, []);

  return { isDraggingOver, showUnsupportedFileError, showDimensionError, handleDragEnter, handleDragLeave, handleDrop };
}
