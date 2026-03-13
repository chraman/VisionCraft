import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@ai-platform/store';
import { getCurrentUser } from '../services/user.service';
import { identifyUser } from '../lib/analytics';

export function useCurrentUser() {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await getCurrentUser();
      setUser(user);
      identifyUser(user.id, { email: user.email, tier: user.tier });
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: true,
  });
}
