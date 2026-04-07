import * as vscode from 'vscode';
import { SovereignWebViewProvider } from './ui/provider/SovereignWebViewProvider';

/**
 * [LAYER: INFRASTRUCTURE / VSCODE]
 * Extension entry point.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('DietCode "Sovereign Hive" Extension Activated');

    const provider = new SovereignWebViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SovereignWebViewProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('dietcode.openWebView', () => {
            vscode.commands.executeCommand('workbench.view.extension.dietcode-explorer');
        })
    );
}

export function deactivate() {}
