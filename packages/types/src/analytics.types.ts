import type { UserTier } from './user.types';

/**
 * Analytics event taxonomy â€” keep in sync with CLAUDE.md Â§10.
 */
export type AnalyticsEventName =
  // Acquisition
  | 'page_view'
  | 'signup_started'
  | 'signup_completed'
  | 'oauth_clicked'
  // Engagement
  | 'login'
  | 'session_start'
  | 'feature_used'
  | 'prompt_submitted'
  // Generation
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  // Content
  | 'image_saved'
  | 'image_deleted'
  | 'collection_created'
  | 'image_shared'
  // Conversion
  | 'upgrade_clicked'
  | 'plan_selected'
  | 'payment_completed'
  // Errors
  | 'api_error'
  | 'quota_exceeded'
  | 'safety_rejected'
  | 'upload_failed'
  // Flags / A/B
  | 'flag_evaluated'
  | 'experiment_exposure'
  | 'variant_assigned';

export interface BaseAnalyticsEvent {
  event: AnalyticsEventName;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

export interface PageViewEvent extends BaseAnalyticsEvent {
  event: 'page_view';
  path: string;
  referrer?: string;
}

export interface GenerationStartedEvent extends BaseAnalyticsEvent {
  event: 'generation_started';
  jobId: string;
  provider: string;
  model: string;
  promptLength: number;
  type: 'text2img' | 'img2img';
}

export interface GenerationCompletedEvent extends BaseAnalyticsEvent {
  event: 'generation_completed';
  jobId: string;
  provider: string;
  model: string;
  durationMs: number;
  promptLength: number;
  success: boolean;
}

export interface GenerationFailedEvent extends BaseAnalyticsEvent {
  event: 'generation_failed';
  jobId: string;
  provider: string;
  model: string;
  errorCode: string;
  durationMs: number;
}

export interface QuotaExceededEvent extends BaseAnalyticsEvent {
  event: 'quota_exceeded';
  userId: string;
  tier: UserTier;
  used: number;
  limit: number;
}

export interface FlagEvaluatedEvent extends BaseAnalyticsEvent {
  event: 'flag_evaluated';
  flagKey: string;
  value: boolean | string | number;
  context?: Record<string, unknown>;
}

export interface ExperimentExposureEvent extends BaseAnalyticsEvent {
  event: 'experiment_exposure';
  experimentKey: string;
  variant: string;
}

export type AnalyticsEvent =
  | PageViewEvent
  | GenerationStartedEvent
  | GenerationCompletedEvent
  | GenerationFailedEvent
  | QuotaExceededEvent
  | FlagEvaluatedEvent
  | ExperimentExposureEvent
  | BaseAnalyticsEvent;
