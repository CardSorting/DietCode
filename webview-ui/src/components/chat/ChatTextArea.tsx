import { CHAT_CONSTANTS } from "@/components/chat/chat-view/constants";
import Thumbnails from "@/components/common/Thumbnails";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { forwardRef, useCallback, useEffect, useState, useMemo, memo } from "react";
import DynamicTextArea from "react-textarea-autosize";
import { useMentionInput } from "./hooks/useMentionInput";
import SlashCommandMenu from "@/components/chat/SlashCommandMenu";
import ContextMenu from "@/components/chat/ContextMenu";
import { useChatHighlights } from "./hooks/useChatHighlights";
import { useChatDropHandler } from "./hooks/useChatDropHandler";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { AtSignIcon, ImagePlusIcon, SendIcon, SparklesIcon, ZapIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const { MAX_IMAGES_AND_FILES_PER_MESSAGE } = CHAT_CONSTANTS;

interface ChatTextAreaProps {
  inputValue: string;
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
  onModeToggle: () => void;
}

const ChatTextArea = forwardRef<HTMLTextAreaElement, ChatTextAreaProps>(
  (props, ref) => {
    const {
      inputValue, setInputValue, sendingDisabled, placeholderText,
      selectedFiles, selectedImages, setSelectedImages, setSelectedFiles,
      onSend, onSelectFilesAndImages, shouldDisableFilesAndImages,
      onHeightChange, onFocusChange, onModeToggle
    } = props;

    const state = useExtensionState();
    const { mode, apiConfiguration, navigateToSettingsModelPicker, mcpServers, localWorkflowToggles, globalWorkflowToggles, remoteWorkflowToggles, remoteConfigSettings } = state;
    const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
    const [thumbnailsHeight, setThumbnailsHeight] = useState(0);
    const [textAreaBaseHeight, setTextAreaBaseHeight] = useState<number | undefined>(undefined);

    const mentionInput = useMentionInput({
      inputValue,
      setInputValue,
      onSend,
      sendingDisabled,
      localWorkflowToggles,
      globalWorkflowToggles,
      remoteWorkflowToggles,
      remoteConfigSettings,
      mcpServers: mcpServers || [],
      selectedImages,
      setSelectedImages,
      selectedFiles,
      setSelectedFiles,
      onFocusChange,
    });

    const {
      showSlashCommandsMenu, setShowSlashCommandsMenu, selectedSlashCommandsIndex, setSelectedSlashCommandsIndex,
      slashCommandsQuery, slashCommandsMenuContainerRef, showContextMenu, setShowContextMenu,
      cursorPosition, setCursorPosition, searchQuery, selectedMenuIndex, setSelectedMenuIndex,
      selectedType, textAreaRef, contextMenuContainerRef, isMouseDownOnMenu, setIsMouseDownOnMenu,
      searchLoading, fileSearchResults, queryItems, handleInputChange, handleKeyDown,
      handleMentionSelect, handleSlashCommandsSelect, setPendingInsertions, setIntendedCursorPosition,
    } = mentionInput;

    const { highlightLayerRef, updateHighlights, highlightStyle } = useChatHighlights({
      inputValue, localWorkflowToggles, globalWorkflowToggles,
      remoteWorkflowToggles, remoteConfigSettings, thumbnailsHeight, isTextAreaFocused,
    });

    const dropHandler = useChatDropHandler({
      inputValue, setInputValue, cursorPosition, setCursorPosition,
      setSelectedImages, setSelectedFiles, selectedImages, selectedFiles,
      shouldDisableFilesAndImages, setPendingInsertions,
    });

    const { isDraggingOver, showUnsupportedFileError, showDimensionError, handleDragEnter, handleDragLeave, handleDrop } = dropHandler;

    useEffect(() => {
      const clickOutside = (e: MouseEvent) => {
        if (contextMenuContainerRef.current && !contextMenuContainerRef.current.contains(e.target as Node)) setShowContextMenu(false);
        if (slashCommandsMenuContainerRef.current && !slashCommandsMenuContainerRef.current.contains(e.target as Node)) setShowSlashCommandsMenu(false);
      };
      if (showContextMenu || showSlashCommandsMenu) document.addEventListener("mousedown", clickOutside);
      return () => document.removeEventListener("mousedown", clickOutside);
    }, [showContextMenu, showSlashCommandsMenu, setShowContextMenu, setShowSlashCommandsMenu, contextMenuContainerRef, slashCommandsMenuContainerRef, setIsMouseDownOnMenu]);

    const handleBlur = useCallback(() => {
      if (!isMouseDownOnMenu) { setShowContextMenu(false); setShowSlashCommandsMenu(false); }
      setIsTextAreaFocused(false);
      onFocusChange?.(false);
    }, [isMouseDownOnMenu, onFocusChange, setShowContextMenu, setShowSlashCommandsMenu, setIsTextAreaFocused]);

    const handlePaste = useCallback(
      async (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData("text");
        if (/^\S+:\/\/\S+$/.test(text.trim())) {
          e.preventDefault();
          const trimmed = text.trim();
          const newVal = `${inputValue.slice(0, cursorPosition) + trimmed} ${inputValue.slice(cursorPosition)}`;
          setInputValue(newVal);
          setTimeout(() => textAreaRef.current?.focus(), 0);
          return;
        }
        const files = Array.from(e.clipboardData.items)
          .filter((i) => i.type.startsWith("image/"))
          .map((i) => i.getAsFile())
          .filter((f): f is File => f !== null);
        if (!shouldDisableFilesAndImages && files.length > 0) {
          e.preventDefault();
          // Simple paste handling
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            if (selectedImages.length < MAX_IMAGES_AND_FILES_PER_MESSAGE) {
              setSelectedImages((prev) => [...prev, res]);
            }
          };
          reader.readAsDataURL(files[0]);
        }
      },
      [
        shouldDisableFilesAndImages,
        selectedImages,
        cursorPosition,
        inputValue,
        setInputValue,
        setSelectedImages,
        textAreaRef,
      ],
    );

    return (
      <div
        className="relative flex flex-col px-3.5 py-2.5 bg-sidebar-background border-t border-panel-border"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {showDimensionError && <div className="absolute inset-2.5 bg-error/10 border border-error rounded-xs flex items-center justify-center z-50 text-error font-bold text-xs">Image too large (&gt;7500px)</div>}
        
        {showSlashCommandsMenu && <div ref={slashCommandsMenuContainerRef} className="z-50"><SlashCommandMenu globalWorkflowToggles={globalWorkflowToggles} localWorkflowToggles={localWorkflowToggles} mcpServers={mcpServers} onMouseDown={() => setIsMouseDownOnMenu(true)} onSelect={handleSlashCommandsSelect} query={slashCommandsQuery} remoteWorkflows={remoteConfigSettings?.remoteGlobalWorkflows} remoteWorkflowToggles={remoteWorkflowToggles} selectedIndex={selectedSlashCommandsIndex} setSelectedIndex={setSelectedSlashCommandsIndex} /></div>}
        {showContextMenu && <div ref={contextMenuContainerRef} className="z-50"><ContextMenu dynamicSearchResults={fileSearchResults} isLoading={searchLoading} onMouseDown={() => setIsMouseDownOnMenu(true)} onSelect={handleMentionSelect} queryItems={queryItems} searchQuery={searchQuery} selectedIndex={selectedMenuIndex} selectedType={selectedType} setSelectedIndex={setSelectedMenuIndex} /></div>}
        
        <div className="relative flex-1">
            <div className={cn("absolute inset-0 whitespace-pre-wrap wrap-break-word rounded-md transition-all z-0 bg-code/30 border border-panel-border/50", isTextAreaFocused && "ring-1 ring-focus border-focus/50")} ref={highlightLayerRef} style={highlightStyle} />
            
            <DynamicTextArea
              autoFocus
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
              onHeightChange={(h) => {
                if (textAreaBaseHeight === undefined || h < textAreaBaseHeight) {
                  setTextAreaBaseHeight(h);
                }
                onHeightChange?.(h);
              }}
              onKeyDown={handleKeyDown}
              onMouseUp={() => setCursorPosition(textAreaRef.current?.selectionStart ?? 0)}
              onPaste={handlePaste}
              onScroll={() => updateHighlights()}
              onSelect={() => setCursorPosition(textAreaRef.current?.selectionStart ?? 0)}
              placeholder={placeholderText}
              ref={(el) => {
                if (typeof ref === "function") {
                  ref(el);
                } else if (ref) {
                  ref.current = el;
                }
                textAreaRef.current = el;
              }}
              className="w-full box-border bg-transparent text-foreground rounded-md resize-none overflow-auto scrollbar-none border-none cursor-text z-10 outline-none p-3 pb-8 text-sm"
              style={{ paddingBottom: thumbnailsHeight + 35 }}
              value={inputValue}
            />

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-1.5 font-sans">
                    <button type="button" onClick={onModeToggle} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm", mode === "plan" ? "bg-warning/10 text-warning border-warning/30" : "bg-primary/10 text-primary border-primary/30")}>
                        {mode === "plan" ? <SparklesIcon size={10} /> : <ZapIcon size={10} />}
                        {mode} mode
                    </button>
                    <VSCodeLink onClick={navigateToSettingsModelPicker} className="text-[10px] opacity-60 hover:opacity-100 transition-opacity truncate max-w-24" data-test-id="model-link">
                        {apiConfiguration?.apiProvider || "Model"}
                    </VSCodeLink>
                </div>

                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { textAreaRef.current?.focus(); setInputValue(`${inputValue}@`); updateHighlights(); }} className="p-1 text-description hover:bg-code rounded-sm transition-colors" title="Add context (@)">
                        <AtSignIcon size={14} />
                    </button>
                    {!shouldDisableFilesAndImages && (
                        <button type="button" onClick={onSelectFilesAndImages} className="p-1 text-description hover:bg-code rounded-sm transition-colors" title="Attach image">
                            <ImagePlusIcon size={14} />
                        </button>
                    )}
                    <button type="button" disabled={sendingDisabled || !inputValue.trim()} onClick={onSend} className={cn("ml-1 p-1.5 rounded-md transition-all shadow-sm", sendingDisabled || !inputValue.trim() ? "opacity-30 cursor-not-allowed bg-description/10 text-description" : "bg-primary text-primary-foreground hover:scale-105 active:scale-95")}>
                        <SendIcon size={14} />
                    </button>
                </div>
            </div>

            {(selectedImages.length > 0 || selectedFiles.length > 0) && (
              <Thumbnails files={selectedFiles} images={selectedImages} onHeightChange={h => setThumbnailsHeight(h)} setFiles={setSelectedFiles} setImages={setSelectedImages} className="absolute bottom-12 left-3 right-3 z-30 pointer-events-auto" />
            )}
        </div>
      </div>
    );
  }
);

export default memo(ChatTextArea);
