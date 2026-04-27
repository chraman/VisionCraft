import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AspectRatio, ImageQuality } from '@ai-platform/types';
import { useTextGeneration } from '../hooks/useTextGeneration';
import { QuotaGuard } from '../../../components/QuotaGuard';

const schema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4'] as [AspectRatio, ...AspectRatio[]]),
  quality: z.enum(['standard', 'hd'] as [ImageQuality, ...ImageQuality[]]),
});

type FormData = z.infer<typeof schema>;

const ASPECT_RATIOS: { key: AspectRatio; w: number; h: number }[] = [
  { key: '1:1', w: 18, h: 18 },
  { key: '16:9', w: 22, h: 13 },
  { key: '9:16', w: 13, h: 22 },
  { key: '4:3', w: 20, h: 15 },
];

function SparkleIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15v3M17.5 16.5h3" />
    </svg>
  );
}

interface TextPromptFormProps {
  onJobStarted: (jobId: string) => void;
}

export function TextPromptForm({ onJobStarted }: TextPromptFormProps) {
  const { mutation } = useTextGeneration();
  const [ar, setAr] = useState<AspectRatio>('1:1');
  const [quality, setQuality] = useState<ImageQuality>('standard');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { aspectRatio: '1:1', quality: 'standard' },
  });

  const promptValue = watch('prompt') ?? '';

  function onSubmit(data: FormData) {
    mutation.mutate(
      { ...data, aspectRatio: ar, quality },
      { onSuccess: ({ jobId }) => onJobStarted(jobId) }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Prompt */}
      <div>
        <div className="mb-2 text-[12.5px] font-medium">Prompt</div>
        <textarea
          {...register('prompt')}
          rows={5}
          placeholder="Describe the image you want to generate…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-[13.5px] leading-[1.55] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          aria-describedby={errors.prompt ? 'prompt-error' : undefined}
        />
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>
            {errors.prompt ? (
              <span id="prompt-error" className="text-destructive">
                {errors.prompt.message}
              </span>
            ) : (
              'Describe subject, lighting, style.'
            )}
          </span>
          <span>{promptValue.length} / 1000</span>
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <div className="mb-2 text-[12.5px] font-medium">Aspect ratio</div>
        <div className="grid grid-cols-4 gap-2">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setAr(r.key)}
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-all ${
                ar === r.key
                  ? 'border-primary bg-soft text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <div
                style={{
                  width: r.w,
                  height: r.h,
                  border: '1.5px solid currentColor',
                  borderRadius: 2,
                }}
              />
              {r.key}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <div className="mb-2 flex justify-between text-[12.5px] font-medium">
          <span>Quality</span>
          <span className="font-normal text-muted-foreground">
            {quality === 'hd' ? 'HD' : 'Standard'}
          </span>
        </div>
        <div className="flex gap-1.5">
          {(['standard', 'hd'] as ImageQuality[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setQuality(k)}
              className={`flex-1 rounded-lg border py-2.5 text-[12.5px] font-medium transition-all ${
                quality === k
                  ? 'border-primary bg-soft text-primary'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              {k === 'hd' ? 'HD' : 'Standard'}
            </button>
          ))}
        </div>
      </div>

      {/* Model info */}
      <div className="flex items-center gap-3 rounded-[10px] border border-border bg-muted p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
          <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l10 5-10 5L2 8l10-5z" />
            <path d="M2 13l10 5 10-5M2 18l10 5 10-5" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[12.5px] font-medium">Stable Diffusion XL</div>
          <div className="text-[11px] text-muted-foreground">Stability AI · Primary</div>
        </div>
        <span className="rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          auto
        </span>
      </div>

      {/* Submit */}
      <QuotaGuard>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-[11px] text-[14.5px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <SparkleIcon />
          {mutation.isPending ? 'Generating…' : 'Generate · 1 credit'}
        </button>
      </QuotaGuard>
    </form>
  );
}
