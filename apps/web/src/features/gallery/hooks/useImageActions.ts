import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import { saveImage, deleteImage } from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

export function useImageActions() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const saveMutation = useMutation({
    mutationFn: (imageId: string) => saveImage(imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['savedImages'] });
      track({ event: 'image_saved', userId: user?.id });
      toast.success('Image saved');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteImage(imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['savedImages'] });
      track({ event: 'image_deleted', userId: user?.id });
      toast.success('Image deleted');
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  return { saveMutation, deleteMutation };
}
