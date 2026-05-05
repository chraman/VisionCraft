import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type {
  Influencer,
  GenerateInfluencerRequest,
  PreviewInfluencerRequest,
  PreviewInfluencerResponse,
  ExtractDnaResponse,
  PreviewImageResponse,
  GenerateJobResponse,
  PaginatedResponse,
  CursorPaginationParams,
} from '@ai-platform/types';

export async function previewInfluencer(
  req: PreviewInfluencerRequest
): Promise<PreviewInfluencerResponse> {
  const res = await apiClient.post<{
    success: true;
    data: PreviewInfluencerResponse;
    requestId: string;
  }>(API_ROUTES.INFLUENCERS.PREVIEW, req);
  return unwrapResponse(res);
}

export async function extractInfluencerDna(
  req: PreviewInfluencerRequest
): Promise<ExtractDnaResponse> {
  const res = await apiClient.post<{ success: true; data: ExtractDnaResponse; requestId: string }>(
    API_ROUTES.INFLUENCERS.EXTRACT_DNA,
    req
  );
  return unwrapResponse(res);
}

export async function generateInfluencerPreviewImage(req: {
  name: string;
  characterDna: Record<string, unknown>;
  sourceImageUrl?: string;
}): Promise<PreviewImageResponse> {
  const res = await apiClient.post<{
    success: true;
    data: PreviewImageResponse;
    requestId: string;
  }>(API_ROUTES.INFLUENCERS.PREVIEW_IMAGE, req);
  return unwrapResponse(res);
}

export async function createInfluencer(req: {
  name: string;
  description?: string;
  sourceImageUrl?: string;
  characterDna: Record<string, unknown>;
  profileImageUrl: string;
}): Promise<Influencer> {
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
