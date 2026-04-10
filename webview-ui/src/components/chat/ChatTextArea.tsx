import { CHAT_CONSTANTS } from "@/components/chat/chat-view/constants";
import Thumbnails from "@/components/common/Thumbnails";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { usePlatform } from "@/context/PlatformContext";
import { cn } from "@/lib/utils";
import { FileServiceClient, StateServiceClient } from "@/services/grpc-client";
import { useMetaKeyDetection, useShortcut } from "@/utils/hooks";
import { mentionRegexGlobal } from "@shared/context-mentions.ts";
import {
  FileSearchType,
  RelativePathsRequest,
} from "@shared/nice-grpc/cline/file.ts";
import { PlanActMode, TogglePlanActModeRequest } from "@shared/nice-grpc/cline/state.ts";
import type React from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DynamicTextArea from "react-textarea-autosize";
import styled from "styled-components";
import { ChatInputActions } from "./ChatInput/ChatInputActions";
import { ChatInputModeSwitch } from "./ChatInput/ChatInputModeSwitch";
import { ChatInputModelInfo } from "./ChatInput/ChatInputModelInfo";
import { useMentionInput } from "./ChatInput/hooks/useMentionInput";
import SlashCommandMenu from "@/components/chat/SlashCommandMenu";
import ContextMenu from "@/components/chat/ContextMenu";
import { validateSlashCommand, slashCommandRegexGlobal } from "@/utils/slash-commands";
import ClineRulesToggleModal from "../cline-rules/ClineRulesToggleModal";
import ServersToggleModal from "./ServersToggleModal";

const { MAX_IMAGES_AND_FILES_PER_MESSAGE } = CHAT_CONSTANTS;

const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 7500 || img.naturalHeight > 7500) {
        reject(new Error("Image dimensions exceed maximum allowed size of 7500px."));
      } else {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = (err) => {
      console.error("Failed to load image for dimension check:", err);
      reject(new Error("Failed to load image to check dimensions."));
    };
    img.src = dataUrl;
  });
};

// Set to "File" option by default
const DEFAULT_CONTEXT_MENU_OPTION = getContextMenuOptionIndex(ContextMenuOptionType.File);

interface ChatTextAreaProps {
  inputValue: string;
  activeQuote: string | null;
  setInputValue: (value: string) => void;
  sendingDisabled: boolean;
  placeholderText: string;
  selectedFiles: string[];
  selectedImages: string[];
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  onSend: () => void;
  onSelectFilesAndImages: () => void;
  shouldDisableFilesAndImages: boolean;
  onHeightChange?: (height: number) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

interface GitCommit {
  type: ContextMenuOptionType.Git;
  value: string;
  label: string;
  description: string;
}

// Removed redundant styled components (moved to sub-components)

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
  (
    {
      inputValue,
      setInputValue,
      sendingDisabled,
      placeholderText,
      selectedFiles,
      selectedImages,
      setSelectedImages,
      setSelectedFiles,
      onSend,
      onSelectFilesAndImages,
      shouldDisableFilesAndImages,
      onHeightChange,
      onFocusChange,
    },
    ref,
  ) => {
    const {
      mode,
      apiConfiguration,
      openRouterModels,
      platform,
      localWorkflowToggles,
      globalWorkflowToggles,
      remoteWorkflowToggles,
      remoteConfigSettings,
      navigateToSettingsModelPicker,
      mcpServers,
    } = useExtensionState();
    const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [thumbnailsHeight, setThumbnailsHeight] = useState(0);
    const [textAreaBaseHeight, setTextAreaBaseHeight] = useState<number | undefined>(undefined);
    const [showUnsupportedFileError, setShowUnsupportedFileError] = useState(false);
    const unsupportedFileTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showDimensionError, setShowDimensionError] = useState(false);
    const dimensionErrorTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [, metaKeyChar] = useMetaKeyDetection(platform);

    const {
      showSlashCommandsMenu,
      setShowSlashCommandsMenu,
      selectedSlashCommandsIndex,
      setSelectedSlashCommandsIndex,
      slashCommandsQuery,
      slashCommandsMenuContainerRef,
      showContextMenu,
      setShowContextMenu,
      cursorPosition,
      setCursorPosition,
      searchQuery,
      setSearchQuery,
      selectedMenuIndex,
      setSelectedMenuIndex,
      selectedType,
      setSelectedType,
      textAreaRef,
      contextMenuContainerRef,
      isMouseDownOnMenu,
      setIsMouseDownOnMenu,
      searchLoading,
      fileSearchResults,
      queryItems,
      handleInputChange,
      handleKeyDown,
      handleMentionSelect,
      handleSlashCommandsSelect,
      setPendingInsertions,
      setIntendedCursorPosition,
    } = useMentionInput({
      inputValue,
      setInputValue,
      onSend,
      sendingDisabled,
      localWorkflowToggles,
      globalWorkflowToggles,
      remoteWorkflowToggles,
      remoteConfigSettings,
      mcpServers,
      selectedImages,
      setSelectedImages,
      selectedFiles,
      setSelectedFiles,
      onFocusChange,
    });


    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          contextMenuContainerRef.current &&
          !contextMenuContainerRef.current.contains(event.target as Node)
        ) {
          setShowContextMenu(false);
        }
      };

      if (showContextMenu) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showContextMenu, setShowContextMenu]);

    useEffect(() => {
      const handleClickOutsideSlashMenu = (event: MouseEvent) => {
        if (
          slashCommandsMenuContainerRef.current &&
          !slashCommandsMenuContainerRef.current.contains(event.target as Node)
        ) {
          setShowSlashCommandsMenu(false);
        }
      };

      if (showSlashCommandsMenu) {
        document.addEventListener("mousedown", handleClickOutsideSlashMenu);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutsideSlashMenu);
      };
    }, [showSlashCommandsMenu]);


    const handleBlur = useCallback(() => {
      // Only hide the context menu if the user didn't click on it
      if (!isMouseDownOnMenu) {
        setShowContextMenu(false);
        setShowSlashCommandsMenu(false);
      }
      setIsTextAreaFocused(false);
      onFocusChange?.(false);
    }, [isMouseDownOnMenu, onFocusChange, setShowContextMenu, setShowSlashCommandsMenu]);

    const showDimensionErrorMessage = useCallback(() => {
      setShowDimensionError(true);
      if (dimensionErrorTimerRef.current) {
        clearTimeout(dimensionErrorTimerRef.current);
      }
      dimensionErrorTimerRef.current = setTimeout(() => {
        setShowDimensionError(false);
        dimensionErrorTimerRef.current = null;
      }, 3000);
    }, []);

    const handlePaste = useCallback(
      async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;

        const pastedText = e.clipboardData.getData("text");
        // Check if the pasted content is a URL, add space after so user can easily delete if they don't want it
        const urlRegex = /^\S+:\/\/\S+$/;
        if (urlRegex.test(pastedText.trim())) {
          e.preventDefault();
          const trimmedUrl = pastedText.trim();
          const newValue = `${
            inputValue.slice(0, cursorPosition) + trimmedUrl
          } ${inputValue.slice(cursorPosition)}`;
          setInputValue(newValue);
          const newCursorPosition = cursorPosition + trimmedUrl.length + 1;
          setCursorPosition(newCursorPosition);
          setIntendedCursorPosition(newCursorPosition);
          setShowContextMenu(false);

          // Scroll to new cursor position
          // https://stackoverflow.com/questions/29899364/how-do-you-scroll-to-the-position-of-the-cursor-in-a-textarea/40951875#40951875
          setTimeout(() => {
            if (textAreaRef.current) {
              textAreaRef.current.blur();
              textAreaRef.current.focus();
            }
          }, 0);
          // NOTE: callbacks dont utilize return function to cleanup, but it's fine since this timeout immediately executes and will be cleaned up by the browser (no chance component unmounts before it executes)

          return;
        }

        const acceptedTypes = ["png", "jpeg", "webp"]; // supported by anthropic and openrouter (jpg is just a file extension but the image will be recognized as jpeg)
        const imageItems = Array.from(items).filter((item) => {
          const [type, subtype] = item.type.split("/");
          return type === "image" && acceptedTypes.includes(subtype);
        });
        if (!shouldDisableFilesAndImages && imageItems.length > 0) {
          e.preventDefault();
          const imagePromises = imageItems.map((item) => {
            return new Promise<string | null>((resolve) => {
              const blob = item.getAsFile();
              if (!blob) {
                resolve(null);
                return;
              }
              const reader = new FileReader();
              reader.onloadend = async () => {
                if (reader.error) {
                  console.error("Error reading file:", reader.error);
                  resolve(null);
                } else {
                  const result = reader.result;
                  if (typeof result === "string") {
                    try {
                      await getImageDimensions(result);
                      resolve(result);
                    } catch (error) {
                      console.warn((error as Error).message);
                      showDimensionErrorMessage();
                      resolve(null);
                    }
                  } else {
                    resolve(null);
                  }
                }
              };
              reader.readAsDataURL(blob);
            });
          });
          const imageDataArray = await Promise.all(imagePromises);
          const dataUrls = imageDataArray.filter((dataUrl): dataUrl is string => dataUrl !== null);
          //.map((dataUrl) => dataUrl.split(",")[1]) // strip the mime type prefix, sharp doesn't need it
          if (dataUrls.length > 0) {
            const filesAndImagesLength = selectedImages.length + selectedFiles.length;
            const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - filesAndImagesLength;

            if (availableSlots > 0) {
              const imagesToAdd = Math.min(dataUrls.length, availableSlots);
              setSelectedImages((prevImages) => [...prevImages, ...dataUrls.slice(0, imagesToAdd)]);
            }
          } else {
            console.warn("No valid images were processed");
          }
        }
      },
      [
        shouldDisableFilesAndImages,
        setSelectedImages,
        selectedImages,
        selectedFiles,
        cursorPosition,
        setInputValue,
        inputValue,
        showDimensionErrorMessage,
      ],
    );

    const handleThumbnailsHeightChange = useCallback((height: number) => {
      setThumbnailsHeight(height);
    }, []);

    useEffect(() => {
      if (selectedImages.length === 0 && selectedFiles.length === 0) {
        setThumbnailsHeight(0);
      }
    }, [selectedImages, selectedFiles]);

    const handleMenuMouseDown = useCallback(() => {
      setIsMouseDownOnMenu(true);
    }, []);

    const updateHighlights = useCallback(() => {
      if (!textAreaRef.current || !highlightLayerRef.current) {
        return;
      }

      let processedText = textAreaRef.current.value;

      processedText = processedText
        .replace(/\n$/, "\n\n")
        .replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c)
        // highlight @mentions
        .replace(mentionRegexGlobal, '<mark class="mention-context-textarea-highlight">$&</mark>');

      // Highlight only the FIRST valid /slash-command in the text
      // Only one slash command is processed per message, so we only highlight the first one
      slashCommandRegexGlobal.lastIndex = 0;
      let hasHighlightedSlashCommand = false;
      processedText = processedText.replace(slashCommandRegexGlobal, (match, prefix, command) => {
        // Only highlight the first valid slash command
        if (hasHighlightedSlashCommand) {
          return match;
        }

        // Extract just the command name (without the slash)
        const commandName = command.substring(1);
        const isValidCommand = validateSlashCommand(
          commandName,
          localWorkflowToggles,
          globalWorkflowToggles,
          remoteWorkflowToggles,
          remoteConfigSettings?.remoteGlobalWorkflows,
        );

        if (isValidCommand) {
          hasHighlightedSlashCommand = true;
          // Keep the prefix (whitespace or empty) and wrap the command in highlight
          return `${prefix}<mark class="mention-context-textarea-highlight">${command}</mark>`;
        }
        return match;
      });

      highlightLayerRef.current.innerHTML = processedText;
      highlightLayerRef.current.scrollTop = textAreaRef.current.scrollTop;
      highlightLayerRef.current.scrollLeft = textAreaRef.current.scrollLeft;
    }, [localWorkflowToggles, globalWorkflowToggles, remoteWorkflowToggles, remoteConfigSettings]);

    useLayoutEffect(() => {
      updateHighlights();
    }, [inputValue, updateHighlights]);

    const handleContextButtonClick = useCallback(() => {
      textAreaRef.current?.focus();
      const append = inputValue.length > 0 && !inputValue.endsWith(" ") ? " @" : "@";
      const newVal = inputValue + append;
      const event = {
        target: { value: newVal, selectionStart: newVal.length },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(event);
      updateHighlights();
    }, [inputValue, handleInputChange, updateHighlights]);

    const handleModelButtonClick = useCallback(() => {
      navigateToSettingsModelPicker({ targetSection: "api-config" });
    }, [navigateToSettingsModelPicker]);

    const togglePlanActKeys = usePlatform()
      .togglePlanActKeys.replace("Meta", metaKeyChar)
      .replace(/.$/, (match) => match.toUpperCase());

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);

      // Check if files are being dragged
      if (e.dataTransfer.types.includes("Files")) {
        // Check if any of the files are not images
        const items = Array.from(e.dataTransfer.items);
        const hasNonImageFile = items.some((item) => {
          if (item.kind === "file") {
            const type = item.type.split("/")[0];
            return type !== "image";
          }
          return false;
        });

        if (hasNonImageFile) {
          showUnsupportedFileErrorMessage();
        }
      }
    };
    /**
     * Handles the drag over event to allow dropping.
     * Prevents the default behavior to enable drop.
     *
     * @param {React.DragEvent} e - The drag event.
     */
    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      // Ensure state remains true if dragging continues over the element
      if (!isDraggingOver) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      // Check if the related target is still within the drop zone; prevents flickering
      const dropZone = e.currentTarget as HTMLElement;
      if (!dropZone.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
        // Don't clear the error message here, let it time out naturally
      }
    };

    // Effect to detect when drag operation ends outside the component
    useEffect(() => {
      const handleGlobalDragEnd = () => {
        // This will be triggered when the drag operation ends anywhere
        setIsDraggingOver(false);
        // Don't clear error message, let it time out naturally
      };

      document.addEventListener("dragend", handleGlobalDragEnd);

      return () => {
        document.removeEventListener("dragend", handleGlobalDragEnd);
      };
    }, []);

    /**
     * Handles the drop event for files and text.
     * Processes dropped images and text, updating the state accordingly.
     *
     * @param {React.DragEvent} e - The drop event.
     */
    const onDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false); // Reset state on drop

      // Clear any error message when something is actually dropped
      setShowUnsupportedFileError(false);
      if (unsupportedFileTimerRef.current) {
        clearTimeout(unsupportedFileTimerRef.current);
        unsupportedFileTimerRef.current = null;
      }

      // --- 1. VSCode Explorer Drop Handling ---
      let uris: string[] = [];
      const resourceUrlsData = e.dataTransfer.getData("resourceurls");
      const vscodeUriListData = e.dataTransfer.getData("application/vnd.code.uri-list");

      // 1a. Try 'resourceurls' first (used for multi-select)
      if (resourceUrlsData) {
        try {
          uris = JSON.parse(resourceUrlsData);
          uris = uris.map((uri) => decodeURIComponent(uri));
        } catch (error) {
          console.error("Failed to parse resourceurls JSON:", error);
          uris = []; // Reset if parsing failed
        }
      }

      // 1b. Fallback to 'application/vnd.code.uri-list' (newline separated)
      if (uris.length === 0 && vscodeUriListData) {
        uris = vscodeUriListData.split("\n").map((uri) => uri.trim());
      }

      // 1c. Filter for valid schemes (file or vscode-file) and non-empty strings
      const validUris = uris.filter(
        (uri) =>
          uri &&
          (uri.startsWith("vscode-file:") ||
            uri.startsWith("file:") ||
            uri.startsWith("vscode-remote:")),
      );

      if (validUris.length > 0) {
        setPendingInsertions([]);
        let initialCursorPos = inputValue.length;
        if (textAreaRef.current) {
          initialCursorPos = textAreaRef.current.selectionStart;
        }
        setIntendedCursorPosition(initialCursorPos);

        FileServiceClient.getRelativePaths(RelativePathsRequest.create({ uris: validUris }))
          .then((response) => {
            if (response.paths.length > 0) {
              setPendingInsertions((prev) => [...prev, ...response.paths]);
            }
          })
          .catch((error) => {
            console.error("Error getting relative paths:", error);
          });
        return;
      }

      const text = e.dataTransfer.getData("text");
      if (text) {
        handleTextDrop(text);
        return;
      }

      // --- 3. Image Drop Handling ---
      // Only proceed if it wasn't a VSCode resource or plain text drop
      const files = Array.from(e.dataTransfer.files);
      const acceptedTypes = ["png", "jpeg", "webp"];
      const imageFiles = files.filter((file) => {
        const [type, subtype] = file.type.split("/");
        return type === "image" && acceptedTypes.includes(subtype);
      });

      if (shouldDisableFilesAndImages || imageFiles.length === 0) {
        return;
      }

      const imageDataArray = await readImageFiles(imageFiles);
      const dataUrls = imageDataArray.filter((dataUrl): dataUrl is string => dataUrl !== null);

      if (dataUrls.length > 0) {
        const filesAndImagesLength = selectedImages.length + selectedFiles.length;
        const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - filesAndImagesLength;

        if (availableSlots > 0) {
          const imagesToAdd = Math.min(dataUrls.length, availableSlots);
          setSelectedImages((prevImages) => [...prevImages, ...dataUrls.slice(0, imagesToAdd)]);
        }
      } else {
        console.warn("No valid images were processed");
      }
    };

    /**
     * Handles the drop event for text.
     * Inserts the dropped text at the current cursor position.
     *
     * @param {string} text - The dropped text.
     */
    const handleTextDrop = (text: string) => {
      const newValue =
        inputValue.slice(0, cursorPosition) + text + inputValue.slice(cursorPosition);
      setInputValue(newValue);
      const newCursorPosition = cursorPosition + text.length;
      setCursorPosition(newCursorPosition);
      setIntendedCursorPosition(newCursorPosition);
    };

    /**
     * Reads image files and returns their data URLs.
     * Uses FileReader to read the files as data URLs.
     *
     * @param {File[]} imageFiles - The image files to read.
     * @returns {Promise<(string | null)[]>} - A promise that resolves to an array of data URLs or null values.
     */
    const readImageFiles = (imageFiles: File[]): Promise<(string | null)[]> => {
      return Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = async () => {
                // Make async
                if (reader.error) {
                  console.error("Error reading file:", reader.error);
                  resolve(null);
                } else {
                  const result = reader.result;
                  if (typeof result === "string") {
                    try {
                      await getImageDimensions(result); // Check dimensions
                      resolve(result);
                    } catch (error) {
                      console.warn((error as Error).message);
                      showDimensionErrorMessage(); // Show error to user
                      resolve(null); // Don't add this image
                    }
                  } else {
                    resolve(null);
                  }
                }
              };
              reader.readAsDataURL(file);
            }),
        ),
      );
    };
    // Replace Meta with the platform specific key and uppercase the command letter.
    const togglePlanActKeys = usePlatform()
      .togglePlanActKeys.replace("Meta", metaKeyChar)
      .replace(/.$/, (match) => match.toUpperCase());

    return (
      <div>
        <div
          className="relative flex transition-colors ease-in-out duration-100 px-3.5 py-2.5"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {showDimensionError && (
            <div className="absolute inset-2.5 bg-[rgba(var(--vscode-errorForeground-rgb),0.1)] border-2 border-error rounded-xs flex items-center justify-center z-10 pointer-events-none">
              <span className="text-error font-bold text-xs text-center">
                Image dimensions exceed 7500px
              </span>
            </div>
          )}
          {showUnsupportedFileError && (
            <div className="absolute inset-2.5 bg-[rgba(var(--vscode-errorForeground-rgb),0.1)] border-2 border-error rounded-xs flex items-center justify-center z-10 pointer-events-none">
              <span className="text-error font-bold text-xs">
                Files other than images are currently disabled
              </span>
            </div>
          )}
          {showSlashCommandsMenu && (
            <div ref={slashCommandsMenuContainerRef}>
              <SlashCommandMenu
                globalWorkflowToggles={globalWorkflowToggles}
                localWorkflowToggles={localWorkflowToggles}
                mcpServers={mcpServers}
                onMouseDown={handleMenuMouseDown}
                onSelect={handleSlashCommandsSelect}
                query={slashCommandsQuery}
                remoteWorkflows={remoteConfigSettings?.remoteGlobalWorkflows}
                remoteWorkflowToggles={remoteWorkflowToggles}
                selectedIndex={selectedSlashCommandsIndex}
                setSelectedIndex={setSelectedSlashCommandsIndex}
              />
            </div>
          )}

          {showContextMenu && (
            <div ref={contextMenuContainerRef}>
              <ContextMenu
                dynamicSearchResults={fileSearchResults}
                isLoading={searchLoading}
                onMouseDown={handleMenuMouseDown}
                onSelect={handleMentionSelect}
                queryItems={queryItems}
                searchQuery={searchQuery}
                selectedIndex={selectedMenuIndex}
                selectedType={selectedType}
                setSelectedIndex={setSelectedMenuIndex}
              />
            </div>
          )}
          <div
            className={cn(
              "absolute bottom-2.5 top-2.5 whitespace-pre-wrap wrap-break-word rounded-xs overflow-hidden bg-input-background",
              isTextAreaFocused
                ? "left-3.5 right-3.5"
                : "left-3.5 right-3.5 border border-input-border",
            )}
            ref={highlightLayerRef}
            style={{
              position: "absolute",
              pointerEvents: "none",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              color: "transparent",
              overflow: "hidden",
              fontFamily: "var(--vscode-font-family)",
              fontSize: "var(--vscode-editor-font-size)",
              lineHeight: "var(--vscode-editor-line-height)",
              borderRadius: 2,
              borderLeft: isTextAreaFocused ? 0 : undefined,
              borderRight: isTextAreaFocused ? 0 : undefined,
              borderTop: isTextAreaFocused ? 0 : undefined,
              borderBottom: isTextAreaFocused ? 0 : undefined,
              padding: `9px 28px ${9 + thumbnailsHeight}px 9px`,
            }}
          />
          <DynamicTextArea
            autoFocus={true}
            data-testid="chat-input"
            maxRows={10}
            minRows={3}
            onBlur={handleBlur}
            onChange={(e) => {
              handleInputChange(e);
              updateHighlights();
            }}
            onFocus={() => {
              setIsTextAreaFocused(true);
              onFocusChange?.(true);
            }}
            onHeightChange={(height) => {
              if (textAreaBaseHeight === undefined || height < textAreaBaseHeight) {
                setTextAreaBaseHeight(height);
              }
              onHeightChange?.(height);
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onMouseUp={() => setCursorPosition(textAreaRef.current?.selectionStart ?? 0)}
            onPaste={handlePaste}
            onScroll={() => updateHighlights()}
            onSelect={() => setCursorPosition(textAreaRef.current?.selectionStart ?? 0)}
            placeholder={showUnsupportedFileError || showDimensionError ? "" : placeholderText}
            ref={(el) => {
              if (typeof ref === "function") {
                ref(el);
              } else if (ref) {
                ref.current = el;
              }
              textAreaRef.current = el;
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              backgroundColor: "transparent",
              color: "var(--vscode-input-foreground)",
              borderRadius: 2,
              fontFamily: "var(--vscode-font-family)",
              fontSize: "var(--vscode-editor-font-size)",
              lineHeight: "var(--vscode-editor-line-height)",
              resize: "none",
              overflowX: "hidden",
              overflowY: "scroll",
              scrollbarWidth: "none",
              borderLeft: 0,
              borderRight: 0,
              borderTop: 0,
              borderBottom: `${thumbnailsHeight}px solid transparent`,
              borderColor: "transparent",
              padding: "9px 28px 9px 9px",
              cursor: "text",
              flex: 1,
              zIndex: 1,
              outline:
                isDraggingOver && !showUnsupportedFileError
                  ? "2px dashed var(--vscode-focusBorder)"
                  : isTextAreaFocused
                    ? `1px solid ${mode === "plan" ? "var(--vscode-activityWarningBadge-background)" : "var(--vscode-focusBorder)"}`
                    : "none",
              outlineOffset: isDraggingOver && !showUnsupportedFileError ? "1px" : "0px",
            }}
            value={inputValue}
          />
          {!inputValue && selectedImages.length === 0 && selectedFiles.length === 0 && (
            <div className="text-xs absolute bottom-5 left-6.5 right-16 text-(--vscode-input-placeholderForeground)/50 whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none z-1">
              Type @ for context, / for slash commands & workflows, hold shift to drag in
              files/images
            </div>
          )}
          {(selectedImages.length > 0 || selectedFiles.length > 0) && (
            <Thumbnails
              files={selectedFiles}
              images={selectedImages}
              onHeightChange={handleThumbnailsHeightChange}
              setFiles={setSelectedFiles}
              setImages={setSelectedImages}
              style={{
                position: "absolute",
                paddingTop: 4,
                bottom: 14,
                left: 22,
                right: 47,
                zIndex: 2,
              }}
            />
          )}
          
          <ChatInputActions
            onMentionClick={handleContextButtonClick}
            onSelectFilesAndImages={onSelectFilesAndImages}
            onSend={onSend}
            sendingDisabled={sendingDisabled}
            shouldDisableFilesAndImages={shouldDisableFilesAndImages}
            textAreaBaseHeight={textAreaBaseHeight}
          >
            <ChatInputModelInfo
              apiConfiguration={apiConfiguration}
              mode={mode}
              onClick={handleModelButtonClick}
            />
          </ChatInputActions>

          <div className="absolute bottom-4.5 left-5 z-10 flex items-center gap-2 h-8">
            <ChatInputModeSwitch
              mode={mode}
              onModeToggle={onModeToggle}
              togglePlanKeys={togglePlanActKeys}
            />
          </div>
    );
  },
);

export default ChatTextArea;
