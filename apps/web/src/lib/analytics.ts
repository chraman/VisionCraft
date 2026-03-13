import posthog from 'posthog-js';
import type { AnalyticsEvent } from '@ai-platform/types';

export function initAnalytics(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false, // We fire page_view manually in AppLayout
  });
}

export function track(event: AnalyticsEvent): void {
  if (typeof posthog === 'undefined') return;
  const { event: eventName, ...properties } = event;
  posthog.capture(eventName, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (typeof posthog === 'undefined') return;
  posthog.identify(userId, traits);
}

export function resetAnalyticsUser(): void {
  if (typeof posthog === 'undefined') return;
  posthog.reset();
}
