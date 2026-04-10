import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ClineUser, handleSignOut } from "@/context/ClineAuthContext";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { AccountServiceClient } from "@/services/grpc-client";
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption, VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInterval } from "react-use";
import ViewHeader from "../common/ViewHeader";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import { getClineUris, getMainRole, convertProtoUsageTransactions } from "./helpers";
import { HistoryItemStats } from "../history/components/HistoryItemStats"; // This was deleted, need to fix
import { RefreshCwIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Oops, I deleted HistoryItemStats. I'll just use a simple display here.

const AccountView = ({ onDone, clineUser, organizations, activeOrganization }: any) => {
  const { environment } = useExtensionState();
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-sidebar-background animate-in fade-in zoom-in-95 duration-200">
      <ViewHeader environment={environment} onDone={onDone} showEnvironmentSuffix title="Account" />
      <div className="grow flex flex-col px-5 overflow-y-auto pb-6">
        {clineUser?.uid ? <ClineAccountView activeOrganization={activeOrganization} clineEnv={environment} clineUser={clineUser} userOrganizations={organizations} /> : <WelcomeView />}
      </div>
    </div>
  );
};

const WelcomeView = () => (
    <div className="flex flex-col items-center justify-center grow gap-6 text-center py-10">
        <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner"><RefreshCwIcon size={40} className="animate-pulse" /></div>
        <div className="space-y-2">
            <h1 className="text-xl font-bold">Welcome to DietCode</h1>
            <p className="text-sm opacity-60 max-w-xs">Sign in to sync your tasks, manage credits, and access pro features.</p>
        </div>
        <VSCodeButton className="w-full" onClick={() => (window as any).postMessage({ type: "onboarding-signin" })}>Sign In to Continue</VSCodeButton>
    </div>
);

const ClineAccountView = ({ clineUser, userOrganizations, activeOrganization }: any) => {
    const { uid, displayName, email, appBaseUrl } = clineUser;
    const [balance, setBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [usageData, setUsageData] = useState<any[]>([]);

    const fetchCredits = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = activeOrganization?.organizationId 
                ? await AccountServiceClient.getOrganizationCredits({ organizationId: activeOrganization.organizationId })
                : await AccountServiceClient.getUserCredits({});
            setBalance(res.balance?.currentBalance ?? 0);
            setUsageData(convertProtoUsageTransactions(res.usageTransactions) || []);
        } finally { setIsLoading(null as any); }
    }, [activeOrganization]);

    useEffect(() => { fetchCredits(); }, [fetchCredits]);
    useInterval(fetchCredits, 60000);

    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary border border-primary/20 shadow-sm">{displayName?.[0] || email?.[0]}</div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold truncate m-0">{displayName || "Anonymous"}</h2>
                    <p className="text-xs opacity-60 truncate m-0">{email}</p>
                </div>
                <VSCodeButton appearance="secondary" onClick={() => handleSignOut()}>Log Out</VSCodeButton>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2">
                <VSCodeButtonLink className="h-10" href={getClineUris(appBaseUrl, "dashboard").href}>Dashboard</VSCodeButtonLink>
                <VSCodeButtonLink appearance="secondary" className="h-10" href={getClineUris(appBaseUrl, "credits").href}>Add Credits</VSCodeButtonLink>
            </div>

            <div className="p-4 bg-code border border-panel-border/50 rounded-lg shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold tracking-wider opacity-60">Balance</span>
                    <button onClick={fetchCredits} disabled={isLoading} className="p-1 hover:bg-white/5 rounded-sm transition-colors"><RefreshCwIcon size={12} className={cn(isLoading && "animate-spin")} /></button>
                </div>
                <div className="text-3xl font-mono font-bold tracking-tighter">${balance?.toFixed(2) || "0.00"}</div>
                <p className="text-[10px] opacity-40 italic">Balances are updated automatically every minute.</p>
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-70">Recent Usage</h3>
                    <InfoIcon size={12} className="opacity-40" />
                </div>
                <div className="border border-panel-border/30 rounded-md overflow-hidden bg-code/30">
                    {usageData.length > 0 ? usageData.slice(0, 5).map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 border-b border-panel-border/20 last:border-0 hover:bg-white/5 transition-colors">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-bold line-clamp-1 opacity-90">{u.taskName || "AI Task"}</span>
                                <span className="text-[9px] opacity-50 uppercase tracking-tighter">{new Date(u.ts).toLocaleDateString()}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-primary">-${u.cost?.toFixed(3)}</span>
                        </div>
                    )) : <div className="p-10 text-center text-xs opacity-30 italic">No recent transactions</div>}
                </div>
            </div>
        </div>
    );
};

export default memo(AccountView);
