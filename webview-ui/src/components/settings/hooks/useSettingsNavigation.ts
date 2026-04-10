import { useCallback, useEffect, useState } from "react";
import { useEvent } from "react-use";
import type { ExtensionMessage } from "@shared/ExtensionMessage";

/**
 * Manages tab switching and automatic scrolling/navigation logic for Settings.
 */
export const useSettingsNavigation = (initialTab: string, validTabIds: string[]) => {
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    const handleMessage = useCallback((event: MessageEvent) => {
        const message: ExtensionMessage = event.data;
        if (message.type !== "grpc_response") return;

        const grpcMessage = message.grpc_response?.message;
        if (grpcMessage?.key !== "scrollToSettings") return;

        const tabId = grpcMessage.value;
        if (!tabId) return;

        if (validTabIds.includes(tabId)) {
            setActiveTab(tabId);
            return;
        }

        // Fallback for element-specific scrolling
        requestAnimationFrame(() => {
            const element = document.getElementById(tabId);
            if (!element) return;

            element.scrollIntoView({ behavior: "smooth" });
            element.style.transition = "background-color 0.5s ease";
            element.style.backgroundColor = "var(--vscode-textPreformat-background)";

            setTimeout(() => {
                element.style.backgroundColor = "transparent";
            }, 1200);
        });
    }, [validTabIds]);

    useEvent("message", handleMessage);

    return {
        activeTab,
        setActiveTab,
    };
};
