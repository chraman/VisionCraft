import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient, unwrapResponse } from '@ai-platform/api-client';
import { API_ROUTES } from '@ai-platform/config';
import type { Image, PaginatedResponse } from '@ai-platform/types';

async function getInfluencerImages(
  influencerId: string,
  params: { limit?: number; cursor?: string }
): Promise<PaginatedResponse<Image>> {
  const res = await apiClient.get<{
    success: true;
    data: PaginatedResponse<Image>;
    requestId: string;
  }>(API_ROUTES.IMAGES.LIST, { params: { ...params, influencerId } });
  return unwrapResponse(res);
}

export function useInfluencerImages(influencerId: string, params: { limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['influencerImages', influencerId, params],
    queryFn: ({ pageParam }) =>
      getInfluencerImages(influencerId, {
        ...params,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor ?? undefined,
    enabled: !!influencerId,
    staleTime: 2 * 60 * 1000,
  });
}
