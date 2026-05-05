import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type {
  Influencer,
  ExtractDnaRequest,
  GenerateInfluencerRequest,
  GenerateJobResponse,
  PaginatedResponse,
  CursorPaginationParams,
} from '@ai-platform/types';

export async function createInfluencer(
  req: Pick<ExtractDnaRequest, 'name' | 'description'> & {
    sourceImageUrl?: string;
    descriptionText?: string;
  }
): Promise<Influencer> {
  const res = await apiClient.post<{ success: true; data: Influencer; requestId: string }>(
    API_ROUTES.INFLUENCERS.CREATE,
    req
  );
  return unwrapResponse(res);
}

export async function listInfluencers(
  params: CursorPaginationParams = {}
): Promise<PaginatedResponse<Influencer>> {
  const res = await apiClient.get<{
    success: true;
    data: { data: Influencer[]; pagination: PaginatedResponse<Influencer>['pagination'] };
    requestId: string;
  }>(API_ROUTES.INFLUENCERS.LIST, { params });
  // image-service returns { data: items[], pagination: {...} } inside the envelope
  const envelope = unwrapResponse(res) as unknown as {
    data: Influencer[];
    pagination: PaginatedResponse<Influencer>['pagination'];
  };
  return { data: envelope.data, pagination: envelope.pagination };
}

export async function generateInfluencerImage(
  influencerId: string,
  req: Omit<GenerateInfluencerRequest, 'influencerId'>
): Promise<GenerateJobResponse> {
  const res = await apiClient.post<{ success: true; data: GenerateJobResponse; requestId: string }>(
    API_ROUTES.INFLUENCERS.GENERATE(influencerId),
    req
  );
  return unwrapResponse(res);
}

export async function deleteInfluencer(influencerId: string): Promise<void> {
  await apiClient.delete(API_ROUTES.INFLUENCERS.BY_ID(influencerId));
}
