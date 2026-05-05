import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPresignedUploadUrl, uploadFileToS3 } from '../../../services/image.service';
import {
  useExtractInfluencerDna,
  useGeneratePreviewImage,
  useCreateInfluencer,
} from '../hooks/useCreateInfluencer';
import type { CharacterDna, Influencer } from '@ai-platform/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  descriptionText: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;
type Step = 'form' | 'preview';
type SourceMode = 'photo' | 'text';

interface Props {
  onCreated: (influencer: Influencer) => void;
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { key: 'form', label: 'Define' },
    { key: 'preview', label: 'Preview & save' },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-3.5">
      {steps.map((s, i, arr) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-center gap-3.5">
            <div
              className={`flex items-center gap-2.5 ${active ? 'opacity-100' : done ? 'opacity-70' : 'opacity-40'}`}
            >
              <div
                className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[12px] font-semibold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? (
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="text-[13px] font-medium">{s.label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className={`h-px w-10 ${done ? 'bg-emerald-500' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DnaChip({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-[8px] border border-border bg-tint p-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
        {label}
      </div>
      <div className={`text-[12px] leading-snug ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function ImageLoadingSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted/30">
      {/* Pulsing avatar placeholder */}
      <div className="relative flex flex-col items-center gap-3">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted-foreground/20" />
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-2.5 w-24 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-2 w-16 animate-pulse rounded bg-muted-foreground/15" />
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <svg
          className="animate-spin"
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        Generating profile image…
      </div>
    </div>
  );
}

function ImageErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/20 p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500">
        <svg
          width={18}
          height={18}
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
      </div>
      <div className="text-[12px] text-muted-foreground">Image generation failed</div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-[7px] border border-border bg-background px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted"
      >
        <svg
          width={11}
          height={11}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        Retry
      </button>
    </div>
  );
}

export function CreateInfluencerForm({ onCreated }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [sourceMode, setSourceMode] = useState<SourceMode>('photo');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | undefined>();
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [characterDna, setCharacterDna] = useState<CharacterDna | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [formSnapshot, setFormSnapshot] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const extractDnaMutation = useExtractInfluencerDna();
  const previewImageMutation = useGeneratePreviewImage();
  const saveMutation = useCreateInfluencer();

  const descriptionText = watch('descriptionText');
  const nameValue = watch('name');

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setSourceFile(file);
    setFilePreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  function runPreviewImage(dna: CharacterDna, name: string, srcImageUrl?: string) {
    setProfileImageUrl(null);
    previewImageMutation.mutate(
      {
        name,
        characterDna: dna as unknown as Record<string, unknown>,
        sourceImageUrl: srcImageUrl,
      },
      {
        onSuccess: (data) => setProfileImageUrl(data.profileImageUrl),
      }
    );
  }

  async function onSubmit(values: FormValues) {
    if (!sourceFile && !values.descriptionText) return;

    let uploadedKey: string | undefined;
    if (sourceFile) {
      setIsUploading(true);
      try {
        const { uploadUrl, key } = await getPresignedUploadUrl(sourceFile.name, sourceFile.type);
        await uploadFileToS3(uploadUrl, sourceFile);
        uploadedKey = key;
        setSourceImageUrl(key);
      } finally {
        setIsUploading(false);
      }
    }

    setFormSnapshot(values);

    extractDnaMutation.mutate(
      {
        name: values.name,
        description: values.description,
        sourceImageUrl: uploadedKey,
        descriptionText: values.descriptionText,
      },
      {
        onSuccess: (dnaData) => {
          const dna = dnaData.characterDna as unknown as CharacterDna;
          setCharacterDna(dna);
          setStep('preview');
          runPreviewImage(dna, values.name, uploadedKey);
        },
      }
    );
  }

  function handleRegenerate() {
    if (!characterDna || !formSnapshot) return;
    runPreviewImage(characterDna, formSnapshot.name, sourceImageUrl);
  }

  function handleSave() {
    if (!characterDna || !profileImageUrl || !formSnapshot) return;
    saveMutation.mutate(
      {
        name: formSnapshot.name,
        description: formSnapshot.description,
        sourceImageUrl,
        characterDna: characterDna as unknown as Record<string, unknown>,
        profileImageUrl,
      },
      { onSuccess: (influencer) => onCreated(influencer) }
    );
  }

  function handleStartOver() {
    setStep('form');
    setCharacterDna(null);
    setProfileImageUrl(null);
    setFormSnapshot(null);
    setSourceFile(null);
    setFilePreview(null);
    setSourceImageUrl(undefined);
    reset();
  }

  const isLoadingImage = previewImageMutation.isPending;
  const imageError = previewImageMutation.isError;
  const canSave = !!profileImageUrl && !isLoadingImage && !imageError;

  // ── Step 2: Preview ──────────────────────────────────────────────────────────
  if (step === 'preview' && characterDna) {
    const dna = characterDna;
    const faceAnchor = dna?.face_anchor;
    const seed = dna?.seed;

    return (
      <div className="flex flex-col gap-6">
        <StepIndicator current="preview" />

        <div className="overflow-hidden rounded-[12px] border border-border bg-card">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)' }}>
            {/* Profile image panel */}
            <div className="relative bg-muted" style={{ aspectRatio: '9/16' }}>
              {isLoadingImage && <ImageLoadingSkeleton />}
              {imageError && !isLoadingImage && <ImageErrorState onRetry={handleRegenerate} />}
              {profileImageUrl && !isLoadingImage && (
                <>
                  <img
                    src={profileImageUrl}
                    alt="Generated profile"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <svg
                      width={10}
                      height={10}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
                    </svg>
                    PROFILE IMAGE
                  </div>
                  {/* Regenerate button overlay */}
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[8px] bg-black/60 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                  >
                    <svg
                      width={11}
                      height={11}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    Regenerate
                  </button>
                </>
              )}
            </div>

            {/* Details panel */}
            <div className="flex flex-col gap-5 p-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  DNA extracted
                </span>
                <div className="mt-2 font-display text-[22px] font-medium tracking-[-0.5px]">
                  Meet {formSnapshot?.name}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                  {isLoadingImage
                    ? 'Profile image generating — DNA is locked and ready. Every future generation anchors to this identity.'
                    : 'This is the canonical profile. Every future generation will use this as an img2img reference, locking the face to what you see here.'}
                </p>
              </div>

              {/* DNA breakdown */}
              <div>
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  <svg
                    width={11}
                    height={11}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
                  </svg>
                  Character DNA
                </div>
                {faceAnchor && (
                  <div className="mb-2.5 rounded-[10px] border border-primary/25 bg-soft p-3 text-[12.5px] leading-snug">
                    <span className="font-semibold text-primary">face_anchor</span>
                    {' · '}
                    {faceAnchor}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {seed !== undefined && (
                    <DnaChip label="seed" value={`0x${seed.toString(16).padStart(8, '0')}`} mono />
                  )}
                  {dna?.immutable?.facial_topology && (
                    <DnaChip label="face shape" value={dna.immutable.facial_topology} />
                  )}
                  {dna?.immutable?.skin_texture && (
                    <DnaChip label="skin" value={dna.immutable.skin_texture} />
                  )}
                  {dna?.dynamic?.wardrobe && (
                    <DnaChip label="wardrobe" value={dna.dynamic.wardrobe} />
                  )}
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-[10px] border border-border bg-tint p-3 text-[11.5px] leading-relaxed text-muted-foreground">
                <span className="block font-semibold text-foreground">When you save</span>
                Profile image stored in your gallery · DNA + seed locked · all future gens use this
                image as a reference at strength 0.25
              </div>

              {/* Actions */}
              <div className="mt-auto flex gap-2.5">
                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5 rounded-[8px] border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || saveMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin"
                        width={13}
                        height={13}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Saving…
                    </>
                  ) : isLoadingImage ? (
                    <>
                      <svg
                        className="animate-spin opacity-60"
                        width={13}
                        height={13}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Generating image…
                    </>
                  ) : (
                    <>
                      <svg
                        width={13}
                        height={13}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12l5 5L20 6" />
                      </svg>
                      Save influencer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {!isLoadingImage && (
          <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
            <strong>Heads up</strong> — if you don't save, this profile image is discarded.
            Regenerating costs another credit.
          </p>
        )}
      </div>
    );
  }

  // ── Step 1: Form ──────────────────────────────────────────────────────────────
  const isExtracting = extractDnaMutation.isPending;
  const isLoading = isUploading || isExtracting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <StepIndicator current="form" />

      <div className="overflow-hidden rounded-[12px] border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border px-7 py-6">
          <h2 className="font-display text-[22px] font-medium tracking-[-0.4px]">
            Tell us about your character
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            We'll extract a precise face description and generate a canonical profile image you can
            use as a reference.
          </p>
        </div>

        <div className="flex flex-col gap-6 px-7 py-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              placeholder="e.g. Maya Chen"
              className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used to derive a deterministic seed — same name → similar starting point.
            </p>
            {errors.name && (
              <p className="mt-1 text-[11.5px] text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Source mode toggle */}
          <div>
            <label className="mb-2 block text-[12px] font-medium">Reference</label>
            <div className="mb-3 flex gap-1.5 rounded-[10px] bg-muted p-[3px]">
              {(
                [
                  ['photo', 'Source photo'],
                  ['text', 'Description'],
                ] as const
              ).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSourceMode(k)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-[9px] text-[13px] font-medium transition-all ${
                    sourceMode === k
                      ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {sourceMode === 'photo' ? (
              filePreview ? (
                <div className="relative overflow-hidden rounded-[10px] border border-border">
                  <img src={filePreview} alt="Source" className="h-44 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSourceFile(null);
                      setFilePreview(null);
                    }}
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
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[12px] border-2 border-dashed p-7 text-center transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                    <svg
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 15V3M6 9l6-6 6 6M4 21h16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-medium">Drop a photo or click to upload</div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      JPG, PNG · up to 10 MB · single subject works best
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-2 rounded-[7px] border border-border bg-background px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted"
                  >
                    Choose file
                  </button>
                </div>
              )
            ) : (
              <div>
                <textarea
                  {...register('descriptionText')}
                  rows={5}
                  placeholder="A 28-year-old woman with warm olive skin, a soft heart-shaped face, and dark almond eyes. Long wavy brown hair parted in the middle. Subtle freckles across the nose."
                  className="w-full resize-none rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13.5px] leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>Be specific about face — skin, eyes, lips, distinctive features.</span>
                  <span>{descriptionText?.length ?? 0} / 2000</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-[12px] font-medium">
              Notes <span className="text-muted-foreground font-normal">· optional</span>
            </label>
            <input
              {...register('description')}
              placeholder="e.g. fashion influencer, bohemian style, often in golden-hour outdoor scenes"
              className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Cost preview */}
          <div className="flex items-center gap-3.5 rounded-[10px] border border-primary/25 bg-soft p-3.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-medium text-primary">
                Two-step process · ~20 seconds total
              </div>
              <div className="text-[11.5px] text-primary/80">
                DNA extracted first · profile image generates in preview
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-card px-7 py-4">
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v5h1" />
            </svg>
            Profile image is portrait (9:16)
          </div>
          <button
            type="submit"
            disabled={isLoading || (!sourceFile && !descriptionText) || !nameValue}
            className="flex items-center gap-1.5 rounded-[8px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin"
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {isUploading ? 'Uploading…' : 'Extracting DNA…'}
              </>
            ) : (
              <>
                <svg
                  width={13}
                  height={13}
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
                Generate profile image
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
