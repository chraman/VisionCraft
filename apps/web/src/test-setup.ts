import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock feature flags — Phase 1 flags ON, Phase 2+ OFF
vi.mock('@ai-platform/feature-flags', () => ({
  useFlag: (key: string) => {
    const phase1Flags = ['image.text_generation.enabled', 'image.img2img.enabled'];
    return phase1Flags.includes(key);
  },
  useFlags: (keys: string[]) => {
    const phase1Flags = ['image.text_generation.enabled', 'image.img2img.enabled'];
    return Object.fromEntries(keys.map((k) => [k, phase1Flags.includes(k)]));
  },
  useFlagValue: (key: string) => {
    const phase1Flags = ['image.text_generation.enabled', 'image.img2img.enabled'];
    return phase1Flags.includes(key);
  },
}));

// Mock Sentry — no-op
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
}));

// Mock lib/sentry.ts
vi.mock('./lib/sentry', () => ({
  initSentry: vi.fn(),
}));

// Mock lib/analytics.ts — no-op all exports
vi.mock('./lib/analytics', () => ({
  initAnalytics: vi.fn(),
  track: vi.fn(),
  identifyUser: vi.fn(),
  resetAnalyticsUser: vi.fn(),
}));

// Mock posthog-js
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock @ai-platform/store — default unauthenticated state
vi.mock('@ai-platform/store', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    setUser: vi.fn(),
    clearUser: vi.fn(),
    setLoading: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));
