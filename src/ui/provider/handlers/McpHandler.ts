import { McpDiscoveryService } from '../../../infrastructure/capabilities/McpDiscoveryService';
import type { GrpcRequest, IHandler, SendResponse } from './types';

export class McpHandler implements IHandler {
  constructor(private sendResponse: SendResponse) {}

  async handle(method: string, request: GrpcRequest): Promise<void> {
    const mcpService = McpDiscoveryService.getInstance();
    switch (method) {
      case 'toggleMcpServer': {
        const { name, enabled } = JSON.parse(request.request_json || '{}');
        const server = mcpService.getServers().find((s) => s.name === name);
        if (server) {
          await mcpService.toggleServer(server.id, enabled);
        }
        this.sendResponse(request.request_id, {});
        break;
      }
      case 'subscribeToMcpMarketplaceCatalog': {
        const catalog = mcpService.getCatalog();
        this.sendResponse(request.request_id, { items: catalog }, true);
        break;
      }
      default:
        this.sendResponse(request.request_id, {});
    }
  }
}
