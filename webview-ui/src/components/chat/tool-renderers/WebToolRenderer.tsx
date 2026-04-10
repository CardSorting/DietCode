import type React from "react";
import { UiServiceClient } from "@/services/grpc-client";
import { StringRequest } from "@shared/nice-grpc/cline/common.ts";
import type { ClineSayTool } from "@shared/ExtensionMessage";
import { ToolRowWrapper } from "../ToolRowWrapper";

interface WebToolRendererProps {
  tool: ClineSayTool;
  messageType?: "ask" | "say";
}

/**
 * Renders web search and fetch tool calls.
 * Integrated with ToolRowWrapper for consistent headers.
 */
export const WebToolRenderer: React.FC<WebToolRendererProps> = ({ tool, messageType }) => {
  const handleOpenUrl = () => {
    if (tool.path) {
      UiServiceClient.openUrl(StringRequest.create({ value: tool.path })).catch((err) => {
        console.error("Failed to open URL:", err);
      });
    }
  };

  const renderContent = () => {
    if (tool.tool === "webFetch") {
      return (
        <button
          className="bg-code rounded-xs overflow-hidden border border-editor-group-border py-2 px-2.5 cursor-pointer select-none w-full text-left"
          onClick={handleOpenUrl}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleOpenUrl();
          }}
          type="button"
        >
          <span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 [direction:rtl] text-left text-link underline">
            {`${tool.path}\u200E`}
          </span>
        </button>
      );
    }

    return (
      <div className="bg-code border border-editor-group-border overflow-hidden rounded-xs select-text py-[9px] px-2.5">
        <span className="ph-no-capture whitespace-nowrap overflow-hidden text-ellipsis mr-2 text-left [direction:rtl]">
          {`${tool.path}\u200E`}
        </span>
      </div>
    );
  };

  return (
    <ToolRowWrapper messageType={messageType} tool={tool}>
      {renderContent()}
    </ToolRowWrapper>
  );
};

export default WebToolRenderer;

export default WebToolRenderer;
