import { Worker, type Job } from 'bullmq';
import { createLogger } from '@ai-platform/utils';
import { QUEUE_NAMES, REDIS_KEYS } from '@ai-platform/config';
import { getRedis, getBullMQRedis } from './lib/redis';
import { workerJobRepository } from './repositories/job.repository';
import { workerImageRepository } from './repositories/image.repository';
import { workerUserRepository } from './repositories/user.repository';
import { callAiServiceText, callAiServiceImage } from './services/ai.client';
import { publishJobStatus } from './services/sse.publisher';
import type { GenerationJobPayload } from './types';

const logger = createLogger('image-worker');

function toCdnUrl(s3Key: string): string {
  const domain = process.env['CLOUDFRONT_DOMAIN'] ?? '';
  return `${domain}/${s3Key}`;
}

function s3Url(s3Key: string): string {
  const bucket = process.env['AWS_BUCKET_GENERATED'] ?? '';
  const region = process.env['AWS_REGION'] ?? 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
}

async function processJob(job: Job<GenerationJobPayload>): Promise<void> {
  const { jobId, userId, type, prompt } = job.data;

  logger.info('Processing job', { action: 'job_start', jobId, userId, type });

  await workerJobRepository.markProcessing(jobId);
  await publishJobStatus({
    jobId,
    userId,
    status: 'PROCESSING',
    startedAt: new Date().toISOString(),
  });

  try {
    const result =
      type === 'TEXT2IMG' ? await callAiServiceText(job.data) : await callAiServiceImage(job.data);

    const imageS3Url = s3Url(result.image_key);
    const imageCdnUrl = toCdnUrl(result.image_key);

    await workerImageRepository.create({
      userId,
      jobId,
      url: imageS3Url,
      cdnUrl: imageCdnUrl,
      prompt,
      model: result.model,
      provider: result.provider,
      width: result.width,
      height: result.height,
    });

    await workerJobRepository.markCompleted(jobId);

    await workerUserRepository.incrementGenerationsThisMonth(userId);
    await getRedis().del(REDIS_KEYS.quota(userId));

    await publishJobStatus({
      jobId,
      userId,
      status: 'COMPLETED',
      imageUrl: imageS3Url,
      cdnUrl: imageCdnUrl,
      provider: result.provider,
      model: result.model,
      completedAt: new Date().toISOString(),
    });

    logger.info('Job completed', {
      action: 'job_complete',
      jobId,
      userId,
      provider: result.provider,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Job failed', {
      action: 'job_failed',
      jobId,
      userId,
      attempt: job.attemptsMade,
      error: errorMessage,
    });

    await workerJobRepository.markFailed(jobId, errorMessage);
    await publishJobStatus({ jobId, userId, status: 'FAILED', errorMessage });

    throw err; // Re-throw so BullMQ applies retry backoff
  }
}

export function startWorker(): Worker<GenerationJobPayload> {
  const worker = new Worker<GenerationJobPayload>(QUEUE_NAMES.IMAGE_GENERATION, processJob, {
    connection: getBullMQRedis(),
    concurrency: parseInt(process.env['WORKER_CONCURRENCY'] ?? '5', 10),
  });

  worker.on('completed', (job) => {
    logger.info('BullMQ job completed', {
      action: 'bullmq_completed',
      jobId: job.data.jobId,
      userId: job.data.userId,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('BullMQ job failed', {
      action: 'bullmq_failed',
      jobId: job?.data.jobId,
      userId: job?.data.userId,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  return worker;
}
