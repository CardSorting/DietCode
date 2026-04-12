import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { TaskServiceClient } from "@/services/grpc-client";
import { 
    GetTaskHistoryRequest, 
    TaskFavoriteRequest 
} from "@shared/nice-grpc/cline/task.ts";
import { 
    EmptyRequest, 
    StringArrayRequest 
} from "@shared/nice-grpc/cline/common.ts";
import type { HistoryItem } from "@shared/HistoryItem";

export type SortOption = "newest" | "oldest" | "mostExpensive" | "mostTokens" | "mostRelevant";

/**
 * Advanced hook for managing task history logic.
 * Handles gRPC fetching, Fuse.js search, and complex sorting.
 */
export const useHistoryState = (taskHistory: HistoryItem[]) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showCurrentWorkspaceOnly, setShowCurrentWorkspaceOnly] = useState(false);
    const [tasks, setTasks] = useState<HistoryItem[]>([]);
    const [pendingFavoriteToggles, setPendingFavoriteToggles] = useState<Record<string, boolean>>({});
    const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null);

    // Load tasks via gRPC
    const loadTaskHistory = useCallback(async () => {
        try {
            const response = await TaskServiceClient.getTaskHistory(
                GetTaskHistoryRequest.create({
                    favoritesOnly: showFavoritesOnly,
                    searchQuery: searchQuery || undefined,
                    sortBy: sortOption,
                    currentWorkspaceOnly: showCurrentWorkspaceOnly,
                }),
            );
            setTasks(response.tasks as HistoryItem[] || []);
        } catch (error) {
            console.error("Error loading task history:", error);
        }
    }, [showFavoritesOnly, showCurrentWorkspaceOnly, searchQuery, sortOption]);

    const fetchTotalTasksSize = useCallback(async () => {
        try {
            const response = await TaskServiceClient.getTotalTasksSize(EmptyRequest.create({}));
            if (response && typeof response.value === "number") {
                setTotalTasksSize(response.value);
            }
        } catch (error) {
            console.error("Error getting total tasks size:", error);
        }
    }, []);

    // Initial load and filter changes
    useEffect(() => {
        loadTaskHistory();
    }, [loadTaskHistory]);

    useEffect(() => {
        fetchTotalTasksSize();
    }, [fetchTotalTasksSize]);

    // Fuzzy search setup
    const fuse = useMemo(() => {
        return new Fuse(tasks, {
            keys: ["task"],
            threshold: 0.6,
            shouldSort: true,
            isCaseSensitive: false,
            includeMatches: true,
            minMatchCharLength: 1,
        });
    }, [tasks]);

    // Computed search results
    const filteredTasks = useMemo(() => {
        const results = searchQuery
            ? fuse.search(searchQuery).map(({ item }) => item)
            : [...tasks];

        results.sort((a, b) => {
            switch (sortOption) {
                case "oldest": return a.ts - b.ts;
                case "mostExpensive": return (b.totalCost || 0) - (a.totalCost || 0);
                case "mostTokens": {
                    const aTokens = (a.tokensIn || 0) + (a.tokensOut || 0) + (a.cacheWrites || 0) + (a.cacheReads || 0);
                    const bTokens = (b.tokensIn || 0) + (b.tokensOut || 0) + (b.cacheWrites || 0) + (b.cacheReads || 0);
                    return bTokens - aTokens;
                }
                case "mostRelevant": return searchQuery ? 0 : b.ts - a.ts;
                default: return b.ts - a.ts;
            }
        });

        return results;
    }, [tasks, searchQuery, fuse, sortOption]);

    // Grouping logic (Today vs Older)
    const { groupedTasks, groupCounts, groupLabels } = useMemo(() => {
        const isDateSort = sortOption === "newest" || sortOption === "oldest";
        if (!isDateSort) {
            return { groupedTasks: filteredTasks, groupCounts: [filteredTasks.length], groupLabels: [] as string[] };
        }

        const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
        const today: HistoryItem[] = [];
        const older: HistoryItem[] = [];

        for (const t of filteredTasks) {
            if (isToday(t.ts)) {
                today.push(t);
            } else {
                older.push(t);
            }
        }

        const groups = [];
        if (today.length > 0) groups.push({ tasks: today, label: "Today" });
        if (older.length > 0) groups.push({ tasks: older, label: "Older" });

        return {
            groupedTasks: groups.flatMap(g => g.tasks),
            groupCounts: groups.map(g => g.tasks.length),
            groupLabels: groups.map(g => g.label)
        };
    }, [filteredTasks, sortOption]);

    // Actions
    const toggleFavorite = useCallback(async (taskId: string, currentValue: boolean) => {
        setPendingFavoriteToggles(prev => ({ ...prev, [taskId]: !currentValue }));
        try {
            await TaskServiceClient.toggleTaskFavorite(TaskFavoriteRequest.create({ taskId, isFavorited: !currentValue }));
            loadTaskHistory();
        } catch (err) {
            console.error("Favorite toggle error:", err);
            setPendingFavoriteToggles(prev => {
                const next = { ...prev };
                delete next[taskId];
                return next;
            });
        }
    }, [loadTaskHistory]);

    const deleteTasks = useCallback(async (ids: string[]) => {
        try {
            await TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ value: ids }));
            loadTaskHistory();
            fetchTotalTasksSize();
        } catch (err) {
            console.error("Delete tasks error:", err);
        }
    }, [loadTaskHistory, fetchTotalTasksSize]);

    return {
        tasks,
        filteredTasks,
        groupedTasks,
        groupCounts,
        groupLabels,
        searchQuery,
        setSearchQuery,
        sortOption,
        setSortOption,
        showFavoritesOnly,
        setShowFavoritesOnly,
        showCurrentWorkspaceOnly,
        setShowCurrentWorkspaceOnly,
        pendingFavoriteToggles,
        toggleFavorite,
        deleteTasks,
        totalTasksSize,
        refresh: loadTaskHistory
    };
};
