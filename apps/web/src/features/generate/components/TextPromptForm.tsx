import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@ai-platform/ui';
import type { AspectRatio, ImageQuality } from '@ai-platform/types';
import { useTextGeneration } from '../hooks/useTextGeneration';
import { QuotaGuard } from '../../../components/QuotaGuard';

const textGenerationSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  negativePrompt: z.string().max(500).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4'] as [AspectRatio, ...AspectRatio[]]),
  quality: z.enum(['standard', 'hd'] as [ImageQuality, ...ImageQuality[]]),
});

type TextGenerationFormData = z.infer<typeof textGenerationSchema>;

export function TextPromptForm() {
  const { mutation } = useTextGeneration();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TextGenerationFormData>({
    resolver: zodResolver(textGenerationSchema),
    defaultValues: { aspectRatio: '1:1', quality: 'standard' },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} noValidate className="space-y-4">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
          Prompt
        </label>
        <textarea
          id="prompt"
          rows={4}
          placeholder="Describe the image you want to generate…"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-describedby={errors.prompt ? 'prompt-error' : undefined}
          {...register('prompt')}
        />
        {errors.prompt && (
          <p id="prompt-error" className="mt-1 text-xs text-red-600">
            {errors.prompt.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-700">
          Negative prompt <span className="text-gray-400">(optional)</span>
        </label>
        <Input
          id="negative-prompt"
          type="text"
          placeholder="Things to avoid in the image…"
          className="mt-1 w-full"
          {...register('negativePrompt')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-700">
            Aspect ratio
          </label>
          <select
            id="aspect-ratio"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            {...register('aspectRatio')}
          >
            <option value="1:1">Square (1:1)</option>
            <option value="16:9">Landscape (16:9)</option>
            <option value="9:16">Portrait (9:16)</option>
            <option value="4:3">Classic (4:3)</option>
            <option value="3:4">Classic Portrait (3:4)</option>
          </select>
        </div>

        <div>
          <label htmlFor="quality" className="block text-sm font-medium text-gray-700">
            Quality
          </label>
          <select
            id="quality"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            {...register('quality')}
          >
            <option value="standard">Standard</option>
            <option value="hd">HD</option>
          </select>
        </div>
      </div>

      <QuotaGuard>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Generating…' : 'Generate image'}
        </Button>
      </QuotaGuard>
    </form>
  );
}
