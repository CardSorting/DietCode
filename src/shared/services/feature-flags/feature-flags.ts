export type FeatureFlagPayload = string | boolean | number | object | undefined;

export enum FeatureFlag {
  WEBTOOLS = "webtools",
  WORKTREES = "worktree-exp",
}

export const FeatureFlagDefaultValue: Partial<Record<FeatureFlag, FeatureFlagPayload>> = {
  [FeatureFlag.WEBTOOLS]: false,
  [FeatureFlag.WORKTREES]: false,
};

export const FEATURE_FLAGS = Object.values(FeatureFlag);
