import { useMemo, useCallback } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useClineAuth } from "@/context/ClineAuthContext";
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers";
import { UiServiceClient, AccountServiceClient, StateServiceClient } from "@/services/grpc-client";
import { BANNER_DATA, BannerActionType, type BannerAction, type BannerCardData } from "@shared/cline/banner.ts";
import { convertBannerData } from "@/utils/bannerUtils";
import { getCurrentPlatform } from "@/utils/platformUtils";

export const useBannerData = () => {
    const {
        lastDismissedInfoBannerVersion,
        lastDismissedCliBannerVersion,
        lastDismissedModelBannerVersion,
        dismissedBanners,
        openRouterModels,
        banners,
        navigateToSettings,
        navigateToSettingsModelPicker,
    } = useExtensionState();

    const { clineUser } = useClineAuth();
    const { handleFieldsChange } = useApiConfigurationHandlers();

    const isBannerDismissed = useCallback(
        (bannerId: string): boolean => {
            if (dismissedBanners?.some((d: any) => d.bannerId === bannerId)) return true;
            if (bannerId.startsWith("info-banner")) return (lastDismissedInfoBannerVersion ?? 0) >= 1;
            if (bannerId.startsWith("new-model")) return (lastDismissedModelBannerVersion ?? 0) >= 1;
            if (bannerId.startsWith("cli-")) return (lastDismissedCliBannerVersion ?? 0) >= 1;
            return false;
        },
        [dismissedBanners, lastDismissedInfoBannerVersion, lastDismissedModelBannerVersion, lastDismissedCliBannerVersion]
    );

    const bannerConfig = useMemo((): BannerCardData[] => {
        return BANNER_DATA.filter((banner) => {
            if (isBannerDismissed(banner.id)) return false;
            if (banner.isClineUserOnly !== undefined && banner.isClineUserOnly !== !!clineUser) return false;
            if (banner.platforms && !banner.platforms.includes(getCurrentPlatform())) return false;
            return true;
        });
    }, [isBannerDismissed, clineUser]);

    const handleBannerAction = useCallback(
        (action: BannerAction) => {
            switch (action.action) {
                case BannerActionType.Link:
                    if (action.arg) UiServiceClient.openUrl({ value: action.arg }).catch(console.error);
                    break;
                case BannerActionType.SetModel: {
                    const modelId = action.arg || "anthropic/claude-sonnet-4.5";
                    const initialModelTab = action.tab || "recommended";
                    handleFieldsChange({
                        planModeOpenRouterModelId: modelId,
                        actModeOpenRouterModelId: modelId,
                        planModeOpenRouterModelInfo: openRouterModels[modelId],
                        actModeOpenRouterModelInfo: openRouterModels[modelId],
                        planModeApiProvider: "cline",
                        actModeApiProvider: "cline",
                    });
                    navigateToSettingsModelPicker({ targetSection: "api-config", initialModelTab });
                    break;
                }
                case BannerActionType.ShowAccount:
                    AccountServiceClient.accountLoginClicked({}).catch(console.error);
                    break;
                case BannerActionType.ShowApiSettings:
                    if (action.arg) handleFieldsChange({ planModeApiProvider: action.arg as any, actModeApiProvider: action.arg as any });
                    navigateToSettings("api-config");
                    break;
                case BannerActionType.ShowFeatureSettings:
                    navigateToSettings("features");
                    break;
                case BannerActionType.InstallCli:
                    StateServiceClient.installClineCli({}).catch(console.error);
                    break;
            }
        },
        [handleFieldsChange, openRouterModels, navigateToSettings, navigateToSettingsModelPicker]
    );

    const handleBannerDismiss = useCallback((bannerId: string) => {
        if (bannerId.startsWith("info-banner")) {
            StateServiceClient.updateInfoBannerVersion({ value: 1 }).catch(console.error);
        } else if (bannerId.startsWith("new-model")) {
            StateServiceClient.updateModelBannerVersion({ value: 1 }).catch(console.error);
        } else if (bannerId.startsWith("cli-")) {
            StateServiceClient.updateCliBannerVersion({ value: 1 }).catch(console.error);
        } else {
            StateServiceClient.dismissBanner({ value: bannerId }).catch(console.error);
        }
    }, []);

    const activeBanners = useMemo(() => {
        const hardcoded = bannerConfig.map((b) => convertBannerData(b, { onAction: handleBannerAction, onDismiss: handleBannerDismiss }));
        const dynamic = (banners ?? []).map((b) => convertBannerData(b, { onAction: handleBannerAction, onDismiss: handleBannerDismiss }));
        return [...dynamic, ...hardcoded];
    }, [bannerConfig, banners, handleBannerAction, handleBannerDismiss]);

    return { activeBanners };
};
