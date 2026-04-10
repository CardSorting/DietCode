import { Button } from "@/components/ui/button";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { formatSize, formatCost } from "@/utils/format";
import { BooleanRequest, StringRequest } from "@shared/nice-grpc/cline/common.ts";
import { TaskServiceClient } from "@/services/grpc-client";
import { memo, useMemo, useState } from "react";
import type { HistoryItem } from "@shared/HistoryItem.ts";
import { GroupedVirtuoso } from "react-virtuoso";
import ViewHeader from "@/components/common/ViewHeader";
import { useHistoryState, SortOption } from "./hooks/useHistoryState";
import { VSCodeTextField, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { FunnelIcon, StarIcon, Trash2Icon, ChevronsUpDownIcon, ChevronsDownUpIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const HistoryView = ({ onDone }: { onDone: () => void }) => {
  const { environment, taskHistory } = useExtensionState();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteAllDisabled, setDeleteAllDisabled] = useState(false);
  const h = useHistoryState(taskHistory);

  const selectedItemsSize = useMemo(() => 
    taskHistory.filter(i => selectedItems.includes(i.id)).reduce((t, i) => t + (i.size || 0), 0)
  , [selectedItems, taskHistory]);

  return (
    <div className="fixed overflow-hidden inset-0 flex flex-col w-full bg-sidebar-background animate-in fade-in slide-in-from-right-2">
      <ViewHeader environment={environment} onDone={onDone} title="History" />
      
      <div className="px-3 space-y-3">
        <div className="flex items-center gap-2">
            <VSCodeTextField className="flex-1" onInput={e => h.setSearchQuery((e.target as any).value)} placeholder="Search tasks..." value={h.searchQuery}>
                <div className="codicon codicon-search opacity-60 mt-0.5" slot="start" />
            </VSCodeTextField>
            <Select onValueChange={v => {
                if (v === "workspaceOnly") h.setShowCurrentWorkspaceOnly(!h.showCurrentWorkspaceOnly);
                else if (v === "favoritesOnly") h.setShowFavoritesOnly(!h.showFavoritesOnly);
                else h.setSortOption(v as SortOption);
            }} value={h.sortOption}>
                <SelectTrigger className="w-10 border-none bg-code/50"><FunnelIcon size={14}/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="mostExpensive">Most Expensive</SelectItem>
                    <SelectItem value="favoritesOnly"><span className="flex items-center gap-2"><StarIcon size={12}/> Favorites</span></SelectItem>
                    <SelectItem value="workspaceOnly"><span className="flex items-center gap-2"><FolderIcon size={12}/> This Workspace</span></SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grow overflow-hidden mt-3 border-t border-accent/5">
        {h.groupedTasks.length > 0 ? (
            <GroupedVirtuoso
                className="h-full"
                groupContent={i => <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-description sticky top-0 z-10 bg-sidebar-background/95 backdrop-blur-sm">{h.groupLabels[i]}</div>}
                groupCounts={h.groupCounts}
                itemContent={i => {
                    const item = h.groupedTasks[i];
                    return <HistoryItemRow item={item} isSelected={selectedItems.includes(item.id)} onSelect={c => setSelectedItems(p => c ? [...p, item.id] : p.filter(id => id !== item.id))} onToggleFavorite={() => h.toggleFavorite(item.id, !!h.pendingFavoriteToggles[item.id] || !!item.isFavorited)} onDelete={() => h.deleteTasks([item.id])} isPendingFavorite={h.pendingFavoriteToggles[item.id] !== undefined} />;
                }}
            />
        ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2"><div className="codicon codicon-history text-3xl"/><span>No history found</span></div>
        )}
      </div>

      <div className="p-3 border-t border-accent/10 bg-sidebar-background/50 space-y-2">
        <div className="flex gap-2">
          <Button className="flex-1 text-[10px] h-7" variant="secondary" onClick={() => setSelectedItems(h.filteredTasks.map(i => i.id))}>Select All</Button>
          <Button className="flex-1 text-[10px] h-7" variant="secondary" onClick={() => setSelectedItems([])}>Clear</Button>
        </div>
        <Button className="w-full h-9 font-bold" variant={selectedItems.length ? "danger" : "secondary"} disabled={!selectedItems.length && (deleteAllDisabled || !taskHistory.length)} onClick={() => {
            if (selectedItems.length) { h.deleteTasks(selectedItems); setSelectedItems([]); }
            else { setDeleteAllDisabled(true); TaskServiceClient.deleteAllTaskHistory(BooleanRequest.create({})).then(h.refresh).finally(() => setDeleteAllDisabled(false)); }
        }}>
           {selectedItems.length ? `Delete Selected (${formatSize(selectedItemsSize)})` : `Delete All History ${h.totalTasksSize ? `(${formatSize(h.totalTasksSize)})` : ""}`}
        </Button>
      </div>
    </div>
  );
};

interface HistoryItemRowProps {
    item: HistoryItem;
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
    onToggleFavorite: () => void;
    onDelete: () => void;
    isPendingFavorite: boolean;
}

const HistoryItemRow = ({ item, isSelected, onSelect, onToggleFavorite, onDelete, isPendingFavorite }: HistoryItemRowProps) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="group flex border-b border-accent/5 hover:bg-white/5 transition-colors">
            <VSCodeCheckbox checked={isSelected} className="p-2 self-start mt-1.5" onClick={e => { e.preventDefault(); onSelect(!(e.target as any).checked); }} />
            <div className="flex-1 py-3 pr-4 space-y-1.5 min-w-0 cursor-pointer" onClick={() => TaskServiceClient.showTaskWithId(StringRequest.create({ value: item.id }))} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { TaskServiceClient.showTaskWithId(StringRequest.create({ value: item.id })); } }} tabIndex={0} role="button">
                <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-medium flex-1 truncate">{item.task}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={e => { e.stopPropagation(); onToggleFavorite(); }} className={cn("p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground", (item.isFavorited || isPendingFavorite) && "text-warning opacity-100")} aria-label="Toggle favorite">
                            <StarIcon size={12} fill={(item.isFavorited || isPendingFavorite) ? "currentColor" : "none"}/>
                        </button>
                        <button type="button" onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-sm hover:bg-destructive hover:text-destructive-foreground" aria-label="Delete task">
                            <Trash2Icon size={12}/>
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-description font-mono tracking-tight uppercase">
                    <span>{new Date(item.ts).toLocaleDateString()} · {formatCost(item.totalCost)}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className="hover:text-foreground p-1" aria-label="Show details">
                        {expanded ? <ChevronsDownUpIcon size={12}/> : <ChevronsUpDownIcon size={12}/>}
                    </button>
                </div>
                {expanded && (
                    <div className="mt-2 p-2 bg-code/50 border border-panel-border/30 rounded-sm text-[10px] grid grid-cols-2 gap-x-4 gap-y-1 opacity-80" onClick={e => e.stopPropagation()}>
                        <div>Tokens In: {item.tokensIn}</div>
                        <div>Tokens Out: {item.tokensOut}</div>
                        <div>Cache Reads: {item.cacheReads}</div>
                        <div>Cache Writes: {item.cacheWrites}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(HistoryView);
