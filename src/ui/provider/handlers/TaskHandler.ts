import { TaskHistoryManager } from '../../../core/task/TaskHistoryManager';
import type { GrpcRequest, IHandler, SendResponse } from './types';

export class TaskHandler implements IHandler {
  constructor(private sendResponse: SendResponse) {}

  async handle(method: string, request: GrpcRequest): Promise<void> {
    const historyManager = TaskHistoryManager.getInstance();
    switch (method) {
      case 'getTaskHistory': {
        const history = await historyManager.getHistory();
        this.sendResponse(request.request_id, {
          history: history.map((h) => ({
            id: h.id,
            ts: h.timestamp,
            task: h.payload.summary,
            tokensIn: 0,
            tokensOut: 0,
            cacheWrites: 0,
            cacheReads: 0,
            totalCost: 0,
          })),
        });
        break;
      }
      default:
        this.sendResponse(request.request_id, {});
    }
  }
}
