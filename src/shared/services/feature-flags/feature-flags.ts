export type FeatureFlagPayload = string | boolean | number | object | undefined;

export enum FeatureFlag {
  WEBTOOLS = "webtools",
  WORKTREES = "worktree-exp",
  REMOTE_BANNERS = "remote-banners",
  REMOTE_WELCOME_BANNERS = "remote-welcome-banners",
  EXTENSION_REMOTE_BANNERS_TTL = "remote-banners-ttl",
}

export const FeatureFlagDefaultValue: Partial<Record<FeatureFlag, FeatureFlagPayload>> = {
  [FeatureFlag.WEBTOOLS]: false,
  [FeatureFlag.WORKTREES]: false,
};

export const FEATURE_FLAGS = Object.values(FeatureFlag);
