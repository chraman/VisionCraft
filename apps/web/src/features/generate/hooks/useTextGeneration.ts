import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@ai-platform/utils';
import type { GenerateTextRequest } from '@ai-platform/types';
import { generateFromText } from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

export function useTextGeneration() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: (req: GenerateTextRequest) => generateFromText(req),
    onMutate: (req) => {
      track({
        event: 'generation_started',
        jobId: 'pending',
        provider: 'stability-ai',
        model: req.model ?? 'sdxl',
        promptLength: req.prompt.length,
        type: 'text2img',
        userId: user?.id,
      });
    },
    onSuccess: ({ jobId }) => {
      setActiveJobId(jobId);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      track({
        event: 'generation_failed',
        jobId: 'unknown',
        provider: 'stability-ai',
        model: 'sdxl',
        errorCode: 'GENERATION_ERROR',
        durationMs: 0,
        userId: user?.id,
      });
    },
  });

  return { mutation, activeJobId, setActiveJobId };
}
