import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@ai-platform/config';
import { getBullMQRedis } from './redis';

let imageQueue: Queue | null = null;

export function getImageQueue(): Queue {
  if (!imageQueue) {
    imageQueue = new Queue(QUEUE_NAMES.IMAGE_GENERATION, {
      connection: getBullMQRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86_400 },
      },
    });
  }
  return imageQueue;
}

export async function closeQueue(): Promise<void> {
  if (imageQueue) {
    await imageQueue.close();
    imageQueue = null;
  }
}
