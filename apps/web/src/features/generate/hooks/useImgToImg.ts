import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@ai-platform/utils';
import {
  getPresignedUploadUrl,
  uploadFileToS3,
  generateFromImage,
} from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

export interface ImgToImgRequest {
  file: File;
  prompt: string;
  strength?: number;
  model?: string;
}

export function useImgToImg() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (req: ImgToImgRequest) => {
      const { uploadUrl, key } = await getPresignedUploadUrl(req.file.name, req.file.type);
      await uploadFileToS3(uploadUrl, req.file);

      return generateFromImage({
        imageUrl: key,
        prompt: req.prompt,
        strength: req.strength,
        model: req.model,
      });
    },
    onMutate: (req) => {
      track({
        event: 'generation_started',
        jobId: 'pending',
        provider: 'stability-ai',
        model: req.model ?? 'sdxl',
        promptLength: req.prompt.length,
        type: 'img2img',
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
