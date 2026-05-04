import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../lib/errors';
import {
  getPresignedUploadUrl,
  uploadFileToS3,
  generateFromImage,
} from '../../../services/image.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

export interface ImgToImgRequest {
  files: File[];
  prompt: string;
  strength?: number;
  model?: string;
}

export function useImgToImg() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { user } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (req: ImgToImgRequest) => {
      // Upload all reference images to S3 in parallel
      const keys = await Promise.all(
        req.files.map(async (file) => {
          const { uploadUrl, key } = await getPresignedUploadUrl(file.name, file.type);
          await uploadFileToS3(uploadUrl, file);
          return key;
        })
      );

      return generateFromImage({
        imageUrls: keys,
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
