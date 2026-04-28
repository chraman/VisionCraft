import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { FeatureFlagKey } from '@ai-platform/types';

// Load flags from the feature-flags package JSON files directly.
// Avoids pulling in the React/ESM parts of @ai-platform/feature-flags
// which are incompatible with CommonJS module resolution.
function loadFlags(): Record<string, boolean | string | number> {
  const env = process.env['NODE_ENV'] ?? 'development';
  try {
    if (env === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@ai-platform/feature-flags/src/flags.prod.json') as Record<
        string,
        boolean | string | number
      >;
    }
    if (env === 'staging') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@ai-platform/feature-flags/src/flags.qa.json') as Record<
        string,
        boolean | string | number
      >;
    }
  } catch {
    // fall through to default
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@ai-platform/feature-flags/src/flags.default.json') as Record<
    string,
    boolean | string | number
  >;
}

const flags = loadFlags();

function isFlagEnabled(key: FeatureFlagKey): boolean {
  const value = flags[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

export function requireFlag(flagKey: FeatureFlagKey): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!isFlagEnabled(flagKey)) {
      res.status(403).json({
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'This feature is not available' },
        requestId: (res.locals['requestId'] as string) ?? 'unknown',
      });
      return;
    }
    next();
  };
}
