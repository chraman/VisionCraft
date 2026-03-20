// ─── Environment-specific constants ──────────────────────────────────────────
// Single source of truth for values that change per environment.
// Import and use instead of hardcoding environment-specific strings.

export type Environment = 'development' | 'staging' | 'production';

function getEnvironment(): Environment {
  const env = process.env['NODE_ENV'] ?? 'development';
  if (env === 'staging' || env === 'production') return env;
  return 'development';
}

// ─── Per-environment config ─────────────────────────────────────────────────

interface ServiceUrls {
  authService: string;
  userService: string;
  imageService: string;
  notificationService: string;
  analyticsService: string;
  aiService: string;
}

interface EnvironmentConfig {
  /** Public-facing API URL (api-gateway) */
  apiBaseUrl: string;
  /** Public-facing frontend URL */
  frontendUrl: string;
  /** CloudFront CDN domain for generated images */
  cdnDomain: string;
  /** CORS allowed origins */
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
  /** Railway internal service URLs (separate projects per environment) */
  serviceUrls: ServiceUrls;
}

const ENVIRONMENT_CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
    cdnDomain: 'http://localhost:3003',
    allowedOrigins: ['http://localhost:5173', 'http://localhost:5174'],
    flagProvider: 'static',
    logLevel: 'debug',
    s3BucketGenerated: 'dev-ai-images-generated',
    s3BucketUploads: 'dev-ai-images-uploads',
    sesFromEmail: 'noreply-dev@yourdomain.com',
    sentryEnvironment: 'development',
    serviceUrls: {
      authService: 'http://localhost:3001',
      userService: 'http://localhost:3002',
      imageService: 'http://localhost:3003',
      notificationService: 'http://localhost:3004',
      analyticsService: 'http://localhost:3005',
      aiService: 'http://localhost:8000',
    },
  },
  staging: {
    apiBaseUrl: 'https://qa-api.yourdomain.com',
    frontendUrl: 'https://qa.yourdomain.com',
    cdnDomain: 'https://qa-cdn.yourdomain.com',
    allowedOrigins: ['https://qa.yourdomain.com'],
    flagProvider: 'launchdarkly',
    logLevel: 'info',
    s3BucketGenerated: 'qa-ai-images-generated',
    s3BucketUploads: 'qa-ai-images-uploads',
    sesFromEmail: 'noreply-qa@yourdomain.com',
    sentryEnvironment: 'staging',
    serviceUrls: {
      authService: 'http://auth-service-qa.railway.internal:3001',
      userService: 'http://user-service-qa.railway.internal:3002',
      imageService: 'http://image-service-qa.railway.internal:3003',
      notificationService: 'http://notification-service-qa.railway.internal:3004',
      analyticsService: 'http://analytics-service-qa.railway.internal:3005',
      aiService: 'http://ai-service-qa.railway.internal:8000',
    },
  },
  production: {
    apiBaseUrl: 'https://api.yourdomain.com',
    frontendUrl: 'https://yourdomain.com',
    cdnDomain: 'https://cdn.yourdomain.com',
    allowedOrigins: ['https://yourdomain.com', 'https://www.yourdomain.com'],
    flagProvider: 'launchdarkly',
    logLevel: 'warn',
    s3BucketGenerated: 'prod-ai-images-generated',
    s3BucketUploads: 'prod-ai-images-uploads',
    sesFromEmail: 'noreply@yourdomain.com',
    sentryEnvironment: 'production',
    serviceUrls: {
      authService: 'http://auth-service-prod.railway.internal:3001',
      userService: 'http://user-service-prod.railway.internal:3002',
      imageService: 'http://image-service-prod.railway.internal:3003',
      notificationService: 'http://notification-service-prod.railway.internal:3004',
      analyticsService: 'http://analytics-service-prod.railway.internal:3005',
      aiService: 'http://ai-service-prod.railway.internal:8000',
    },
  },
} as const;

/**
 * Get the configuration for the current environment.
 * Values can be overridden by environment variables where applicable.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[getEnvironment()];
}

/**
 * Get the configuration for a specific environment.
 */
export function getConfigForEnvironment(env: Environment): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[env];
}

export { getEnvironment };
