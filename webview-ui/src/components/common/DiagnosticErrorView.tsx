import React from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { AlertCircle, RefreshCw, Terminal, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosticErrorViewProps {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onReset?: () => void;
  title?: string;
  className?: string;
}

/**
 * A diagnostic view shown when a major component crashes.
 * Provides error details and recovery actions.
 */
export const DiagnosticErrorView: React.FC<DiagnosticErrorViewProps> = ({
  error,
  errorInfo,
  onReset,
  title = "Infrastructure Alert: Render Failure",
  className,
}) => {
  const handleReload = () => {
    if (onReset) {
      onReset();
    } else {
      // Send message to extension host to reload webview
      window.postMessage({ type: "reload_webview" }, "*");
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 bg-background h-full text-foreground space-y-6", className)}>
      <div className="flex flex-col items-center space-y-4 max-w-lg text-center">
        <div className="p-4 bg-destructive/10 rounded-full">
          <AlertCircle className="w-12 h-12 text-destructive animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        
        <p className="text-muted-foreground">
          The webview encountered an unexpected error that prevented it from rendering correctly. 
          This might be due to a state mismatch or an infrastructure regression.
        </p>
      </div>

      <div className="w-full max-w-2xl bg-secondary/30 rounded-lg border border-accent/20 overflow-hidden shadow-inner">
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-bottom border-accent/10">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono font-bold opacity-70 uppercase tracking-widest">Diagnostic Details</span>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Exception</span>
            <code className="text-sm text-destructive break-all font-mono bg-destructive/5 p-2 rounded block">
              {error?.name}: {error?.message || "Unknown error"}
            </code>
          </div>

          {(errorInfo || error?.stack) && (
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Stack Trace Summary</span>
              <pre className="text-[10px] text-muted-foreground overflow-auto max-h-40 p-2 bg-black/20 rounded font-mono leading-relaxed">
                {errorInfo?.componentStack || error?.stack || "No additional trace available"}
              </pre>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-primary/5 flex items-start gap-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong>Pro Tip:</strong> Reloading usually solves transient issues. If the issue persists, 
            try resetting your application state or checking the Extension Host logs.
          </p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <VSCodeButton appearance="primary" onClick={handleReload} className="min-w-[140px]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Reload UI</span>
          </div>
        </VSCodeButton>
      </div>
    </div>
  );
};

export default DiagnosticErrorView;
