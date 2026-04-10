import { useState, useCallback, useEffect, useMemo } from "react";
import type { ClineMessage } from "@shared/ExtensionMessage.ts";

/**
 * Manages UI-specific states like expansion, buttons, and row visibility.
 */
export const useUIInteractions = (messages: ClineMessage[]) => {
    const [sendingDisabled, setSendingDisabled] = useState(false);
    const [enableButtons, setEnableButtons] = useState<boolean>(false);
    const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve");
    const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject");
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

    const task = useMemo(() => messages.at(0), [messages]);

    const clearExpandedRows = useCallback(() => {
        setExpandedRows({});
    }, []);

    // Auto-clear expansion when task changes
    useEffect(() => {
        clearExpandedRows();
    }, [task?.ts, clearExpandedRows]);

    return {
        sendingDisabled,
        setSendingDisabled,
        enableButtons,
        setEnableButtons,
        primaryButtonText,
        setPrimaryButtonText,
        secondaryButtonText,
        setSecondaryButtonText,
        expandedRows,
        setExpandedRows,
        clearExpandedRows,
    };
};
