import type { FeatureFlagKey, FlagValue } from '@ai-platform/types';
import type { FlagContext } from './types.js';
import defaultFlags from './flags.default.json';

/**
 * FlagClient — v1 reads from flags.default.json.
 * Provider integrations (LaunchDarkly, Unleash) are wired in a later sprint.
 *
 * Fallback behaviour:
 * - Core generation features: ON
 * - All billing/payments: OFF
 * - Admin: OFF
 */
export class FlagClient {
  private readonly flags: Record<string, FlagValue>;

  constructor(overrides?: Partial<Record<FeatureFlagKey, FlagValue>>) {
    this.flags = { ...defaultFlags, ...overrides };
  }

  /**
   * Check whether a boolean flag is enabled.
   * @param key - The flag key from FeatureFlagKey
   * @param _context - Optional user context (userId, tier) for targeted rollouts
   */
  isEnabled(key: FeatureFlagKey, _context?: FlagContext): boolean {
    const value = this.flags[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
  }

  /**
   * Get the raw value of a flag (boolean, string, or number).
   */
  getValue(key: FeatureFlagKey, _context?: FlagContext): FlagValue {
    return this.flags[key] ?? false;
  }

  /**
   * Get all flag values — useful for debugging and hydrating the client.
   */
  getAllFlags(): Record<string, FlagValue> {
    return { ...this.flags };
  }
}
