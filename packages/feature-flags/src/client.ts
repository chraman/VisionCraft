import type { FeatureFlagKey, FlagValue } from '@ai-platform/types';
import type { FlagContext } from './types';
import defaultFlags from './flags.default.json';
import qaFlags from './flags.qa.json';
import prodFlags from './flags.prod.json';

type FlagEnvironment = 'development' | 'staging' | 'production' | 'test';

const FLAG_FILES: Record<FlagEnvironment, Record<string, FlagValue>> = {
  development: defaultFlags as Record<string, FlagValue>,
  test: defaultFlags as Record<string, FlagValue>,
  staging: qaFlags as Record<string, FlagValue>,
  production: prodFlags as Record<string, FlagValue>,
};

function resolveEnvironment(): FlagEnvironment {
  const env =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ENV) ||
    (typeof process !== 'undefined' && process.env['NODE_ENV']) ||
    'development';
  if (env === 'staging' || env === 'production' || env === 'test') return env;
  return 'development';
}

/**
 * FlagClient â€” loads environment-specific flags from static JSON files.
 * Provider integrations (LaunchDarkly, Unleash) are wired in a later sprint.
 *
 * Fallback behaviour:
 * - Core generation features: ON
 * - All billing/payments: OFF
 * - Admin: OFF
 *
 * Environment resolution:
 * - development / test â†’ flags.default.json
 * - staging (QA)       â†’ flags.qa.json
 * - production         â†’ flags.prod.json
 */
export class FlagClient {
  private readonly flags: Record<string, FlagValue>;
  readonly environment: FlagEnvironment;

  constructor(overrides?: Partial<Record<FeatureFlagKey, FlagValue>>) {
    this.environment = resolveEnvironment();
    const envFlags = FLAG_FILES[this.environment] ?? defaultFlags;
    this.flags = { ...envFlags, ...overrides };
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
   * Get all flag values â€” useful for debugging and hydrating the client.
   */
  getAllFlags(): Record<string, FlagValue> {
    return { ...this.flags };
  }
}
