import { z } from 'zod';

// ─── Shared base schema (all services) ───────────────────────────────────────

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SERVICE_NAME: z.string().min(1),
  APP_ENV: z.enum(['local', 'qa', 'prod']).default('local'),
  PORT: z.coerce.number().default(3000),
});

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authServiceEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('auth-service'),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

// ─── User Service ─────────────────────────────────────────────────────────────

export const userServiceEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('user-service'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

// ─── Image Service ────────────────────────────────────────────────────────────

export const imageServiceEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('image-service'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_BUCKET_GENERATED: z.string().min(1),
  AWS_BUCKET_UPLOADS: z.string().min(1),
  CLOUDFRONT_DOMAIN: z.string().url(),
  AI_SERVICE_URL: z.string().url(),
});

// ─── Notification Service ─────────────────────────────────────────────────────

export const notificationServiceEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('notification-service'),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_SES_FROM_EMAIL: z.string().email(),
});

// ─── Analytics Service ────────────────────────────────────────────────────────

export const analyticsServiceEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('analytics-service'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

// ─── API Gateway ──────────────────────────────────────────────────────────────

export const apiGatewayEnvSchema = baseEnvSchema.extend({
  SERVICE_NAME: z.literal('api-gateway'),
  JWT_PUBLIC_KEY: z.string().min(1),
  REDIS_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  USER_SERVICE_URL: z.string().url(),
  IMAGE_SERVICE_URL: z.string().url(),
  NOTIFICATION_SERVICE_URL: z.string().url(),
  ANALYTICS_SERVICE_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
});

// ─── Feature Flags (all services + frontend) ─────────────────────────────────

export const featureFlagsEnvSchema = z.object({
  FEATURE_FLAGS_PROVIDER: z.enum(['launchdarkly', 'unleash', 'static']).default('static'),
  LAUNCHDARKLY_SDK_KEY: z.string().optional(),
  VITE_LAUNCHDARKLY_CLIENT_KEY: z.string().optional(),
  UNLEASH_URL: z.string().url().optional(),
  UNLEASH_CLIENT_SECRET: z.string().optional(),
});

// ─── Utility: parse & validate env ───────────────────────────────────────────

export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: Record<string, string | undefined> = process.env
): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${missing}`);
  }
  return result.data as z.infer<T>;
}
