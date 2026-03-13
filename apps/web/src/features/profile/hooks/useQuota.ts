import { useQuery } from '@tanstack/react-query';
import { getQuota } from '../../../services/user.service';

export function useQuota() {
  return useQuery({
    queryKey: ['quota'],
    queryFn: getQuota,
    staleTime: 60_000, // 1 min
    refetchInterval: 300_000, // 5 min
  });
}
