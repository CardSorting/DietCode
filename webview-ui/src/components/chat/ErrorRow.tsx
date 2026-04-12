import { memo } from "react";
import type { SovereignMessage } from "@shared/ExtensionMessage.ts";
import { ClineError, ClineErrorType } from "@services/error/ClineError";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import VSCodeButtonLink from "@/components/common/VSCodeButtonLink";

interface ErrorRowProps {
  message: SovereignMessage;
  apiRequestFailedMessage?: string;
  apiReqStreamingFailedMessage?: string;
}

const ErrorRow = memo(({ message, apiRequestFailedMessage, apiReqStreamingFailedMessage }: ErrorRowProps) => {
  const rawApiError = apiRequestFailedMessage || apiReqStreamingFailedMessage;

  if (rawApiError) {
    const error = ClineError.parse(rawApiError);
    const msg = error?._error?.message || error?.message || rawApiError;
    const providerId = error?.providerId || error?._error?.providerId;

    if (error?.isErrorType(ClineErrorType.Balance)) {
        const d = error._error?.details;
        return (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-3 font-mono text-xs">
                <div className="text-destructive font-bold">{d?.message || "Out of credits"}</div>
                {d?.current_balance != null && <div>Balance: <b>{d.current_balance.toFixed(2)}</b></div>}
                <VSCodeButtonLink className="w-full h-8" href={d?.buy_credits_url || "https://app.cline.bot"}>Buy Credits</VSCodeButtonLink>
            </div>
        );
    }



    return (
        <div className="flex flex-col gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive">
            <header className="font-bold flex items-center gap-1">
                {providerId && <span className="opacity-50 text-[10px] uppercase">[{providerId}]</span>}
                {msg}
            </header>
            {msg !== rawApiError && <div className="text-xs opacity-70 break-all">{rawApiError}</div>}
            <div className="text-[10px] opacity-50 mt-1 italic">Click "Retry" below to try again</div>
        </div>
    );
  }

  return (
    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive font-medium italic">
        {message.text || "An unknown error occurred"}
    </div>
  );
});

export default ErrorRow;
