import { useMemo } from 'react';
import type { FeatureFlagKey, FlagValue } from '@ai-platform/types';
import { FlagClient } from './client.js';
import type { FlagContext } from './types.js';

// Client-side singleton for the React app
const clientFlagClient = new FlagClient();

/**
 * Check whether a single feature flag is enabled.
 *
 * @example
 * const isImg2ImgEnabled = useFlag('image.img2img.enabled');
 * {isImg2ImgEnabled && <GenerateByImageTab />}
 */
export function useFlag(key: FeatureFlagKey, context?: FlagContext): boolean {
  return useMemo(
    () => clientFlagClient.isEnabled(key, context),
    [key, context?.userId, context?.tier] // intentionally use specific context fields to avoid referential inequality
  );
}

/**
 * Get the raw value of a single flag.
 */
export function useFlagValue(key: FeatureFlagKey, context?: FlagContext): FlagValue {
  return useMemo(
    () => clientFlagClient.getValue(key, context),
    [key, context?.userId, context?.tier] // intentionally use specific context fields to avoid referential inequality
  );
}

/**
 * Get multiple flags at once.
 *
 * @example
 * const { 'ui.dark_mode.enabled': darkMode } = useFlags(['ui.dark_mode.enabled']);
 */
export function useFlags(keys: FeatureFlagKey[], context?: FlagContext): Record<string, FlagValue> {
  return useMemo(() => {
    return Object.fromEntries(keys.map((key) => [key, clientFlagClient.getValue(key, context)]));
  }, [keys.join(','), context?.userId, context?.tier]); // intentionally use specific context fields to avoid referential inequality
}
