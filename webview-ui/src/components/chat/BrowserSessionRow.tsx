import { BrowserSettingsMenu } from "../browser/BrowserSettingsMenu";
import { ChatRowContent, ProgressIndicator } from "./ChatRow";
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "../common/CodeBlock";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { FileServiceClient } from "@/services/grpc-client";
import { BROWSER_VIEWPORT_PRESETS } from "@shared/BrowserSettings.ts";
import type {
  BrowserAction,
  ClineMessage,
  ClineSayBrowserAction,
} from "@shared/ExtensionMessage.ts";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import deepEqual from "fast-deep-equal";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSize } from "react-use";
import { useBrowserSession } from "./hooks/useBrowserSession";

interface BrowserSessionRowProps {
  messages: ClineMessage[];
  expandedRows: Record<number, boolean>;
  onToggleExpand: (messageTs: number) => void;
  lastModifiedMessage?: ClineMessage;
  isLast: boolean;
  onHeightChange: (isTaller: boolean) => void;
  onSetQuote: (text: string) => void;
}

const BrowserSessionRow = memo((props: BrowserSessionRowProps) => {
  const { messages, isLast, onHeightChange, lastModifiedMessage, onSetQuote } = props;
  const { browserSettings } = useExtensionState();
  const browserSettingsOrDefault = browserSettings || BROWSER_VIEWPORT_PRESETS["Chrome"];
  const prevHeightRef = useRef(0);
  const [maxActionHeight, setMaxActionHeight] = useState(0);
  const [consoleLogsExpanded, setConsoleLogsExpanded] = useState(false);

  const { isLastMessageResume, isBrowsing, pages, initialUrl, isAutoApproved, latestState } = useBrowserSession(messages, isLast, lastModifiedMessage);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  useEffect(() => { setCurrentPageIndex(pages.length - 1); }, [pages.length]);

  const currentPage = pages[currentPageIndex];
  const isLastPage = currentPageIndex === pages.length - 1;
  const defaultMousePosition = `${browserSettings.viewport.width * 0.7},${browserSettings.viewport.height * 0.5}`;

  const displayState = isLastPage
    ? {
        url: currentPage?.currentState.url || latestState.url || initialUrl,
        mousePosition: currentPage?.currentState.mousePosition || latestState.mousePosition || defaultMousePosition,
        consoleLogs: currentPage?.currentState.consoleLogs,
        screenshot: currentPage?.currentState.screenshot || latestState.screenshot,
      }
    : {
        url: currentPage?.currentState.url || initialUrl,
        mousePosition: currentPage?.currentState.mousePosition || defaultMousePosition,
        consoleLogs: currentPage?.currentState.consoleLogs,
        screenshot: currentPage?.currentState.screenshot,
      };

  const [actionContent, { height: actionHeight }] = useSize(
    <div>
      {currentPage?.nextAction?.messages.map((message) => (
        <BrowserSessionRowContent
          expandedRows={props.expandedRows}
          isLast={props.isLast}
          key={message.ts}
          lastModifiedMessage={props.lastModifiedMessage}
          message={message}
          onSetQuote={props.onSetQuote}
          onToggleExpand={props.onToggleExpand}
          setMaxActionHeight={setMaxActionHeight}
        />
      ))}
      {!isBrowsing && messages.some((m) => m.say === "browser_action_result") && currentPageIndex === 0 && (
        <BrowserActionBox action="launch" text={initialUrl} />
      )}
    </div>,
  );

  useEffect(() => {
    if (actionHeight > 0 && actionHeight !== Number.POSITIVE_INFINITY && actionHeight > maxActionHeight) {
      setMaxActionHeight(actionHeight);
    }
  }, [actionHeight, maxActionHeight]);

  const latestClickPosition = useMemo(() => {
    if (!isBrowsing) return undefined;
    const actions = currentPage?.nextAction?.messages || [];
    for (let i = actions.length - 1; i >= 0; i--) {
      const message = actions[i];
      if (message.say === "browser_action") {
        const ba = JSON.parse(message.text || "{}") as ClineSayBrowserAction;
        if (ba.action === "click" && ba.coordinate) return ba.coordinate;
      }
    }
    return undefined;
  }, [isBrowsing, currentPage?.nextAction?.messages]);

  const mousePosition = isBrowsing ? latestClickPosition || displayState.mousePosition : displayState.mousePosition;
  const maxWidth = browserSettings.viewport.width < BROWSER_VIEWPORT_PRESETS["Small Desktop (900x600)"].width ? 200 : undefined;

  const [browserSessionRow, { height }] = useSize(
    <div className="px-[15px] pt-[10px] pb-[10px] relative -mb-[10px]">
      <div className="flex items-center gap-[10px] mb-[10px]">
        {isBrowsing && !isLastMessageResume ? (
          <ProgressIndicator />
        ) : (
          <span className="codicon codicon-inspect text-foreground mb-[-1.5px]" />
        )}
        <span className="font-bold">
          {isAutoApproved ? "DietCode is using the browser:" : "DietCode wants to use the browser:"}
        </span>
      </div>
      
      <div 
        className="rounded-xs border border-vscode-editorGroup-border bg-code-block-bg m-0 mx-auto mb-[10px]"
        style={{ maxWidth, backgroundColor: CODE_BLOCK_BG_COLOR }}
      >
        <div className="m-[5px] mx-auto w-[calc(100%-10px)] flex items-center gap-[4px]">
          <div className={cn("flex bg-input-background border border-input-border rounded-sm px-1 py-0.5 min-w-0 text-description w-full justify-center", { "text-input-foreground": !!displayState.url })}>
            <span className="text-xs text-ellipsis overflow-hidden whitespace-nowrap">{displayState.url || "http"}</span>
          </div>
          <BrowserSettingsMenu />
        </div>

        <div 
          className="w-full relative bg-input-background"
          style={{ paddingBottom: `${(browserSettingsOrDefault.viewport.height / browserSettingsOrDefault.viewport.width) * 100}%` }}
        >
          {displayState.screenshot ? (
            <button
              className="absolute inset-0 p-0 m-0 border-none bg-none outline-none cursor-pointer w-full h-full"
              onClick={() => FileServiceClient.openImage(StringRequest.create({ value: displayState.screenshot! })).catch(console.error)}
              type="button"
            >
              <img alt="Browser screenshot" src={displayState.screenshot} className="w-full h-full object-contain" />
            </button>
          ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="codicon codicon-globe text-8xl text-description" />
            </div>
          )}
          {displayState.mousePosition && (
            <BrowserCursor
              className="absolute transition-all duration-300 pointer-events-none z-10"
              style={{
                top: `${(Number.parseInt(mousePosition.split(",")[1]) / browserSettingsOrDefault.viewport.height) * 100}%`,
                left: `${(Number.parseInt(mousePosition.split(",")[0]) / browserSettingsOrDefault.viewport.width) * 100}%`,
              }}
            />
          )}
        </div>

        <div className="w-full">
          <button
            className="flex items-center gap-1 w-full justify-start p-[9px_8px_8px] border-none bg-none font-inherit text-inherit cursor-pointer"
            onClick={() => setConsoleLogsExpanded(!consoleLogsExpanded)}
            style={{ paddingBottom: consoleLogsExpanded ? 0 : 8 }}
            type="button"
          >
            {consoleLogsExpanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
            <span className="text-xs opacity-80">Console Logs</span>
          </button>
          {consoleLogsExpanded && (
            <CodeBlock source={`${"```"}shell\n${displayState.consoleLogs || "(No new logs)"}\n${"```"}`} />
          )}
        </div>
      </div>

      <div style={{ minHeight: maxActionHeight }}>{actionContent}</div>

      {pages.length > 1 && (
        <div className="flex justify-between items-center p-[8px_0] mt-[15px] border-t border-vscode-editorGroup-border">
          <div>Step {currentPageIndex + 1} of {pages.length}</div>
          <div className="flex gap-[4px]">
            <VSCodeButton disabled={currentPageIndex === 0 || isBrowsing} onClick={() => setCurrentPageIndex(i => i - 1)}>Previous</VSCodeButton>
            <VSCodeButton disabled={currentPageIndex === pages.length - 1 || isBrowsing} onClick={() => setCurrentPageIndex(i => i + 1)}>Next</VSCodeButton>
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    if (isLast && height > 0 && height !== Number.POSITIVE_INFINITY && height !== prevHeightRef.current) {
      if (prevHeightRef.current !== 0) onHeightChange(height > prevHeightRef.current);
      prevHeightRef.current = height;
    }
  }, [height, isLast, onHeightChange]);

  return browserSessionRow;
}, deepEqual);

interface BrowserSessionRowContentProps {
  message: ClineMessage;
  expandedRows: Record<number, boolean>;
  onToggleExpand: (messageTs: number) => void;
  lastModifiedMessage?: ClineMessage;
  isLast: boolean;
  setMaxActionHeight: (h: number) => void;
  onSetQuote: (text: string) => void;
}

const BrowserSessionRowContent = memo(({ message, expandedRows, onToggleExpand, lastModifiedMessage, isLast, setMaxActionHeight, onSetQuote }: BrowserSessionRowContentProps) => {
  const handleToggle = useCallback(() => {
    if (message.say === "api_req_started") setMaxActionHeight(0);
    onToggleExpand(message.ts);
  }, [onToggleExpand, message.ts, message.say, setMaxActionHeight]);

  if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
    return (
      <div className="mt-2.5">
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="font-bold">Browser Session Started</span>
        </div>
        <div className="rounded-xs border border-vscode-editorGroup-border overflow-hidden" style={{ backgroundColor: CODE_BLOCK_BG_COLOR }}>
          <CodeBlock forceWrap source={`${"```"}shell\n${message.text}\n${"```"}`} />
        </div>
      </div>
    );
  }

  if (message.type === "say") {
    if (["api_req_started", "text", "reasoning", "error_retry"].includes(message.say)) {
      return (
        <div className="p-[10px_0]">
          <ChatRowContent
            isExpanded={expandedRows[message.ts] ?? false}
            isLast={isLast}
            lastModifiedMessage={lastModifiedMessage}
            message={message}
            onSetQuote={onSetQuote}
            onToggleExpand={handleToggle}
            onHeightChange={() => {}}
          />
        </div>
      );
    }
    if (message.say === "browser_action") {
      const ba = JSON.parse(message.text || "{}") as ClineSayBrowserAction;
      return <BrowserActionBox action={ba.action} coordinate={ba.coordinate} text={ba.text} />;
    }
  }
  return null;
}, deepEqual);

const BrowserActionBox = ({ action, coordinate, text }: { action: BrowserAction; coordinate?: string; text?: string }) => {
  const label = useMemo(() => {
    switch (action) {
      case "launch": return `Launch browser at ${text}`;
      case "click": return `Click (${coordinate?.replace(",", ", ")})`;
      case "type": return `Type "${text}"`;
      case "scroll_down": return "Scroll down";
      case "scroll_up": return "Scroll up";
      case "close": return "Close browser";
      default: return action;
    }
  }, [action, coordinate, text]);

  return (
    <div className="pt-2.5">
      <div className="rounded-xs bg-code-block-bg border border-vscode-editorGroup-border overflow-hidden" style={{ backgroundColor: CODE_BLOCK_BG_COLOR }}>
        <div className="flex items-center p-[9px_10px]">
          <span className="whitespace-normal break-words text-sm">
            <span className="font-medium">Browse Action: </span>{label}
          </span>
        </div>
      </div>
    </div>
  );
};

const BrowserCursor = ({ className, style }: { className?: string; style?: React.CSSProperties }) => {
  const cursorBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAFaADAAQAAAABAAAAGAAAAADwi9a/AAADGElEQVQ4EZ2VbUiTURTH772be/PxZdsz3cZwC4RVaB8SAjMpxQwSWZbQG/TFkN7oW1Df+h6IRV9C+hCpKUSIZUXOfGM5tAKViijFFEyfZ7Ol29S1Pbdzl8Uw9+aBu91zzv3/nt17zt2DEZjBYOAkKrtFMXIghAWM8U2vMN/FctsxGRMpM7NbEEYNMM2CYUSInlJx3OpawO9i+XSNQYkmk2uFb9njzkcfVSr1p/GJiQKMULVaw2WuBv296UKRxWJR6wxGCmM1EAhSNppv33GBH9qI32cPTAtss9lUm6EM3N7R+RbigT+5/CeosFCZKpjEW+iorS1pb30wDUXzQfHqtD/9L3ieZ2ee1OJCmbL8QHnRs+4uj0wmW4QzrpCwvJ8zGg3JqAmhTLynuLiwv8/5KyND8Q3cEkUEDWu15oJE4KRQJt5hs1rcriGNRqP+DK4dyyWXXm/aFQ+cEpSJ8/LyDGPuEZNOmzsOroUSOqzXG/dtBU4ZysTZYKNut91sNo2Cq6cE9enz86s2g9OCMrFSqVC5hgb32u072W3jKMU90Hb1seC0oUwsB+t92bO/rKx0EFGkgFCnjjc1/gVvC8rE0L+4o63t4InjxwbAJQjTe3qD8QrLkXA4DC24fWtuajp06cLFYSBIFKGmXKPRRmAnME9sPt+yLwIWb9WN69fKoTneQz4Dh2mpPNkvfeV0jjecb9wNAkwIEVQq5VJOds4Kb+DXoAsiVquVwI1Dougpij6UyGYx+5cKroeDEFibm5lWRRMbH1+npmYrq6qhwlQHIbajZEf1fElcqGGFpGg9HMuKzpfBjhytCTMgkJ56RX09zy/ysENTBElmjIgJnmNChJqohDVQqpEfwkILE8v/o0GAnV9F1eEvofVQCbiTBEXOIPQh5PGgefDZeAcjrpGZjULBr/m3tZOnz7oEQWRAQZLjWlEU/XEJWySiILgRc5Cz1DkcAyuBFcnpfF0JiXWKpcolQXizhS5hKAqFpr0MVbgbuxJ6+5xX+P4wNpbqPPrugZfbmIbLmgQR3Aw8QSi66hUXulOFbF73GxqjE5BNXWNeAAAAAElFTkSuQmCC";
  return <img alt="cursor" src={cursorBase64} className={cn("w-[17px] h-[22px]", className)} style={style} />;
};

export default BrowserSessionRow;
