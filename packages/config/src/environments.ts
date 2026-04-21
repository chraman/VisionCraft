// ─── Environment-specific constants ──────────────────────────────────────────
// Single source of truth for values that change per environment.
// Import and use instead of hardcoding environment-specific strings.
//
// Three environments:
//   local  — local development (NODE_ENV=development, localhost URLs)
//   qa     — QA/staging on AWS ECS (NODE_ENV=production)
//   prod   — production on AWS ECS (NODE_ENV=production)
//
// For qa and prod, URLs and bucket names are read from environment variables
// at service startup — never hardcoded here.

export type AppEnv = 'local' | 'qa' | 'prod';

export function getAppEnv(): AppEnv {
  const env = process.env['APP_ENV'];
  if (env === 'qa' || env === 'prod') return env;
  return 'local';
}

// ─── Config shape ─────────────────────────────────────────────────────────────

interface EnvironmentConfig {
  /** Public-facing API URL (api-gateway / ALB) */
  apiBaseUrl: string;
  /** Public-facing frontend URL (CloudFront domain) */
  frontendUrl: string;
  /** CloudFront CDN domain for generated images */
  cdnDomain: string;
  /** CORS allowed origins for api-gateway */
  allowedOrigins: string[];
  /** Feature flag provider */
  flagProvider: 'static' | 'unleash' | 'launchdarkly';
  /** Log level default */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** S3 bucket for generated images */
  s3BucketGenerated: string;
  /** S3 bucket for user uploads */
  s3BucketUploads: string;
  /** SES sender email */
  sesFromEmail: string;
  /** Sentry environment tag */
  sentryEnvironment: string;
}

// ─── Per-environment configs ──────────────────────────────────────────────────
//
// local  — hardcoded localhost values (safe; stable for any developer machine)
// qa     — reads from process.env; defaults are fallback only (never shipped)
// prod   — reads from process.env; defaults are fallback only (never shipped)
//
// Service-to-service URLs are NOT here — they are runtime env vars consumed via
// SERVICE_URLS in constants.ts (e.g. AUTH_SERVICE_URL=http://auth-service.internal:3001).

const ENVIRONMENT_CONFIGS: Record<AppEnv, EnvironmentConfig> = {
  local: {
    apiBaseUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
    cdnDomain: 'http://localhost:3003',
    allowedOrigins: ['http://localhost:5173', 'http://localhost:5174'],
    flagProvider: 'static',
    logLevel: 'debug',
    s3BucketGenerated: 'local-ai-images-generated',
    s3BucketUploads: 'local-ai-images-uploads',
    sesFromEmail: 'noreply-local@visioncraft.io',
    sentryEnvironment: 'local',
  },

  qa: {
    // All values read from environment variables — set via SSM Parameter Store or .env.qa
    apiBaseUrl: process.env['API_BASE_URL'] ?? 'https://qa.visioncraft.io',
    frontendUrl: process.env['FRONTEND_URL'] ?? 'https://qa-app.visioncraft.io',
    cdnDomain: process.env['CLOUDFRONT_DOMAIN'] ?? 'https://qa-cdn.visioncraft.io',
    allowedOrigins: (process.env['ALLOWED_ORIGINS'] ?? 'https://qa-app.visioncraft.io').split(','),
    flagProvider: 'launchdarkly',
    logLevel: 'info',
    s3BucketGenerated: process.env['AWS_BUCKET_GENERATED'] ?? 'qa-ai-images-generated',
    s3BucketUploads: process.env['AWS_BUCKET_UPLOADS'] ?? 'qa-ai-images-uploads',
    sesFromEmail: process.env['AWS_SES_FROM_EMAIL'] ?? 'noreply-qa@visioncraft.io',
    sentryEnvironment: 'qa',
  },

  prod: {
    // All values read from environment variables — set via SSM Parameter Store or .env.prod
    apiBaseUrl: process.env['API_BASE_URL'] ?? 'https://api.visioncraft.io',
    frontendUrl: process.env['FRONTEND_URL'] ?? 'https://visioncraft.io',
    cdnDomain: process.env['CLOUDFRONT_DOMAIN'] ?? 'https://cdn.visioncraft.io',
    allowedOrigins: (
      process.env['ALLOWED_ORIGINS'] ?? 'https://visioncraft.io,https://www.visioncraft.io'
    ).split(','),
    flagProvider: 'launchdarkly',
    logLevel: 'warn',
    s3BucketGenerated: process.env['AWS_BUCKET_GENERATED'] ?? 'prod-ai-images-generated',
    s3BucketUploads: process.env['AWS_BUCKET_UPLOADS'] ?? 'prod-ai-images-uploads',
    sesFromEmail: process.env['AWS_SES_FROM_EMAIL'] ?? 'noreply@visioncraft.io',
    sentryEnvironment: 'prod',
  },
};

/**
 * Get the configuration for the current environment.
 * Reads APP_ENV from process.env; defaults to 'local'.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[getAppEnv()];
}

/**
 * Get the configuration for a specific environment.
 */
export function getConfigForEnvironment(env: AppEnv): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[env];
}

// ─── Legacy alias — remove once all callers use getAppEnv() ──────────────────
/** @deprecated Use getAppEnv() instead */
export function getEnvironment(): AppEnv {
  return getAppEnv();
}

/** @deprecated Use AppEnv instead */
export type Environment = AppEnv;
