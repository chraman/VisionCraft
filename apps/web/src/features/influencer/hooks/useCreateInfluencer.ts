import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import { createInfluencer } from '../../../services/influencer.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';
import type { CharacterDna } from '@ai-platform/types';

export function useCreateInfluencer() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: createInfluencer,
    onMutate: () => {
      track({
        event: 'influencer_created',
        influencerId: 'pending',
        hasSourceImage: false,
        userId: user?.id,
      });
    },
    onSuccess: (influencer) => {
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      track({
        event: 'influencer_dna_extracted',
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
