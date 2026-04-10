import type React from "react";
import { useMemo } from "react";
import CodeAccordian from "@/components/common/CodeAccordian";
import SearchResultsDisplay from "./SearchResultsDisplay";
import { cn } from "@/lib/utils";

interface ExpandableCodeSectionProps {
    content: string;
    language?: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    path?: string;
    type?: "code" | "search" | "terminal";
    maxHeight?: number;
    className?: string;
}

/**
 * Unified component for all expandable code/output blocks.
 * Standardizes the look and feel across terminal outputs, file reads, and search results.
 */
export const ExpandableCodeSection: React.FC<ExpandableCodeSectionProps> = ({
    content,
    language,
    isExpanded,
    onToggleExpand,
    path = "",
    type = "code",
    className,
}) => {
    // Determine the renderer based on type
    const renderedContent = useMemo(() => {
        if (type === "search") {
            return (
                <SearchResultsDisplay
                    content={content}
                    isExpanded={isExpanded}
                    onToggleExpand={onToggleExpand}
                    path={path}
                />
            );
        }

        // Default to Accordian for code and terminal
        return (
            <CodeAccordian
                code={content}
                isExpanded={isExpanded}
                language={type === "terminal" ? "shell-session" : language}
                onToggleExpand={onToggleExpand}
                path={path}
            />
        );
    }, [type, content, isExpanded, onToggleExpand, path, language]);

    return (
        <div className={cn("rounded-sm overflow-hidden border border-editor-group-border", className)}>
            {renderedContent}
        </div>
    );
};
