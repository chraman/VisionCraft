import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import { getCurrentUser, updateProfile } from '../../../services/user.service';
import type { User } from '@ai-platform/types';

export function useProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const mutation = useMutation({
    mutationFn: (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => updateProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profile updated');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  return { query, mutation };
}
