import axios from 'axios';
import { randomUUID } from 'crypto';
import { AppError } from '@ai-platform/types';
import { REDIS_KEYS, REDIS_TTL, QUEUE_NAMES, SERVICE_URLS } from '@ai-platform/config';
import { influencerRepository } from '../repositories/influencer.repository';
import { jobRepository } from '../repositories/job.repository';
import { checkQuota } from './quota.service';
import { getRedis } from '../lib/redis';
import { getImageQueue } from '../lib/queue';
import { toCdnUrl } from '../lib/s3';
import type {
  PreviewInfluencerInput,
  CreateInfluencerInput,
  GenerateInfluencerInput,
  ListInfluencersInput,
} from '../schemas/influencer.schemas';

export const influencerService = {
  async previewInfluencer(userId: string, input: PreviewInfluencerInput) {
    const aiServiceUrl = SERVICE_URLS.AI();

    // Step 1: Extract character DNA (includes face_anchor + seed)
    let extractResponse;
    try {
      extractResponse = await axios.post(
        `${aiServiceUrl}/influencer/extract-dna`,
        {
          source_image_url: input.sourceImageUrl ?? null,
          description: input.descriptionText ?? null,
          name: input.name,
        },
        { timeout: 20_000 }
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
        throw new AppError('PROVIDER_UNAVAILABLE', `DNA extraction failed: ${String(detail)}`, 503);
      }
      throw err;
    }

    const characterDna = extractResponse.data.character_dna as Record<string, unknown>;

    // Step 2: Generate canonical full-body profile image synchronously
    const profileJobId = `profile_${randomUUID()}`;
    let generateResponse;
    try {
      generateResponse = await axios.post(
        `${aiServiceUrl}/influencer/generate`,
        {
          job_id: profileJobId,
          user_id: userId,
          influencer_id: 'preview',
          character_dna: characterDna,
          target_prompt: 'full body portrait, professional photography, standing pose',
          model: 'sdxl',
          aspect_ratio: '9:16',
          quality: 'standard',
          use_int8: false,
        },
        { timeout: 120_000 }
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
        throw new AppError(
          'PROVIDER_UNAVAILABLE',
          `Profile image generation failed: ${String(detail)}`,
          503
        );
      }
      throw err;
    }

    const imageKey: string = generateResponse.data.image_key;
    const profileImageUrl = toCdnUrl(imageKey);

    return { characterDna, profileImageUrl };
  },

  async createInfluencer(userId: string, _tier: string, input: CreateInfluencerInput) {
    return influencerRepository.create({
      userId,
      name: input.name,
      description: input.description,
      sourceImageUrl: input.sourceImageUrl,
      characterDna: input.characterDna,
      profileImageUrl: input.profileImageUrl,
    });
  },

  async listInfluencers(userId: string, params: ListInfluencersInput) {
    const limit = params.limit ?? 20;
    const { influencers, total } = await influencerRepository.findByUser(userId, {
      limit,
      cursor: params.cursor,
      order: params.order ?? 'desc',
    });
    const hasMore = influencers.length > limit;
    const items = hasMore ? influencers.slice(0, limit) : influencers;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
    return { data: items, pagination: { nextCursor, hasMore, total } };
  },

  async deleteInfluencer(influencerId: string, userId: string): Promise<void> {
    const influencer = await influencerRepository.findByIdAndUser(influencerId, userId);
    if (!influencer) throw new AppError('NOT_FOUND', 'Influencer not found', 404);
    await influencerRepository.softDelete(influencerId);
  },

  async createInfluencerJob(userId: string, tier: string, input: GenerateInfluencerInput) {
    await checkQuota(userId, tier);

    const influencer = await influencerRepository.findByIdAndUser(input.influencerId, userId);
    if (!influencer) throw new AppError('NOT_FOUND', 'Influencer not found', 404);

    const referenceStrength = input.referenceStrength ?? 0.25;

    const job = await jobRepository.create({
      userId,
      type: 'INFLUENCER',
      prompt: input.targetPrompt,
      model: input.model ?? 'sdxl',
      aspectRatio: input.aspectRatio ?? '1:1',
      quality: input.quality ?? 'standard',
      metadata: {
        influencerId: input.influencerId,
        characterDna: influencer.characterDna,
        emotionModifier: input.emotionModifier,
        sceneParams: input.sceneParams,
        useInt8: input.useInt8 ?? false,
        sourceImageUrl: influencer.profileImageUrl ?? undefined,
        referenceStrength,
      },
    });

    const payload = {
      jobId: job.id,
      userId,
      type: 'INFLUENCER' as const,
      prompt: input.targetPrompt,
      model: input.model ?? 'sdxl',
      aspectRatio: input.aspectRatio ?? '1:1',
      quality: input.quality ?? 'standard',
      influencerId: input.influencerId,
      characterDna: influencer.characterDna as Record<string, unknown>,
      emotionModifier: input.emotionModifier,
      sceneParams: input.sceneParams,
      useInt8: input.useInt8 ?? false,
      sourceImageUrl: influencer.profileImageUrl ?? undefined,
      referenceStrength,
    };

    await getRedis().set(
      REDIS_KEYS.jobStatus(job.id),
      JSON.stringify({ jobId: job.id, userId, status: 'PENDING' }),
      'EX',
      REDIS_TTL.JOB_STATUS
    );

    await getImageQueue().add(QUEUE_NAMES.IMAGE_GENERATION, payload);

    return { jobId: job.id, status: 'PENDING' };
  },
};
