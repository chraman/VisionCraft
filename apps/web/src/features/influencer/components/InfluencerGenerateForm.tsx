import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInfluencers } from '../hooks/useInfluencers';
import { useInfluencerGeneration } from '../hooks/useInfluencerGeneration';
import type { Influencer } from '@ai-platform/types';

const schema = z.object({
  influencerId: z.string().min(1, 'Select an influencer'),
  targetPrompt: z.string().min(3, 'Prompt too short').max(2000),
  emotionModifier: z.string().max(200).optional(),
  sceneParams: z.string().max(500).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  useInt8: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  preSelectedInfluencerId?: string | null;
  onJobStarted: (jobId: string) => void;
  onSubmitStart: () => void;
  onSubmitError: () => void;
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;

export function InfluencerGenerateForm({
  preSelectedInfluencerId,
  onJobStarted,
  onSubmitStart,
  onSubmitError,
}: Props) {
  const { data } = useInfluencers();
  const { mutation } = useInfluencerGeneration();

  const influencers: Influencer[] = data?.pages.flatMap((p) => p.data) ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      influencerId: preSelectedInfluencerId ?? '',
      aspectRatio: '1:1',
      quality: 'standard',
      useInt8: false,
    },
  });

  const aspectRatio = watch('aspectRatio');
  const quality = watch('quality');

  function onSubmit(values: FormValues) {
    onSubmitStart();
    mutation.mutate(
      {
        influencerId: values.influencerId,
        targetPrompt: values.targetPrompt,
        emotionModifier: values.emotionModifier || undefined,
        sceneParams: values.sceneParams || undefined,
        aspectRatio: values.aspectRatio,
        quality: values.quality,
        useInt8: values.useInt8,
      },
      {
        onSuccess: ({ jobId }) => onJobStarted(jobId),
        onError: () => onSubmitError(),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Influencer selector */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Influencer <span className="text-red-500">*</span>
        </label>
        <select
          {...register('influencerId')}
          className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Select an influencer…</option>
          {influencers.map((inf) => (
            <option key={inf.id} value={inf.id}>
              {inf.name}
            </option>
          ))}
        </select>
        {errors.influencerId && (
          <p className="mt-1 text-[11.5px] text-red-500">{errors.influencerId.message}</p>
        )}
      </div>

      {/* Target prompt */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Scene prompt <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('targetPrompt')}
          rows={4}
          placeholder="Standing in a sunlit Tokyo street, holding a coffee cup…"
          className="w-full resize-none rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {errors.targetPrompt && (
          <p className="mt-1 text-[11.5px] text-red-500">{errors.targetPrompt.message}</p>
        )}
      </div>

      {/* Emotion modifier */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Emotion modifier
        </label>
        <input
          {...register('emotionModifier')}
          placeholder="e.g. warm smile, confident pose"
          className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Scene params */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Scene &amp; lighting
        </label>
        <input
          {...register('sceneParams')}
          placeholder="e.g. golden hour, shallow depth of field, bokeh"
          className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Aspect ratio
        </label>
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar}
              type="button"
              onClick={() => setValue('aspectRatio', ar)}
              className={`flex-1 rounded-[7px] py-[7px] text-[11.5px] font-medium transition-colors ${
                aspectRatio === ar
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">Quality</label>
        <div className="flex gap-1 rounded-[10px] bg-muted p-[3px]">
          {(['standard', 'hd'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setValue('quality', q)}
              className={`flex-1 rounded-[7px] py-[7px] text-[12.5px] font-semibold transition-all ${
                quality === q
                  ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {q === 'standard' ? 'Standard' : 'HD'}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced — int8 */}
      <details className="rounded-[8px] border border-border p-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-muted-foreground">
          Advanced
        </summary>
        <label className="mt-3 flex items-center gap-2 text-[12.5px] text-foreground">
          <input type="checkbox" {...register('useInt8')} className="rounded" />
          Use 8-bit precision (local model only — reduces VRAM)
        </label>
      </details>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-[8px] bg-primary py-[10px] text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? 'Generating…' : 'Generate'}
      </button>
    </form>
  );
}
