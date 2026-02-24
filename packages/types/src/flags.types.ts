/**
 * All feature flag keys. Keep in sync with CLAUDE.md §5.3.
 * When adding a new flag:
 * 1. Add the key here
 * 2. Add it to flags.default.json and flags.test.json in packages/feature-flags
 * 3. Add row to the registry table in CLAUDE.md §5.3
 */
export type FeatureFlagKey =
  // Image generation
  | 'image.text_generation.enabled'
  | 'image.img2img.enabled'
  | 'image.batch_generation.enabled'
  | 'image.upscaling.enabled'
  | 'image.inpainting.enabled'
  | 'image.video_generation.enabled'
  // AI
  | 'ai.model_selector.enabled'
  | 'ai.style_presets.enabled'
  | 'ai.safety_check.enabled'
  // UI
  | 'ui.dark_mode.enabled'
  | 'ui.new_dashboard.enabled'
  // Payments
  | 'payments.stripe.enabled'
  | 'payments.credits.enabled'
  // User
  | 'user.social_profiles.enabled'
  | 'user.teams.enabled'
  | 'user.api_access.enabled'
  // Admin
  | 'admin.dashboard.enabled';

export type FlagValue = boolean | string | number;

export type FlagRegistry = Record<FeatureFlagKey, FlagValue>;
