import { useInfiniteQuery } from '@tanstack/react-query';
import { getSavedImages } from '../../../services/image.service';

export function useInfluencerImages(_influencerId: string, params: { limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['influencerImages', _influencerId, params],
    queryFn: ({ pageParam }) =>
      getSavedImages({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
  });
}
