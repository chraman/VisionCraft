import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setAccessToken } from '@ai-platform/api-client';
import { useAuthStore } from '@ai-platform/store';
import { getErrorMessage } from '@ai-platform/utils';
import { queryClient } from '../../../lib/queryClient';
import { logout } from '../../../services/auth.service';
import { resetAnalyticsUser } from '../../../lib/analytics';

export function useLogout() {
  const navigate = useNavigate();
  const { clearUser } = useAuthStore();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setAccessToken(null);
      clearUser();
      queryClient.clear();
      resetAnalyticsUser();
      navigate('/login');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      // Still clear local state even if server logout fails
      setAccessToken(null);
      clearUser();
      queryClient.clear();
      navigate('/login');
    },
  });
}
