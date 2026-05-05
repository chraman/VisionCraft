import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import { generateInfluencerImage } from '../../../services/influencer.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';
import type { GenerateInfluencerRequest } from '@ai-platform/types';

type GenerateArgs = { influencerId: string } & Omit<GenerateInfluencerRequest, 'influencerId'>;

export function useInfluencerGeneration() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: ({ influencerId, ...rest }: GenerateArgs) =>
      generateInfluencerImage(influencerId, rest),
    onMutate: (req) => {
      track({
        event: 'influencer_generation_started',
        jobId: 'pending',
        influencerId: req.influencerId,
        hasEmotionModifier: Boolean(req.emotionModifier),
        hasSceneParams: Boolean(req.sceneParams),
        userId: user?.id,
      });
    },
    onSuccess: ({ jobId }, req) => {
      setActiveJobId(jobId);
      track({
        event: 'influencer_generation_completed',
        jobId,
        influencerId: req.influencerId,
        durationMs: 0,
        success: true,
        userId: user?.id,
      });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  return { mutation, activeJobId, setActiveJobId };
}
