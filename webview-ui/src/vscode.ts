import type { WebViewRequest } from './types/WebViewMessageProtocol';

declare function acquireVsCodeApi(): any;

/**
 * Wrapper for the VS Code API exposed to WebViews.
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: any;

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  public postMessage(message: WebViewRequest) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
      return;
    }
    console.log('Would post message to VS Code:', message);
  }

  public getState(): any {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    }
    const state = localStorage.getItem('vscodeState');
    return state ? JSON.parse(state) : undefined;
  }

  public setState<T>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    }
    localStorage.setItem('vscodeState', JSON.stringify(newState));
    return newState;
  }
}

export const vscode = new VSCodeAPIWrapper();
