import { useInfiniteQuery } from '@tanstack/react-query';
import { getSavedImages } from '../../../services/image.service';
import type { CursorPaginationParams } from '@ai-platform/types';

export function useSavedImages(params: Omit<CursorPaginationParams, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: ['savedImages', params],
    queryFn: ({ pageParam }) =>
      getSavedImages({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}
