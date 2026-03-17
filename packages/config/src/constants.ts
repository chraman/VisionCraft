import type { UserTier } from '@ai-platform/types';

// ─── Service port registry ────────────────────────────────────────────────────
// Single source of truth for every service's default port.
// Change a port here once and every URL below updates automatically.

export const SERVICE_PORTS = {
  API_GATEWAY: 3000,
  AUTH: 3001,
  USER: 3002,
  IMAGE: 3003,
  NOTIFY: 3004,
  ANALYTICS: 3005,
  AI: 8000,
  FRONTEND: 5173,
} as const;

// ─── Service URL resolver ─────────────────────────────────────────────────────
// Used by backend services only. Each function reads the env var at call-time
// so tests can override process.env without module-level caching.
//
// Dev fallback:  http://localhost:<port>
// Staging/Prod:  set the env var to the Railway internal hostname, e.g.
//                AUTH_SERVICE_URL=http://auth-service.railway.internal:3001

export const SERVICE_URLS = {
  AUTH: () => process.env['AUTH_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.AUTH}`,
  USER: () => process.env['USER_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.USER}`,
  IMAGE: () => process.env['IMAGE_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.IMAGE}`,
  NOTIFY: () => process.env['NOTIFY_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.NOTIFY}`,
  ANALYTICS: () =>
    process.env['ANALYTICS_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.ANALYTICS}`,
  AI: () => process.env['AI_SERVICE_URL'] ?? `http://localhost:${SERVICE_PORTS.AI}`,
  FRONTEND: () => process.env['FRONTEND_URL'] ?? `http://localhost:${SERVICE_PORTS.FRONTEND}`,
  API_GW: () => process.env['API_GW_URL'] ?? `http://localhost:${SERVICE_PORTS.API_GATEWAY}`,
} as const;

// ─── API routes ───────────────────────────────────────────────────────────────

export const API_ROUTES = {
  // Auth
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    GOOGLE: '/api/v1/auth/google',
    GOOGLE_CALLBACK: '/api/v1/auth/google/callback',
    TWO_FA_SETUP: '/api/v1/auth/2fa/setup',
    TWO_FA_VERIFY: '/api/v1/auth/2fa/verify',
  },
  // Users
  USERS: {
    ME: '/api/v1/users/me',
    ME_QUOTA: '/api/v1/users/me/quota',
  },
  // Images
  IMAGES: {
    LIST: '/api/v1/images',
    GENERATE: '/api/v1/images/generate',
    GENERATE_TEXT: '/api/v1/images/generate/text',
    GENERATE_IMAGE: '/api/v1/images/generate/image',
    UPLOAD_URL: '/api/v1/images/upload-url',
    COLLECTIONS: '/api/v1/images/collections',
    BY_ID: (id: string) => `/api/v1/images/${id}`,
    SAVE: (id: string) => `/api/v1/images/${id}/save`,
    JOB: (id: string) => `/api/v1/images/jobs/${id}`,
    JOB_EVENTS: (id: string) => `/api/v1/images/jobs/${id}/events`,
  },
  // Notifications
  NOTIFY: {
    EMAIL: '/api/v1/notify/email',
  },
  // Analytics
  EVENTS: '/api/v1/events',
} as const;

export const TIERS = {
  free: {
    monthlyQuota: 10,
    maxResolution: 1024,
    maxBatchSize: 1,
  },
  pro: {
    monthlyQuota: 200,
    maxResolution: 2048,
    maxBatchSize: 4,
  },
  enterprise: {
    monthlyQuota: 2000,
    maxResolution: 4096,
    maxBatchSize: 16,
  },
} as const satisfies Record<
  UserTier,
  { monthlyQuota: number; maxResolution: number; maxBatchSize: number }
>;

export const REDIS_KEYS = {
  revokedToken: (jti: string) => `revoked:${jti}`,
  rateLimit: (userId: string, route: string) => `ratelimit:${userId}:${route}`,
  quota: (userId: string) => `quota:${userId}`,
  jobStatus: (jobId: string) => `job:status:${jobId}`,
  session: (userId: string) => `session:${userId}`,
  flagCache: (userId: string) => `flag:cache:${userId}`,
} as const;

export const REDIS_TTL = {
  RATE_LIMIT: 3600, // 1 hour
  QUOTA: 3600, // 1 hour
  JOB_STATUS: 7200, // 2 hours
  SESSION: 900, // 15 minutes
  FLAG_CACHE: 300, // 5 minutes
} as const;

export const AI_MODELS = {
  SDXL: 'sdxl',
  DALLE3: 'dalle3',
  SDXL_TURBO: 'sdxl-turbo',
} as const;

export const AI_PROVIDERS = {
  STABILITY: 'stability-ai',
  OPENAI: 'openai',
  HUGGINGFACE: 'huggingface',
} as const;

export const QUEUE_NAMES = {
  IMAGE_GENERATION: 'image-generation',
  EMAIL: 'email',
  ANALYTICS_SYNC: 'analytics-sync',
  QUOTA_RESET: 'quota-reset',
} as const;
