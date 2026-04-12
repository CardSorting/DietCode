export interface GrpcRequest {
  service: string;
  method: string;
  request_id: string;
  is_streaming?: boolean;
  request_json?: string;
  apiConfiguration?: unknown;
  payload?: unknown;
  [key: string]: unknown;
}

export interface IHandler {
  handle(method: string, request: GrpcRequest): Promise<void>;
}

export type SendResponse = (request_id: string, payload: unknown, is_streaming?: boolean) => void;
