import PopoverButton from "@/components/common/PopoverButton.tsx";
import ServersToggleList from "@/components/mcp/configuration/tabs/installed/ServersToggleList";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import { EmptyRequest } from "@shared/nice-grpc/cline/common";
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion";
import type React from "react";
import { useCallback } from "react";

const ServersToggleModal: React.FC = () => {
  const { mcpServers, navigateToMcp, setMcpServers } = useExtensionState();

  const handleOpen = useCallback(() => {
    McpServiceClient.getLatestMcpServers(EmptyRequest.create({}))
      .then((response) => {
        if (response.mcpServers) {
          setMcpServers(convertProtoMcpServersToMcpServers(response.mcpServers));
        }
      })
      .catch((error) => console.error("Failed to fetch MCP servers:", error));
  }, [setMcpServers]);

  return (
    <PopoverButton
      headerAction={{ icon: "gear", onClick: () => navigateToMcp("configure") }}
      icon="server"
      onOpen={handleOpen}
      title="MCP Servers"
      tooltip="Manage MCP Servers"
    >
      <ServersToggleList hasTrashIcon={false} isExpandable={false} listGap="small" servers={mcpServers} />
    </PopoverButton>
  );
};
