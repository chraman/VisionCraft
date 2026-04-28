import axios, { type AxiosError } from 'axios';
import { SERVICE_URLS } from '@ai-platform/config';
import { createLogger } from '@ai-platform/utils';
import type { GenerationJobPayload, AiServiceResponse } from '../types';

const logger = createLogger('image-worker');

const aiClient = axios.create({
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

function aiServiceUrl(): string {
  return SERVICE_URLS.AI();
}

export async function callAiServiceText(payload: GenerationJobPayload): Promise<AiServiceResponse> {
  const url = `${aiServiceUrl()}/generate/text`;
  const body = {
    job_id: payload.jobId,
    user_id: payload.userId,
    prompt: payload.prompt,
    negative_prompt: payload.negativePrompt ?? null,
    model: payload.model,
    aspect_ratio: payload.aspectRatio,
    quality: payload.quality,
  };

  logger.info('Calling ai-service', {
    action: 'ai_request',
    url,
    jobId: payload.jobId,
    model: payload.model,
    aspect_ratio: payload.aspectRatio,
    quality: payload.quality,
  });

  try {
    const response = await aiClient.post<AiServiceResponse>(url, body);
    logger.info('ai-service responded', {
      action: 'ai_response',
      jobId: payload.jobId,
      status: response.status,
      image_key: response.data.image_key,
      provider: response.data.provider,
    });
    return response.data;
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error('ai-service call failed', {
      action: 'ai_error',
      jobId: payload.jobId,
      status: axErr.response?.status,
      responseData: JSON.stringify(axErr.response?.data),
      message: axErr.message,
    });
    throw err;
  }
}

export async function callAiServiceImage(
  payload: GenerationJobPayload
): Promise<AiServiceResponse> {
  const url = `${aiServiceUrl()}/generate/image`;
  const body = {
    job_id: payload.jobId,
    user_id: payload.userId,
    image_url: payload.imageUrl,
    prompt: payload.prompt,
    strength: payload.strength ?? 0.75,
    model: payload.model,
  };

  logger.info('Calling ai-service img2img', {
    action: 'ai_request',
    url,
    jobId: payload.jobId,
  });

  try {
    const response = await aiClient.post<AiServiceResponse>(url, body);
    logger.info('ai-service img2img responded', {
      action: 'ai_response',
      jobId: payload.jobId,
      status: response.status,
      image_key: response.data.image_key,
    });
    return response.data;
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error('ai-service img2img call failed', {
      action: 'ai_error',
      jobId: payload.jobId,
      status: axErr.response?.status,
      responseData: JSON.stringify(axErr.response?.data),
      message: axErr.message,
    });
    throw err;
  }
}
