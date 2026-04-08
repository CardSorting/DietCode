/**
 * Copyright (c) 2026 DietCode Contributors
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { WebViewRequest } from './types/WebViewMessageProtocol';

/**
 * Strict type definition for VS Code API exposed to WebViews.
 * Matches the TypeScript definitions from VS Code extension APIs.
 */
interface IVSCodeApi {
  // Window messaging
  postMessage<T = unknown>(message: T): void;
  
  // State management
  getState<T = unknown>(): T | undefined;
  setState<T>(state: T): void;
  
  // Storage events
  onDidChangeStorage(callback: (event: unknown) => void): void;
  
  // Extensions
  getConfiguration(section: string): unknown;
  getExtension(id: string): unknown;
  
  // Telemetry
  logTelemetry(eventName: string, data: unknown): void;
}

/**
 * Type guard to verify if acquireVsCodeApi exists and returns a valid API
 */
function acquireVsCodeApi(): IVSCodeApi | undefined {
  if (typeof acquireVsCodeApi !== 'function') {
    return undefined;
  }
  
  try {
    return acquireVsCodeApi();
  } catch (error) {
    console.warn('Failed to acquire VS Code API:', error);
    return undefined;
  }
}

/**
 * Wrapper for the VS Code API exposed to WebViews.
 * Provides strict typing and graceful degradation when API is unavailable.
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: IVSCodeApi | undefined;

  constructor() {
    this.vsCodeApi = acquireVsCodeApi();
  }

  public postMessage(message: WebViewRequest): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
      return;
    }
    
    // Development fallback
    console.log('Would post message to VS Code (dev mode):', message);
  }

  public getState<T = unknown>(): T | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState<T>();
    }
    
    // Development fallback to localStorage
    const state = localStorage.getItem('vscodeState');
    if (!state) return undefined;
    
    try {
      return JSON.parse(state) as T;
    } catch (error) {
      console.warn('Failed to parse vscode state:', error);
      return undefined;
    }
  }

  public setState<T>(newState: T): void {
    if (this.vsCodeApi) {
      this.vsCodeApi.setState(newState);
      return;
    }
    
    // Development fallback to localStorage
    try {
      localStorage.setItem('vscodeState', JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save vscode state:', error);
    }
  }
}

export const vscode = new VSCodeAPIWrapper();
