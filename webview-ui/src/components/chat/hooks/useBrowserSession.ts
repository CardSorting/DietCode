import { useMemo } from "react";
import type { ClineMessage, BrowserActionResult } from "@shared/ExtensionMessage.ts";

export function useBrowserSession(messages: ClineMessage[], isLast: boolean, lastModifiedMessage?: ClineMessage) {
  const isLastApiReqInterrupted = useMemo(() => {
    const lastApiReqStarted = [...messages].reverse().find((m) => m.say === "api_req_started");
    if (lastApiReqStarted?.text != null) {
      const info = JSON.parse(lastApiReqStarted.text);
      if (info.cancelReason != null) return true;
    }
    return isLast && lastModifiedMessage?.ask === "api_req_failed";
  }, [messages, lastModifiedMessage, isLast]);

  const isLastMessageResume = useMemo(() => {
    return lastModifiedMessage?.ask === "resume_task" || lastModifiedMessage?.ask === "resume_completed_task";
  }, [lastModifiedMessage?.ask]);

  const isBrowsing = useMemo(() => {
    return isLast && messages.some((m) => m.say === "browser_action_result") && !isLastApiReqInterrupted;
  }, [isLast, messages, isLastApiReqInterrupted]);

  const pages = useMemo(() => {
    const result: {
      currentState: {
        url?: string;
        screenshot?: string;
        mousePosition?: string;
        consoleLogs?: string;
        messages: ClineMessage[];
      };
      nextAction?: { messages: ClineMessage[] };
    }[] = [];

    let currentStateMessages: ClineMessage[] = [];
    let nextActionMessages: ClineMessage[] = [];

    for (const message of messages) {
      if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
        currentStateMessages = [message];
      } else if (message.say === "browser_action_result") {
        if (message.text === "") continue;
        currentStateMessages.push(message);
        const resultData = JSON.parse(message.text || "{}") as BrowserActionResult;
        result.push({
          currentState: {
            url: resultData.currentUrl,
            screenshot: resultData.screenshot,
            mousePosition: resultData.currentMousePosition,
            consoleLogs: resultData.logs,
            messages: [...currentStateMessages],
          },
          nextAction: nextActionMessages.length > 0 ? { messages: [...nextActionMessages] } : undefined,
        });
        currentStateMessages = [];
        nextActionMessages = [];
      } else if (["api_req_started", "text", "reasoning", "browser_action", "error_retry"].includes(message.say as string)) {
        nextActionMessages.push(message);
      } else {
        currentStateMessages.push(message);
      }
    }

    if (currentStateMessages.length > 0 || nextActionMessages.length > 0) {
      result.push({
        currentState: { messages: [...currentStateMessages] },
        nextAction: nextActionMessages.length > 0 ? { messages: [...nextActionMessages] } : undefined,
      });
    }
    return result;
  }, [messages]);

  const initialUrl = useMemo(() => {
    const launch = messages.find((m) => m.ask === "browser_action_launch" || m.say === "browser_action_launch");
    return launch?.text || "";
  }, [messages]);

  const isAutoApproved = useMemo(() => {
    const launch = messages.find((m) => m.ask === "browser_action_launch" || m.say === "browser_action_launch");
    return launch?.say === "browser_action_launch";
  }, [messages]);

  const latestState = useMemo(() => {
    for (let i = pages.length - 1; i >= 0; i--) {
      const p = pages[i];
      if (p.currentState.url || p.currentState.screenshot) {
        return {
          url: p.currentState.url,
          mousePosition: p.currentState.mousePosition,
          consoleLogs: p.currentState.consoleLogs,
          screenshot: p.currentState.screenshot,
        };
      }
    }
    return { url: undefined, mousePosition: undefined, consoleLogs: undefined, screenshot: undefined };
  }, [pages]);

  return { isLastApiReqInterrupted, isLastMessageResume, isBrowsing, pages, initialUrl, isAutoApproved, latestState };
}
