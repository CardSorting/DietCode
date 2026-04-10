import Thumbnails from "@/components/common/Thumbnails";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { CheckpointsServiceClient } from "@/services/grpc-client";
import type { ClineCheckpointRestore } from "@shared/WebviewMessage.ts";
import { CheckpointRestoreRequest } from "@shared/nice-grpc/cline/checkpoints.ts";
import React, { forwardRef, useMemo, useRef, useState, useEffect, memo } from "react";
import DynamicTextArea from "react-textarea-autosize";
import { highlightText } from "./task-header/Highlights";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "../common/MarkdownRenderer";

interface UserMessageProps {
  text?: string;
  files?: string[];
  images?: string[];
  messageTs?: number;
  sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void;
}

const UserMessage: React.FC<UserMessageProps> = memo(({ text, images, files, messageTs, sendMessageFromChatRow }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text || "");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { checkpointManagerErrorMessage } = useExtensionState();
  const highlightedText = useMemo(() => highlightText(editedText || text), [editedText, text]);

  const btnRefs = { all: useRef<HTMLButtonElement>(null), chat: useRef<HTMLButtonElement>(null) };

  useEffect(() => { if (isEditing) textAreaRef.current?.select(); }, [isEditing]);

  const handleRestore = async (type: ClineCheckpointRestore) => {
    setIsEditing(false);
    if (text === editedText) return;
    try {
      await CheckpointsServiceClient.checkpointRestore(CheckpointRestoreRequest.create({ number: messageTs, restoreType: type, offset: 1 }));
      setTimeout(() => sendMessageFromChatRow?.(editedText, images || [], files || []), type === "task" ? 500 : 1000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className={cn("p-3 my-1 rounded-sm transition-all group/usermsg", isEditing ? "bg-code border border-panel-border shadow-lg" : "bg-badge border border-transparent shadow-xs hover:border-panel-border/30")} onClick={() => !isEditing && setIsEditing(true)}>
      {isEditing ? (
        <div className="space-y-2">
          <DynamicTextArea 
            autoFocus 
            onBlur={e => { if (e.relatedTarget !== btnRefs.all.current && e.relatedTarget !== btnRefs.chat.current) setIsEditing(false); }}
            onChange={e => setEditedText(e.target.value)}
            onKeyDown={e => {
                if (e.key === "Escape") setIsEditing(false);
                else if (e.key === "Enter" && e.metaKey && !checkpointManagerErrorMessage) handleRestore("taskAndWorkspace");
                else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRestore("task"); }
            }}
            ref={textAreaRef}
            className="w-full bg-input-background text-foreground border border-input-border rounded-xs p-2.5 text-[13px] font-sans resize-none outline-none focus:ring-1 focus:ring-focus shadow-inner"
            value={editedText}
          />
          <div className="flex justify-end gap-1.5 pt-1">
            {!checkpointManagerErrorMessage && <RestoreButton label="Restore All" onClick={() => handleRestore("taskAndWorkspace")} ref={btnRefs.all} secondary />}
            <RestoreButton label="Restore Chat" onClick={() => handleRestore("task")} ref={btnRefs.chat} />
          </div>
        </div>
      ) : (
        <div className="text-badge-foreground [&_p]:mb-0 [&_pre]:my-2">
            <MarkdownRenderer content={text || ""} compact />
        </div>
      )}
      {(images?.length! > 0 || files?.length! > 0) && <Thumbnails files={files ?? []} images={images ?? []} className="mt-2.5 opacity-90 scale-95 origin-left" />}
    </div>
  );
});

const RestoreButton = forwardRef<HTMLButtonElement, { label: string; onClick: () => void; secondary?: boolean }>(({ label, onClick, secondary }, ref) => (
  <button onClick={e => { e.stopPropagation(); onClick(); }} ref={ref} className={cn("px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all", secondary ? "bg-button-secondary-background text-button-secondary-foreground hover:bg-button-secondary-hover" : "bg-button-background text-button-foreground hover:bg-button-hover shadow-sm active:scale-95")}>
    {label}
  </button>
));

export default UserMessage;
