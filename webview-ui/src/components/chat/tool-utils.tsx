import type { ReactNode } from "react"; 
import { 
    FileCode2Icon, 
    ImageUpIcon, 
    SearchIcon, 
    TerminalIcon, 
    GlobeIcon, 
    WrenchIcon,
    FolderTreeIcon,
    Trash2Icon,
    FilePlus2Icon
} from "lucide-react";
import type { ClineSayTool } from "@shared/ExtensionMessage";

export interface ToolMetadata {
    icon: ReactNode;
    title: string;
    shouldShowWorkspaceWarning?: boolean;
}

export const getToolMetadata = (tool: ClineSayTool, messageType?: string): ToolMetadata => {
    const isAsk = messageType === "ask";
    
    switch (tool.tool) {
        case "editedExistingFile":
            return {
                icon: <FileCode2Icon className="size-3" />,
                title: isAsk ? "DietCode wants to edit this file:" : "DietCode edited this file:",
                shouldShowWorkspaceWarning: true
            };
        case "newFileCreated":
            return {
                icon: <FilePlus2Icon className="size-3" />,
                title: isAsk ? "DietCode wants to create a new file:" : "DietCode created a new file:",
                shouldShowWorkspaceWarning: true
            };
        case "fileDeleted":
            return {
                icon: <Trash2Icon className="size-3" />,
                title: isAsk ? "DietCode wants to delete this file:" : "DietCode deleted this file:",
                shouldShowWorkspaceWarning: true
            };
        case "readFile":
            return {
                icon: <FileCode2Icon className="size-3" />,
                title: isAsk ? "DietCode wants to read this file:" : "DietCode read this file:",
                shouldShowWorkspaceWarning: true
            };
        case "searchFiles":
            return {
                icon: <SearchIcon className="size-3" />,
                title: isAsk ? "DietCode wants to search files:" : "DietCode searched files:",
                shouldShowWorkspaceWarning: true
            };
        case "listFilesTopLevel":
        case "listFilesRecursive":
            return {
                icon: <FolderTreeIcon className="size-3" />,
                title: isAsk ? "DietCode wants to list files:" : "DietCode listed files:",
                shouldShowWorkspaceWarning: true
            };
        case "executeCommand":
            return {
                icon: <TerminalIcon className="size-3" />,
                title: isAsk ? "DietCode wants to execute this command:" : "DietCode executed this command:",
            };
        case "webSearch":
        case "webFetch":
            return {
                icon: <GlobeIcon className="size-3" />,
                title: isAsk ? "DietCode wants to access the web:" : "DietCode accessed the web:",
            };
        default:
            return {
                icon: <WrenchIcon className="size-3" />,
                title: "DietCode is using a tool:",
            };
    }
};
