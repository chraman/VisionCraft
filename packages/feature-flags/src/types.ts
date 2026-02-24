import type { FeatureFlagKey, FlagValue, UserTier } from '@ai-platform/types';

export type { FeatureFlagKey, FlagValue };

export interface FlagContext {
  userId?: string;
  tier?: UserTier;
  email?: string;
}
