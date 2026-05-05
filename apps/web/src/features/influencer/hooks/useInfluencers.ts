import { useInfiniteQuery } from '@tanstack/react-query';
import { listInfluencers } from '../../../services/influencer.service';

export function useInfluencers(params: { limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['influencers', params],
    queryFn: ({ pageParam }) =>
      listInfluencers({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
  });
}
