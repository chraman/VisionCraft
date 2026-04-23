import { FlagClient } from './client';

/**
 * Server-side flagClient singleton.
 * Import this in backend services:
 *
 * @example
 * import { flagClient } from '@ai-platform/feature-flags/server';
 * const isEnabled = flagClient.isEnabled('image.text_generation.enabled', { userId });
 */
export const flagClient = new FlagClient();

export { FlagClient } from './client';
export type { FlagContext } from './types';
