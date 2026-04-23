export type AppEnv = 'local' | 'qa' | 'prod';

const getEnv = (key: string): string | undefined =>
  typeof process !== 'undefined' ? process.env[key] : undefined;

export function getAppEnv(): AppEnv {
  const env =
    getEnv('APP_ENV') ??
    (typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: { VITE_APP_ENV?: string } }).env?.VITE_APP_ENV
      : undefined);
  if (env === 'qa' || env === 'prod') return env as AppEnv;
  return 'local';
}

interface EnvironmentConfig {
  apiBaseUrl: string;
  frontendUrl: string;
  cdnDomain: string;
  allowedOrigins: string[];
  flagProvider: 'static' | 'unleash' | 'launchdarkly';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  s3BucketGenerated: string;
  s3BucketUploads: string;
  sesFromEmail: string;
  sentryEnvironment: string;
}

function buildConfig(): Record<AppEnv, EnvironmentConfig> {
  return {
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
      apiBaseUrl: getEnv('API_BASE_URL') ?? 'https://qa.visioncraft.io',
      frontendUrl: getEnv('FRONTEND_URL') ?? 'https://qa-app.visioncraft.io',
      cdnDomain: getEnv('CLOUDFRONT_DOMAIN') ?? 'https://qa-cdn.visioncraft.io',
      allowedOrigins: (getEnv('ALLOWED_ORIGINS') ?? 'https://qa-app.visioncraft.io').split(','),
      flagProvider: 'launchdarkly',
      logLevel: 'info',
      s3BucketGenerated: getEnv('AWS_BUCKET_GENERATED') ?? 'qa-ai-images-generated',
      s3BucketUploads: getEnv('AWS_BUCKET_UPLOADS') ?? 'qa-ai-images-uploads',
      sesFromEmail: getEnv('AWS_SES_FROM_EMAIL') ?? 'noreply-qa@visioncraft.io',
      sentryEnvironment: 'qa',
    },
    prod: {
      apiBaseUrl: getEnv('API_BASE_URL') ?? 'https://api.visioncraft.io',
      frontendUrl: getEnv('FRONTEND_URL') ?? 'https://visioncraft.io',
      cdnDomain: getEnv('CLOUDFRONT_DOMAIN') ?? 'https://cdn.visioncraft.io',
      allowedOrigins: (
        getEnv('ALLOWED_ORIGINS') ?? 'https://visioncraft.io,https://www.visioncraft.io'
      ).split(','),
      flagProvider: 'launchdarkly',
      logLevel: 'warn',
      s3BucketGenerated: getEnv('AWS_BUCKET_GENERATED') ?? 'prod-ai-images-generated',
      s3BucketUploads: getEnv('AWS_BUCKET_UPLOADS') ?? 'prod-ai-images-uploads',
      sesFromEmail: getEnv('AWS_SES_FROM_EMAIL') ?? 'noreply@visioncraft.io',
      sentryEnvironment: 'prod',
    },
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return buildConfig()[getAppEnv()];
}

export function getConfigForEnvironment(env: AppEnv): EnvironmentConfig {
  return buildConfig()[env];
}

/** @deprecated Use getAppEnv() instead */
export function getEnvironment(): AppEnv {
  return getAppEnv();
}

/** @deprecated Use AppEnv instead */
export type Environment = AppEnv;
