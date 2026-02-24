import type { AnalyticsEvent } from '@ai-platform/types';
import { logger } from './logger.js';

/**
 * Track an analytics event.
 *
 * v1: Logs the event — a future sprint wires PostHog / analytics-service here.
 * All callers remain unchanged when the real implementation is added.
 */
export function track(event: AnalyticsEvent): void {
  logger.info('analytics_event', {
    action: 'track',
    userId: event.userId ?? null,
    ...event,
  });
}
