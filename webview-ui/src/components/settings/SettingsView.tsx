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
import { isDev } from "@/utils/env";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const IS_DEV = isDev();

type SettingsTabID = 
  | "api-config"
  | "features" 
  | "browser" 
  | "terminal" 
  | "general" 
  | "remote-config"
  | "about" 
  | "debug";

interface SettingsTab {
  id: SettingsTabID;
  name: string;
  tooltipText: string;
  headerText: string;
  icon: LucideIcon;
  hidden?: (params: { activeOrganization?: UserInfo }) => boolean;
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

const renderSectionHeader = (tabId: SettingsTabID) => {
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
  const { version, environment, settingsInitialModelTab, apiConfiguration } = useExtensionState();
  const { activeOrganization } = useClineAuth();
  const { activeTab, setActiveTab } = useSettingsNavigation(targetSection || SETTINGS_TABS[0].id, SETTINGS_TABS.map(t => t.id));

  const handleResetState = useCallback(() => {
    // Logic for resetting settings state if needed
  }, []);

  const ActiveContent = useMemo(() => {
    const ComponentMap: Record<SettingsTabID, React.ComponentType<any>> = {
      "api-config": ApiConfigurationSection,
      "features": FeatureSettingsSection,
      "browser": BrowserSettingsSection,
      "terminal": TerminalSettingsSection,
      "general": GeneralSettingsSection,
      "remote-config": RemoteConfigSection,
      "about": AboutSection,
      "debug": DebugSection,
    };

    const Component = ComponentMap[activeTab];
    if (!Component) return <div className="p-4 text-muted-foreground uppercase text-xs font-mono">No component found for tab: {activeTab}</div>;

    const props = {
      apiConfiguration,
      version,
      environment,
      settingsInitialModelTab,
      onReset: handleResetState,
      renderSectionHeader: () => renderSectionHeader(activeTab)
    };

    return <Component {...props} />;
  }, [activeTab, apiConfiguration, environment, handleResetState, settingsInitialModelTab, version]);

  console.log(`[DietCode:Settings] Rendering tab: ${activeTab}`);

  return (
    <Tab value={activeTab} onValueChange={setActiveTab}>
      <ViewHeader environment={environment} onDone={onDone} title="Settings" />
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Navigation Sidebar */}
        <TabList className="shrink-0 flex flex-col items-stretch overflow-y-auto border-r border-accent/10 p-2 bg-secondary/10 w-[200px] h-full">
          {SETTINGS_TABS.filter(t => !t.hidden?.({ activeOrganization })).map(tab => (
            <TabTrigger 
              key={tab.id} 
              value={tab.id} 
              className="group flex items-center gap-3 w-full px-4 py-3 my-0.5 rounded-md transition-all text-left justify-start hover:bg-accent/5 data-[state=active]:bg-accent/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <div className="flex shrink-0 items-center justify-center p-1.5 rounded-sm bg-accent/5 group-data-[state=active]:bg-primary/20 transition-colors">
                <tab.icon className="w-4 h-4 text-foreground/70 group-data-[state=active]:text-foreground transition-colors" />
              </div>
              <span className="text-sm font-medium truncate">{tab.name}</span>
            </TabTrigger>
          ))}
        </TabList>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-background h-full">
          <ErrorBoundary name={`Settings:${activeTab}`} title="Section Render Failure">
            <TabContent value={activeTab} className="p-8 max-w-4xl mx-auto min-h-full">
               {ActiveContent}
            </TabContent>
          </ErrorBoundary>
        </div>
      </div>
    </Tab>
  );
};

export default SettingsView;
