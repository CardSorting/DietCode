import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import {
  ContextMenuOptionType,
  type SearchResult,
  getContextMenuOptionIndex,
  getContextMenuOptions,
  insertMention,
  insertMentionDirectly,
  removeMention,
  shouldShowContextMenu,
} from "@/utils/context-mentions";
import {
  getMatchingSlashCommands,
  insertSlashCommand,
  removeSlashCommand,
  shouldShowSlashCommandsMenu,
  slashCommandDeleteRegex,
} from "@/utils/slash-commands";
import { mentionRegex } from "@shared/context-mentions.ts";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import {
  FileSearchRequest,
  FileSearchType,
  RelativePathsRequest,
} from "@shared/nice-grpc/cline/file.ts";
import type { SlashCommand } from "@shared/slashCommands.ts";
import { isSafari } from "@/utils/platformUtils";

const DEFAULT_CONTEXT_MENU_OPTION = getContextMenuOptionIndex(ContextMenuOptionType.File);

interface UseMentionInputProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSend: () => void;
  sendingDisabled: boolean;
  localWorkflowToggles: any;
  globalWorkflowToggles: any;
  remoteWorkflowToggles: any;
  remoteConfigSettings: any;
  mcpServers: any[];
  selectedImages: string[];
  setSelectedImages: (images: string[] | ((prev: string[]) => string[])) => void;
  selectedFiles: string[];
  setSelectedFiles: (files: string[] | ((prev: string[]) => string[])) => void;
  onFocusChange?: (focused: boolean) => void;
}

export function useMentionInput({
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
}: UseMentionInputProps) {
  const [showSlashCommandsMenu, setShowSlashCommandsMenu] = useState(false);
  const [selectedSlashCommandsIndex, setSelectedSlashCommandsIndex] = useState(0);
  const [slashCommandsQuery, setSlashCommandsQuery] = useState("");
  const slashCommandsMenuContainerRef = useRef<HTMLDivElement>(null);

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMouseDownOnMenu, setIsMouseDownOnMenu] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(-1);
  const [selectedType, setSelectedType] = useState<ContextMenuOptionType | null>(null);
  const [justDeletedSpaceAfterMention, setJustDeletedSpaceAfterMention] = useState(false);
  const [justDeletedSpaceAfterSlashCommand, setJustDeletedSpaceAfterSlashCommand] = useState(false);
  const [intendedCursorPosition, setIntendedCursorPosition] = useState<number | null>(null);
  const contextMenuContainerRef = useRef<HTMLDivElement>(null);

  const [gitCommits, setGitCommits] = useState<any[]>([]);
  const [fileSearchResults, setFileSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingInsertions, setPendingInsertions] = useState<string[]>([]);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch git commits when Git is selected or when typing a hash
  useEffect(() => {
    if (selectedType === ContextMenuOptionType.Git || /^[a-f0-9]+$/i.test(searchQuery)) {
      FileServiceClient.searchCommits(StringRequest.create({ value: searchQuery || "" }))
        .then((response) => {
          if (response.commits) {
            const commits = response.commits.map((commit: any) => ({
              type: ContextMenuOptionType.Git,
              value: commit.hash,
              label: commit.subject,
              description: `${commit.shortHash} by ${commit.author} on ${commit.date}`,
            }));
            setGitCommits(commits);
          }
        })
        .catch((error) => {
          console.error("Error searching commits:", error);
        });
    }
  }, [selectedType, searchQuery]);

  const queryItems = [
    { type: ContextMenuOptionType.Problems, value: "problems" },
    { type: ContextMenuOptionType.Terminal, value: "terminal" },
    ...gitCommits,
  ];

  const handleMentionSelect = useCallback(
    (type: ContextMenuOptionType, value?: string) => {
      if (type === ContextMenuOptionType.NoResults) return;

      if (
        type === ContextMenuOptionType.File ||
        type === ContextMenuOptionType.Folder ||
        type === ContextMenuOptionType.Git
      ) {
        if (!value) {
          setSelectedType(type);
          setSearchQuery("");
          setSelectedMenuIndex(0);

          if (type === ContextMenuOptionType.File || type === ContextMenuOptionType.Folder) {
            setSearchLoading(true);
            const searchType =
              type === ContextMenuOptionType.File ? FileSearchType.FILE : FileSearchType.FOLDER;

            FileServiceClient.searchFiles(
              FileSearchRequest.create({
                query: "",
                mentionsRequestId: "",
                selectedType: searchType,
              }),
            )
              .then((results) => {
                setFileSearchResults((results.results || []) as SearchResult[]);
                setSearchLoading(false);
              })
              .catch((error) => {
                console.error("Error searching files:", error);
                setFileSearchResults([]);
                setSearchLoading(false);
              });
          }
          return;
        }
      }

      setShowContextMenu(false);
      setSelectedType(null);
      const queryLength = searchQuery.length;
      setSearchQuery("");

      if (textAreaRef.current) {
        let insertValue = value || "";
        const { newValue, mentionIndex } = insertMention(
          textAreaRef.current.value,
          cursorPosition,
          insertValue,
          queryLength,
        );

        setInputValue(newValue);
        const newCursorPosition = newValue.indexOf(" ", mentionIndex + insertValue.length) + 1;
        setCursorPosition(newCursorPosition);
        setIntendedCursorPosition(newCursorPosition);

        setTimeout(() => {
          textAreaRef.current?.blur();
          textAreaRef.current?.focus();
        }, 0);
      }
    },
    [setInputValue, cursorPosition, searchQuery],
  );

  const handleSlashCommandsSelect = useCallback(
    (command: SlashCommand) => {
      setShowSlashCommandsMenu(false);
      const queryLength = slashCommandsQuery.length;
      setSlashCommandsQuery("");

      if (textAreaRef.current) {
        const { newValue, commandIndex } = insertSlashCommand(
          textAreaRef.current.value,
          command.name,
          queryLength,
          cursorPosition,
        );
        const newCursorPosition = newValue.indexOf(" ", commandIndex + 1 + command.name.length) + 1;

        setInputValue(newValue);
        setCursorPosition(newCursorPosition);
        setIntendedCursorPosition(newCursorPosition);

        setTimeout(() => {
          textAreaRef.current?.blur();
          textAreaRef.current?.focus();
        }, 0);
      }
    },
    [setInputValue, slashCommandsQuery, cursorPosition],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSlashCommandsMenu) {
        if (event.key === "Escape") {
          setShowSlashCommandsMenu(false);
          setSlashCommandsQuery("");
          return;
        }

        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedSlashCommandsIndex((prevIndex) => {
            const direction = event.key === "ArrowUp" ? -1 : 1;
            const allCommands = getMatchingSlashCommands(
              slashCommandsQuery,
              localWorkflowToggles,
              globalWorkflowToggles,
              remoteWorkflowToggles,
              remoteConfigSettings?.remoteGlobalWorkflows,
              mcpServers,
            );

            if (allCommands.length === 0) return prevIndex;
            const total = allCommands.length;
            return (prevIndex + direction + total) % total;
          });
          return;
        }

        if ((event.key === "Enter" || event.key === "Tab") && selectedSlashCommandsIndex !== -1) {
          event.preventDefault();
          const commands = getMatchingSlashCommands(
            slashCommandsQuery,
            localWorkflowToggles,
            globalWorkflowToggles,
            remoteWorkflowToggles,
            remoteConfigSettings?.remoteGlobalWorkflows,
            mcpServers,
          );
          if (commands.length > 0) {
            handleSlashCommandsSelect(commands[selectedSlashCommandsIndex]);
          }
          return;
        }
      }

      if (showContextMenu) {
        if (event.key === "Escape") {
          setShowContextMenu(false);
          setSelectedType(null);
          setSelectedMenuIndex(DEFAULT_CONTEXT_MENU_OPTION);
          setSearchQuery("");
          return;
        }

        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedMenuIndex((prevIndex) => {
            const direction = event.key === "ArrowUp" ? -1 : 1;
            const options = getContextMenuOptions(
              searchQuery,
              selectedType,
              queryItems,
              fileSearchResults,
            );
            const selectableOptions = options.filter(
              (o) =>
                o.type !== ContextMenuOptionType.URL && o.type !== ContextMenuOptionType.NoResults,
            );

            if (selectableOptions.length === 0) return -1;
            const currentIndex = selectableOptions.indexOf(options[prevIndex]);
            const newIndex =
              (currentIndex + direction + selectableOptions.length) % selectableOptions.length;
            return options.indexOf(selectableOptions[newIndex]);
          });
          return;
        }

        if ((event.key === "Enter" || event.key === "Tab") && selectedMenuIndex !== -1) {
          event.preventDefault();
          const options = getContextMenuOptions(
            searchQuery,
            selectedType,
            queryItems,
            fileSearchResults,
          );
          const opt = options[selectedMenuIndex];
          if (opt && opt.type !== ContextMenuOptionType.URL && opt.type !== ContextMenuOptionType.NoResults) {
            const val = opt.label?.includes(":") ? opt.label : opt.value;
            handleMentionSelect(opt.type, val);
          }
          return;
        }
      }

      const isComposing = isSafari
        ? (event.nativeEvent as any).keyCode === 229
        : (event.nativeEvent as any).isComposing ?? false;

      if (event.key === "Enter" && !event.shiftKey && !isComposing) {
        event.preventDefault();
        if (!sendingDisabled) {
          onSend();
        }
      }

      if (event.key === "Backspace" && !isComposing) {
        const charBefore = inputValue[cursorPosition - 1];
        const charAfter = inputValue[cursorPosition + 1];
        const isBeforeWs = charBefore === " " || charBefore === "\n" || charBefore === "\r\n";
        const isAfterWs = charAfter === " " || charAfter === "\n" || charAfter === "\r\n";

        if (isBeforeWs && inputValue.slice(0, cursorPosition - 1).match(new RegExp(`${mentionRegex.source}$`))) {
          const newPos = cursorPosition - 1;
          if (!isAfterWs) {
            event.preventDefault();
            textAreaRef.current?.setSelectionRange(newPos, newPos);
          }
          setCursorPosition(newPos);
          setJustDeletedSpaceAfterMention(true);
        } else if (isBeforeWs && inputValue.slice(0, cursorPosition - 1).match(slashCommandDeleteRegex)) {
          const newPos = cursorPosition - 1;
          if (!isAfterWs) {
            event.preventDefault();
            textAreaRef.current?.setSelectionRange(newPos, newPos);
          }
          setCursorPosition(newPos);
          setJustDeletedSpaceAfterSlashCommand(true);
        } else if (justDeletedSpaceAfterMention) {
          const { newText, newPosition } = removeMention(inputValue, cursorPosition);
          if (newText !== inputValue) {
            event.preventDefault();
            setInputValue(newText);
            setIntendedCursorPosition(newPosition);
          }
          setJustDeletedSpaceAfterMention(false);
          setShowContextMenu(false);
        } else if (justDeletedSpaceAfterSlashCommand) {
          const { newText, newPosition } = removeSlashCommand(inputValue, cursorPosition);
          if (newText !== inputValue) {
            event.preventDefault();
            setInputValue(newText);
            setIntendedCursorPosition(newPosition);
          }
          setJustDeletedSpaceAfterSlashCommand(false);
          setShowSlashCommandsMenu(false);
        } else {
          setJustDeletedSpaceAfterMention(false);
          setJustDeletedSpaceAfterSlashCommand(false);
        }
      }
    },
    [
      showSlashCommandsMenu,
      showContextMenu,
      inputValue,
      cursorPosition,
      selectedSlashCommandsIndex,
      selectedMenuIndex,
      slashCommandsQuery,
      searchQuery,
      localWorkflowToggles,
      globalWorkflowToggles,
      remoteWorkflowToggles,
      remoteConfigSettings,
      mcpServers,
      sendingDisabled,
      onSend,
      handleSlashCommandsSelect,
      handleMentionSelect,
      queryItems,
      fileSearchResults,
      selectedType,
      setInputValue,
      justDeletedSpaceAfterMention,
      justDeletedSpaceAfterSlashCommand,
    ],
  );

  useLayoutEffect(() => {
    if (intendedCursorPosition !== null && textAreaRef.current) {
      textAreaRef.current.setSelectionRange(intendedCursorPosition, intendedCursorPosition);
      setIntendedCursorPosition(null);
    }
  }, [inputValue, intendedCursorPosition]);

  useEffect(() => {
    if (pendingInsertions.length === 0 || !textAreaRef.current) return;
    const path = pendingInsertions[0];
    const { newValue, mentionIndex } = insertMentionDirectly(
      textAreaRef.current.value,
      intendedCursorPosition ?? textAreaRef.current.selectionStart,
      path,
    );
    setInputValue(newValue);
    const newPos = mentionIndex + path.length + 2;
    setIntendedCursorPosition(newPos);
    setPendingInsertions((prev) => prev.slice(1));
  }, [pendingInsertions, setInputValue, intendedCursorPosition]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const pos = e.target.selectionStart;
      setInputValue(val);
      setCursorPosition(pos);

      let showMenu = shouldShowContextMenu(val, pos);
      const showSlash = shouldShowSlashCommandsMenu(val, pos);
      if (showSlash) showMenu = false;

      setShowSlashCommandsMenu(showSlash);
      setShowContextMenu(showMenu);

      if (showSlash) {
        const lastSlash = val.slice(0, pos).lastIndexOf("/");
        setSlashCommandsQuery(val.slice(lastSlash + 1, pos));
        setSelectedSlashCommandsIndex(0);
      } else if (showMenu) {
        const lastAt = val.lastIndexOf("@", pos - 1);
        const query = val.slice(lastAt + 1, pos);
        setSearchQuery(query);
        if (query.length > 0) {
          setSelectedMenuIndex(0);
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
          setSearchLoading(true);

          searchTimeoutRef.current = setTimeout(() => {
            const searchType =
              selectedType === ContextMenuOptionType.File
                ? FileSearchType.FILE
                : selectedType === ContextMenuOptionType.Folder
                  ? FileSearchType.FOLDER
                  : undefined;

            let workspaceHint: string | undefined;
            let q = query;
            const match = query.match(/^([\w-]+):\/(.*)$/);
            if (match) {
              workspaceHint = match[1];
              q = match[2];
            }

            FileServiceClient.searchFiles(
              FileSearchRequest.create({
                query: q,
                mentionsRequestId: query,
                selectedType: searchType,
                workspaceHint,
              }),
            )
              .then((results) => {
                setFileSearchResults((results.results || []) as SearchResult[]);
                setSearchLoading(false);
              })
              .catch(() => {
                setFileSearchResults([]);
                setSearchLoading(false);
              });
          }, 200);
        } else {
          setSelectedMenuIndex(DEFAULT_CONTEXT_MENU_OPTION);
        }
      } else {
        setSearchQuery("");
        setSelectedMenuIndex(-1);
        setFileSearchResults([]);
      }
    },
    [setInputValue, selectedType],
  );

  return {
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
  };
}
