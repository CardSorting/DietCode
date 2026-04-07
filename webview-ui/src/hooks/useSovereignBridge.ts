import { useCallback, useEffect } from 'react';
import { vscode } from '../vscode';
import type { WebViewMessageType, WebViewRequestType } from '../types/WebViewMessageProtocol';
import type { WebViewMessage, WebViewRequest } from '../types/WebViewMessageProtocol';

/**
 * Generate a unique correlation ID for IPC messages.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Sovereign Bridge Hook
 * 
 * Provides hardened, typed communication with the DietCode backend.
 * Handles automatic cleanup and consistent ID generation.
 */
export function useSovereignBridge() {
  
  /**
   * Post a typed request to the backend.
   */
  const postRequest = useCallback((type: WebViewRequestType, payload: any = {}) => {
    const request: WebViewRequest = {
      id: generateId(),
      type,
      payload,
      metadata: { timestamp: Date.now() }
    }; 
    
    vscode.postMessage(request);
    return request.id;
  }, []);

  /**
   * Listen for specific message types from the backend.
   */
  const useMessageListener = useCallback((
    type: WebViewMessageType, 
    handler: (payload: any, id: string) => void
  ) => {
    useEffect(() => {
      const listener = (event: MessageEvent<WebViewMessage>) => {
        const message = event.data;
        if (message.type === type) {
          handler(message.payload, message.id);
        }
      };

      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }, [type, handler]);
  }, []);

  /**
   * Specialized request-response pattern.
   * Note: This is an async-style wrapper for one-off requests.
   */
  const requestWithResponse = useCallback(async <T>(
    type: WebViewRequestType, 
    responseType: WebViewMessageType,
    payload: any = {},
    timeoutMs = 5000
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const requestId = generateId();

      const listener = (event: MessageEvent<WebViewMessage>) => {
        const message = event.data;
        // Verify both type AND correlation ID for production-grade reliability
        if (message.type === responseType && message.id === requestId) {
          clearTimeout(timer);
          window.removeEventListener('message', listener);
          resolve(message.payload as T);
        }
      };

      const timer = setTimeout(() => {
        window.removeEventListener('message', listener);
        reject(new Error(`Bridge timeout: ${type} -> ${responseType} (ID: ${requestId}) after ${timeoutMs}ms`));
      }, timeoutMs);

      window.addEventListener('message', listener);
      
      vscode.postMessage({
        id: requestId,
        type,
        payload,
        metadata: { timestamp: Date.now() }
      } as any);
    });
  }, []);

  return {
    postRequest,
    useMessageListener,
    requestWithResponse,
    generateId
  };
}
