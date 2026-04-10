import { useCallback, useLayoutEffect, useRef } from "react";
import { mentionRegexGlobal } from "@shared/context-mentions.ts";
import { validateSlashCommand, slashCommandRegexGlobal } from "@/utils/slash-commands";

interface UseChatHighlightsProps {
  inputValue: string;
  localWorkflowToggles: any;
  globalWorkflowToggles: any;
  remoteWorkflowToggles: any;
  remoteConfigSettings: any;
  thumbnailsHeight: number;
  isTextAreaFocused: boolean;
}

export function useChatHighlights({
  inputValue,
  localWorkflowToggles,
  globalWorkflowToggles,
  remoteWorkflowToggles,
  remoteConfigSettings,
  thumbnailsHeight,
  isTextAreaFocused,
}: UseChatHighlightsProps) {
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const updateHighlights = useCallback(() => {
    if (!textAreaRef.current || !highlightLayerRef.current) return;

    let processedText = textAreaRef.current.value;
    processedText = processedText
      .replace(/\n$/, "\n\n")
      .replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] || c)
      .replace(mentionRegexGlobal, '<mark class="mention-context-textarea-highlight">$&</mark>');

    slashCommandRegexGlobal.lastIndex = 0;
    let hasHighlightedSlashCommand = false;
    processedText = processedText.replace(slashCommandRegexGlobal, (match, prefix, command) => {
      if (hasHighlightedSlashCommand) return match;
      const commandName = command.substring(1);
      const isValid = validateSlashCommand(
        commandName,
        localWorkflowToggles,
        globalWorkflowToggles,
        remoteWorkflowToggles,
        remoteConfigSettings?.remoteGlobalWorkflows,
      );
      if (isValid) {
        hasHighlightedSlashCommand = true;
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

  const highlightStyle: React.CSSProperties = {
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
    border: isTextAreaFocused ? "0" : undefined,
    padding: `9px 28px ${9 + thumbnailsHeight}px 9px`,
  };

  return { highlightLayerRef, textAreaRef, updateHighlights, highlightStyle };
}
