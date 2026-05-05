import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInfluencers } from '../hooks/useInfluencers';
import { useInfluencerGeneration } from '../hooks/useInfluencerGeneration';
import {
  getPresignedUploadUrl,
  uploadFileToS3,
  describeSceneImage,
} from '../../../services/image.service';
import type { Influencer } from '@ai-platform/types';

const schema = z.object({
  influencerId: z.string().min(1, 'Select an influencer'),
  targetPrompt: z.string().min(3, 'Prompt too short').max(2000),
  aspectRatio: z.enum(['1:1', '4:5', '9:16', '16:9']).default('9:16'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  referenceStrength: z.number().min(0.1).max(0.5).default(0.25),
  useInt8: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

const ASPECT_RATIOS = ['1:1', '4:5', '9:16', '16:9'] as const;

interface Props {
  preSelectedInfluencerId?: string | null;
  onJobStarted: (jobId: string) => void;
  onSubmitStart: () => void;
  onSubmitError: () => void;
}

function getStrengthLabel(s: number): { label: string; sub: string } {
  if (s < 0.18)
    return { label: 'Strong lock', sub: 'Faithful to the profile · less prompt influence' };
  if (s < 0.32) return { label: 'Recommended', sub: 'Balanced face fidelity & prompt adherence' };
  if (s < 0.42) return { label: 'Looser', sub: 'Prompt has more pull · face may drift slightly' };
  return { label: 'Creative drift', sub: 'Prompt-led · use only for stylized scenes' };
}

const GRADIENTS = [
  'linear-gradient(135deg,#f9d4c0,#d49b75)',
  'linear-gradient(135deg,#c4d8e8,#5d7a9a)',
  'linear-gradient(135deg,#d4e8d4,#6a9a6a)',
  'linear-gradient(135deg,#d4d4e8,#6a6a8a)',
  'linear-gradient(135deg,#e0d4f0,#8a6ab8)',
  'linear-gradient(135deg,#f0e4d4,#b87a50)',
];
function nameGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export function InfluencerGenerateForm({
  preSelectedInfluencerId,
  onJobStarted,
  onSubmitStart,
  onSubmitError,
}: Props) {
  const { data } = useInfluencers();
  const { mutation } = useInfluencerGeneration();

  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [scenePreview, setScenePreview] = useState<string | null>(null);
  const [isUploadingScene, setIsUploadingScene] = useState(false);
  const [isDescribingScene, setIsDescribingScene] = useState(false);

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
      aspectRatio: '9:16',
      quality: 'standard',
      referenceStrength: 0.25,
      useInt8: false,
    },
  });

  const influencerId = watch('influencerId');
  const aspectRatio = watch('aspectRatio');
  const quality = watch('quality');
  const referenceStrength = watch('referenceStrength');

  const selectedInfluencer = influencers.find((i) => i.id === influencerId) ?? null;
  const { label: strLabel, sub: strSub } = getStrengthLabel(referenceStrength);

  const onDropScene = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setSceneFile(file);
      setScenePreview(URL.createObjectURL(file));

      setIsDescribingScene(true);
      describeSceneImage(file)
        .then((prompt) => {
          setValue('targetPrompt', prompt, { shouldValidate: true });
        })
        .catch(() => {
          // silent — user can type prompt manually
        })
        .finally(() => {
          setIsDescribingScene(false);
        });
    },
    [setValue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropScene,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    noClick: false,
  });

  function clearSceneImage() {
    setSceneFile(null);
    if (scenePreview) {
      URL.revokeObjectURL(scenePreview);
      setScenePreview(null);
    }
    setIsDescribingScene(false);
  }

  async function onSubmit(values: FormValues) {
    onSubmitStart();

    let sceneImageUrl: string | undefined;
    if (sceneFile) {
      setIsUploadingScene(true);
      try {
        const { uploadUrl, key } = await getPresignedUploadUrl(sceneFile.name, sceneFile.type);
        await uploadFileToS3(uploadUrl, sceneFile);
        sceneImageUrl = key;
      } catch {
        onSubmitError();
        setIsUploadingScene(false);
        return;
      } finally {
        setIsUploadingScene(false);
      }
    }

    mutation.mutate(
      {
        influencerId: values.influencerId,
        targetPrompt: values.targetPrompt,
        aspectRatio: values.aspectRatio,
        quality: values.quality,
        referenceStrength: values.referenceStrength,
        useInt8: values.useInt8,
        sceneImageUrl,
      },
      {
        onSuccess: ({ jobId }) => onJobStarted(jobId),
        onError: () => onSubmitError(),
      }
    );
  }

  const isSubmitting = isUploadingScene || mutation.isPending || isDescribingScene;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Influencer pill picker */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            Influencer
          </label>
        </div>
        {influencers.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">
            No influencers yet — create one first.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {influencers.map((inf) => {
              const active = inf.id === influencerId;
              return (
                <button
                  key={inf.id}
                  type="button"
                  onClick={() => setValue('influencerId', inf.id)}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-medium transition-all ${
                    active
                      ? 'border-2 border-primary bg-soft text-primary'
                      : 'border-2 border-border bg-background text-foreground hover:border-primary/40'
                  }`}
                >
                  <div
                    className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                    style={{ background: inf.profileImageUrl ? undefined : nameGradient(inf.name) }}
                  >
                    {inf.profileImageUrl && (
                      <img
                        src={inf.profileImageUrl}
                        alt={inf.name}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <span>{inf.name}</span>
                  {active && (
                    <svg
                      width={11}
                      height={11}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {errors.influencerId && (
          <p className="mt-1 text-[11.5px] text-red-500">{errors.influencerId.message}</p>
        )}
      </div>

      {/* Locked profile preview */}
      {selectedInfluencer && (
        <div className="flex items-center gap-3 rounded-[10px] border border-border bg-tint p-3">
          <div
            className="relative h-[72px] w-14 flex-shrink-0 overflow-hidden rounded-[8px]"
            style={{
              background: selectedInfluencer.profileImageUrl
                ? undefined
                : nameGradient(selectedInfluencer.name),
            }}
          >
            {selectedInfluencer.profileImageUrl && (
              <img
                src={selectedInfluencer.profileImageUrl}
                alt={selectedInfluencer.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-1.5">
              <svg
                width={11}
                height={11}
                viewBox="0 0 24 24"
                fill="none"
                stroke="hsl(142 70% 38%)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
              </svg>
              <span className="text-[11px] font-semibold text-emerald-700">FACE LOCKED</span>
            </div>
            <div className="text-[13px] font-medium">{selectedInfluencer.name}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              face_anchor + img2img reference at strength {referenceStrength.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Scene prompt */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            Prompt <span className="text-red-500">*</span>
          </label>
          {isDescribingScene && (
            <span className="flex items-center gap-1.5 text-[10.5px] text-primary">
              <svg
                className="animate-spin"
                width={11}
                height={11}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
              </svg>
              Reading scene…
            </span>
          )}
        </div>
        <div className="relative">
          <textarea
            {...register('targetPrompt')}
            rows={4}
            disabled={isDescribingScene}
            placeholder={
              isDescribingScene
                ? 'Analyzing scene image with Gemini…'
                : 'Walking through a misty forest at golden hour, soft rim light, wearing a cream linen jacket, cinematic 35mm photography…'
            }
            className={`w-full resize-none rounded-[8px] border px-3 py-[9px] text-[13px] leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors ${
              isDescribingScene
                ? 'border-primary/40 bg-primary/5 text-muted-foreground'
                : 'border-input bg-background'
            }`}
          />
          {isDescribingScene && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[8px]">
              <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 shadow-sm">
                <svg
                  className="animate-spin text-primary"
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                </svg>
                <span className="text-[12px] font-medium text-primary">
                  Generating prompt from scene…
                </span>
              </div>
            </div>
          )}
        </div>
        {errors.targetPrompt && !isDescribingScene && (
          <p className="mt-1 text-[11.5px] text-red-500">{errors.targetPrompt.message}</p>
        )}
      </div>

      {/* Scene reference image */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
            Scene reference
            <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
              · optional
            </span>
          </label>
          {scenePreview && (
            <button
              type="button"
              onClick={clearSceneImage}
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Remove
            </button>
          )}
        </div>

        {scenePreview ? (
          <div className="relative overflow-hidden rounded-[10px] border border-border">
            <img src={scenePreview} alt="Scene reference" className="h-36 w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
                <svg
                  width={11}
                  height={11}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Scene composition · blended 80% with influencer profile
              </div>
            </div>
            <button
              type="button"
              onClick={clearSceneImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-2 border-dashed px-4 py-3.5 transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-tint'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground">
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium">
                {isDragActive ? 'Drop scene image here' : 'Add a scene reference image'}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Pose, setting, lighting reference · blended with influencer profile for composition
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reference strength slider */}
      <div className="rounded-[10px] border border-border bg-tint p-3.5">
        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[12px] font-semibold">
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
            </svg>
            Face lock strength
          </label>
          <span className="font-mono text-[13px] font-semibold text-primary">
            {referenceStrength.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={10}
          max={50}
          step={1}
          value={Math.round(referenceStrength * 100)}
          onChange={(e) => setValue('referenceStrength', Number(e.target.value) / 100)}
          className="w-full accent-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>0.10</span>
          <span>0.25</span>
          <span>0.50</span>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-semibold text-primary">{strLabel}</div>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{strSub}</div>
        </div>
        {sceneFile && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-[7px] bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700">
            <svg
              className="mt-px flex-shrink-0"
              width={11}
              height={11}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            Scene image active — composition uses 80% scene + 20% profile. Face lock strength
            applies to the profile blend only.
          </div>
        )}
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
          Aspect ratio
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar}
              type="button"
              onClick={() => setValue('aspectRatio', ar)}
              className={`rounded-[8px] py-2.5 text-[11.5px] font-medium transition-colors ${
                aspectRatio === ar
                  ? 'bg-foreground text-background'
                  : 'border border-border text-foreground hover:bg-muted'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div>
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
          Quality
        </label>
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

      {/* Advanced */}
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
        disabled={isSubmitting}
        className="w-full rounded-[8px] bg-primary py-[10px] text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isDescribingScene
          ? 'Reading scene…'
          : isUploadingScene
            ? 'Uploading scene…'
            : mutation.isPending
              ? 'Generating…'
              : 'Generate · 1 credit'}
      </button>
    </form>
  );
}
