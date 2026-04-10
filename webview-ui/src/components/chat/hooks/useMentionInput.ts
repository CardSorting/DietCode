import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { McpServer, RemoteConfig } from "@shared/mcp";

// Alias RemoteConfig to RemoteConfigFields for backward compatibility
export type RemoteConfigFields = RemoteConfig;

interface UseMentionInputProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSend: () => void;
  sendingDisabled: boolean;
  localWorkflowToggles?: Record<string, boolean>;
  globalWorkflowToggles?: Record<string, boolean>;
  remoteWorkflowToggles?: Record<string, boolean>;
  selectedFiles?: string[];
  setSelectedFiles?: (files: string[]) => void;
  onFocusChange?: (focused: boolean) => void;
  remoteConfigSettings?: RemoteConfigFields;
  mcpServers: McpServer[];
  selectedImages?: string[];
  setSelectedImages?: (imgs: string[]) => void;
}

export const useMentionInput = ({
  inputValue,
  setInputValue,
  onSend,
  sendingDisabled,
  mcpServers,
  localWorkflowToggles,
  globalWorkflowToggles,
  remoteWorkflowToggles,
  remoteConfigSettings,
  selectedImages,
  setSelectedImages,
  selectedFiles,
  setSelectedFiles,
  onFocusChange,
}: UseMentionInputProps) => {
  const [showSlashCommandsMenu, setShowSlashCommandsMenu] = useState(false);
  const [selectedSlashCommandsIndex, setSelectedSlashCommandsIndex] = useState(0);
  const [slashCommandsQuery, setSlashCommandsQuery] = useState("");
  const slashCommandsMenuContainerRef = useRef<HTMLDivElement>(null);

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<"file" | "mcp" | "skill">("file");
  const contextMenuContainerRef = useRef<HTMLDivElement>(null);

  const [isMouseDownOnMenu, setIsMouseDownOnMenu] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [fileSearchResults, setFileSearchResults] = useState<unknown[]>([]);
  const [queryItems, setQueryItems] = useState<unknown[]>([]);
  
  const [pendingInsertions, setPendingInsertions] = useState<string[]>([]);
  const [intendedCursorPosition, setIntendedCursorPosition] = useState<number | undefined>(undefined);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInputValue(val);
    setCursorPosition(pos);

    // Detect slash command
    if (val.startsWith("/")) {
      const match = val.match(/^\/(\w*)$/);
      if (match) {
        setShowSlashCommandsMenu(true);
        setSlashCommandsQuery(match[1]);
        return;
      }
    }
    setShowSlashCommandsMenu(false);

    // Detect mention
    const lastAtPos = val.lastIndexOf("@", pos - 1);
    if (lastAtPos !== -1) {
      const query = val.slice(lastAtPos + 1, pos);
      if (!query.includes(" ")) {
        setShowContextMenu(true);
        setSearchQuery(query);
        setSelectedType("file"); // Default
        return;
      }
    }
    setShowContextMenu(false);
  }, [setInputValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashCommandsMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashCommandsIndex(prev => prev + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashCommandsIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Trigger select
      } else if (e.key === "Escape") {
        setShowSlashCommandsMenu(false);
      }
    } else if (showContextMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMenuIndex(prev => prev + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMenuIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Trigger select
      } else if (e.key === "Escape") {
        setShowContextMenu(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey && !sendingDisabled) {
      e.preventDefault();
      onSend();
    }
  }, [showSlashCommandsMenu, showContextMenu, onSend, sendingDisabled]);

  const handleMentionSelect = useCallback((item: unknown) => {
    setShowContextMenu(false);
    // Logic to insert mention into inputValue
  }, []);

  const handleSlashCommandsSelect = useCallback((item: unknown) => {
    setShowSlashCommandsMenu(false);
    // Logic to insert slash command into inputValue
  }, []);

  return {
    showSlashCommandsMenu, setShowSlashCommandsMenu, selectedSlashCommandsIndex, setSelectedSlashCommandsIndex,
    slashCommandsQuery, slashCommandsMenuContainerRef, showContextMenu, setShowContextMenu,
    cursorPosition, setCursorPosition, searchQuery, selectedMenuIndex, setSelectedMenuIndex,
    selectedType, textAreaRef, contextMenuContainerRef, isMouseDownOnMenu, setIsMouseDownOnMenu,
    searchLoading, fileSearchResults, queryItems, handleInputChange, handleKeyDown,
    handleMentionSelect, handleSlashCommandsSelect, setPendingInsertions, setIntendedCursorPosition,
  };
};
