import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useClineAuth } from "@/context/ClineAuthContext";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { StateServiceClient } from "@/services/grpc-client";
import { ResetStateRequest } from "@shared/nice-grpc/cline/state.ts";
import {
  CheckCheck,
  FlaskConical,
  HardDriveDownload,
  Info,
  type LucideIcon,
  SlidersHorizontal,
  SquareMousePointer,
  SquareTerminal,
  Wrench,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { Tab, TabContent, TabList, TabTrigger } from "@/components/common/Tab";
import ViewHeader from "@/components/common/ViewHeader";
import SectionHeader from "./SectionHeader";
import AboutSection from "./sections/AboutSection";
import ApiConfigurationSection from "./sections/ApiConfigurationSection";
import BrowserSettingsSection from "./sections/BrowserSettingsSection";
import DebugSection from "./sections/DebugSection";
import FeatureSettingsSection from "./sections/FeatureSettingsSection";
import GeneralSettingsSection from "./sections/GeneralSettingsSection";
import { RemoteConfigSection } from "./sections/RemoteConfigSection";
import TerminalSettingsSection from "./sections/TerminalSettingsSection";
import { useSettingsNavigation } from "./hooks/useSettingsNavigation";
import { isAdminOrOwner } from "../account/helpers";

const IS_DEV = process.env.IS_DEV;

type SettingsTabID = "api-config"| "features"| "browser"| "terminal"| "general"| "about"| "debug"| "remote-config";

interface SettingsTab {
  id: SettingsTabID;
  name: string;
  tooltipText: string;
  headerText: string;
  icon: LucideIcon;
  hidden?: (params: { activeOrganization?: any }) => boolean;
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: "api-config", name: "API Config", tooltipText: "API Configuration", headerText: "API Configuration", icon: SlidersHorizontal },
  { id: "features", name: "Features", tooltipText: "Features", headerText: "Feature Settings", icon: CheckCheck },
  { id: "browser", name: "Browser", tooltipText: "Browser", headerText: "Browser Settings", icon: SquareMousePointer },
  { id: "terminal", name: "Terminal", tooltipText: "Terminal", headerText: "Terminal Settings", icon: SquareTerminal },
  { id: "general", name: "General", tooltipText: "General", headerText: "General Settings", icon: Wrench },
  { id: "remote-config", name: "Remote", tooltipText: "Remote Config", headerText: "Remote Config", icon: HardDriveDownload, 
    hidden: ({ activeOrganization }) => !activeOrganization || !isAdminOrOwner(activeOrganization) },
  { id: "about", name: "About", tooltipText: "About", headerText: "About", icon: Info },
  { id: "debug", name: "Debug", tooltipText: "Debug", headerText: "Debug", icon: FlaskConical, hidden: () => !IS_DEV },
];

const renderSectionHeader = (tabId: string) => {
  const tab = SETTINGS_TABS.find((t) => t.id === tabId);
  return tab ? (
    <SectionHeader>
      <div className="flex items-center gap-2">
        <tab.icon className="w-4" />
        <div>{tab.headerText}</div>
      </div>
    </SectionHeader>
  ) : null;
};

const SettingsView = ({ onDone, targetSection }: { onDone: () => void; targetSection?: string }) => {
  const { version, environment, settingsInitialModelTab } = useExtensionState();
  const { activeOrganization } = useClineAuth();
  const { activeTab, setActiveTab } = useSettingsNavigation(targetSection || SETTINGS_TABS[0].id, SETTINGS_TABS.map(t => t.id));

  const handleResetState = useCallback(async (global?: boolean) => {
    try { await StateServiceClient.resetState(ResetStateRequest.create({ global })); } catch (e) { console.error(e); }
  }, []);

  const ActiveContent = useMemo(() => {
    const ComponentMap: Record<string, React.ComponentType<any>> = {
      "api-config": ApiConfigurationSection,
      general: GeneralSettingsSection,
      features: FeatureSettingsSection,
      browser: BrowserSettingsSection,
      terminal: TerminalSettingsSection,
      "remote-config": RemoteConfigSection,
      about: AboutSection,
      debug: DebugSection
    };
    const Component = ComponentMap[activeTab];
    if (!Component) return null;

    const props: Record<string, any> = { renderSectionHeader };
    if (activeTab === "debug") props.onResetState = handleResetState;
    else if (activeTab === "about") props.version = version;
    else if (activeTab === "api-config") props.initialModelTab = settingsInitialModelTab;

    return <Component {...props} />;
  }, [activeTab, handleResetState, settingsInitialModelTab, version]);

  return (
    <Tab value={activeTab} onValueChange={setActiveTab}>
      <ViewHeader environment={environment} onDone={onDone} title="Settings" />
      <div className="flex flex-1 overflow-hidden">
        <TabList className="shrink-0 flex flex-col overflow-y-auto border-r border-accent/5">
          {SETTINGS_TABS.filter(t => !t.hidden?.({ activeOrganization })).map(tab => (
            <TabTrigger key={tab.id} value={tab.id}>
              <Tooltip>
                <TooltipTrigger>
                  <div className={cn("h-12 flex items-center border-l-2 border-transparent opacity-60 hover:opacity-100 hover:bg-white/5 p-4 transition-all gap-2", 
                      { "opacity-100 border-l-foreground bg-accent/5": activeTab === tab.id })}>
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:block text-xs font-medium">{tab.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{tab.tooltipText}</TooltipContent>
              </Tooltip>
            </TabTrigger>
          ))}
        </TabList>
        <TabContent value={activeTab}>{ActiveContent}</TabContent>
      </div>
    </Tab>
  );
};

export default SettingsView;
