import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import { previewInfluencer, createInfluencer } from '../../../services/influencer.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';
import type { CharacterDna } from '@ai-platform/types';

export function usePreviewInfluencer() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: previewInfluencer,
    onMutate: () => {
      track({
        event: 'influencer_preview_started',
        influencerId: 'pending',
        hasSourceImage: false,
        userId: user?.id,
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}

export function useCreateInfluencer() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: createInfluencer,
    onSuccess: (influencer) => {
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      track({
        event: 'influencer_created',
        influencerId: influencer.id,
        extractionMs: 0,
        model: String((influencer.characterDna as CharacterDna)?.extraction_model ?? 'gemini'),
        userId: user?.id,
      });
      toast.success(`Influencer "${influencer.name}" created`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });
}
