import type React from "react";
import type { ClineMessage, ClineAskUseMcpServer } from "@shared/ExtensionMessage";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import { findMatchingResourceOrTemplate } from "@/utils/mcp";

interface McpServerRowProps {
	message: ClineMessage;
	mcpServers: any[];
	mcpMarketplaceCatalog: any;
}

export const McpServerRow: React.FC<McpServerRowProps> = ({
	message,
	mcpServers,
	mcpMarketplaceCatalog,
}) => {
	const mcpServerUse = JSON.parse(message.text || "{}") as ClineAskUseMcpServer;
	const server = mcpServers.find((s) => s.name === mcpServerUse.serverName);

	return (
		<div className="bg-code border border-editor-group-border overflow-hidden rounded-xs flex flex-col gap-2 p-2 mt-[-4px]">
			{mcpServerUse.type === "use_mcp_tool" ? (
				<McpToolRow
					alwaysExpanded
					mcpMarketplaceCatalog={mcpMarketplaceCatalog}
					mcpServers={mcpServers}
					server={server}
					toolName={mcpServerUse.toolName!}
				/>
			) : (
				<McpResourceRow
					alwaysExpanded
					mcpMarketplaceCatalog={mcpMarketplaceCatalog}
					mcpServers={mcpServers}
					resource={findMatchingResourceOrTemplate(
						server?.resources ?? [],
						server?.resourceTemplates ?? [],
						mcpServerUse.uri!,
					)}
					server={server}
				/>
			)}
		</div>
	);
};

export default McpServerRow;
