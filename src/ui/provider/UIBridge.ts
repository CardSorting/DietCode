import { EventEmitter } from 'node:events';

/**
 * [LAYER: INFRASTRUCTURE / UI]
 * Central bridge for backend services to communicate with the VS Code Webview.
 * Provides a Promise-based interface for synchronous core services to await user input.
 */
export class UIBridge extends EventEmitter {
    private static instance: UIBridge;
    private pendingApprovals: Map<string, (approved: boolean) => void> = new Map();

    private constructor() {
        super();
        this.setMaxListeners(50);
    }

    public static getInstance(): UIBridge {
        if (!UIBridge.instance) {
            UIBridge.instance = new UIBridge();
        }
        return UIBridge.instance;
    }

    /**
     * Request approval from the user via the Webview.
     * Blocks until the user clicks Approve/Reject in the sidebar.
     */
    public async requestUserApproval(id: string, detail: any): Promise<boolean> {
        return new Promise((resolve) => {
            this.pendingApprovals.set(id, resolve);
            
            // Emit to SovereignWebViewProvider (which will post to Webview)
            this.emit('request_approval', { id, detail });

            // Timeout after 10 minutes to prevent hanging
            setTimeout(() => {
                if (this.pendingApprovals.has(id)) {
                    this.resolveApproval(id, false);
                }
            }, 10 * 60 * 1000);
        });
    }

    /**
     * Called by SovereignWebViewProvider when the user responds.
     */
    public resolveApproval(id: string, approved: boolean) {
        const resolver = this.pendingApprovals.get(id);
        if (resolver) {
            resolver(approved);
            this.pendingApprovals.delete(id);
        }
    }

    /**
     * Send a generic message to the Webview (logs, state, etc.)
     */
    public notify(type: string, payload: any) {
        this.emit('notify', { type, payload });
    }
}
