import { REDIS_KEYS, REDIS_TTL } from '@ai-platform/config';
import { getRedis } from '../lib/redis';
import type { JobStatusUpdate } from '../types';

// Both SET and PUBLISH are required:
// SET  — stores latest state so clients connecting later can read current status
// PUBLISH — notifies clients already subscribed via SSE
export async function publishJobStatus(update: JobStatusUpdate): Promise<void> {
  const redis = getRedis();
  const channel = REDIS_KEYS.jobStatus(update.jobId);
  const payload = JSON.stringify(update);

  await Promise.all([
    redis.set(channel, payload, 'EX', REDIS_TTL.JOB_STATUS),
    redis.publish(channel, payload),
  ]);
}
