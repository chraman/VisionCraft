import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPresignedUploadUrl, uploadFileToS3 } from '../../../services/image.service';
import { usePreviewInfluencer, useCreateInfluencer } from '../hooks/useCreateInfluencer';
import type { Influencer, PreviewInfluencerResponse } from '@ai-platform/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  descriptionText: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;
type Step = 'form' | 'preview';

interface Props {
  onCreated: (influencer: Influencer) => void;
}

export function CreateInfluencerForm({ onCreated }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | undefined>();
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewInfluencerResponse | null>(null);
  const [formSnapshot, setFormSnapshot] = useState<FormValues | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const previewMutation = usePreviewInfluencer();
  const saveMutation = useCreateInfluencer();
  const descriptionText = watch('descriptionText');

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
    previewMutation.mutate(
      {
        name: values.name,
        description: values.description,
        sourceImageUrl: uploadedKey,
        descriptionText: values.descriptionText,
      },
      {
        onSuccess: (data) => {
          setPreviewData(data);
          setStep('preview');
        },
      }
    );
  }

  function handleSave() {
    if (!previewData || !formSnapshot) return;
    saveMutation.mutate(
      {
        name: formSnapshot.name,
        description: formSnapshot.description,
        sourceImageUrl,
        characterDna: previewData.characterDna as Record<string, unknown>,
        profileImageUrl: previewData.profileImageUrl,
      },
      {
        onSuccess: (influencer) => onCreated(influencer),
      }
    );
  }

  function handleStartOver() {
    setStep('form');
    setPreviewData(null);
    setFormSnapshot(null);
    setSourceFile(null);
    setFilePreview(null);
    setSourceImageUrl(undefined);
    reset();
  }

  const isLoading = isUploading || previewMutation.isPending;

  // ── Step 2: Preview ───────────────────────────────────────────────────────────
  if (step === 'preview' && previewData) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Profile image generated</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            This image will be used as the identity reference for all future generations.
          </p>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-border">
          <img
            src={previewData.profileImageUrl}
            alt="Generated profile"
            className="w-full object-cover"
            style={{ maxHeight: 420 }}
          />
        </div>

        <div className="text-[12px] font-semibold text-foreground">
          {formSnapshot?.name}
          {formSnapshot?.description && (
            <span className="ml-1 font-normal text-muted-foreground">
              — {formSnapshot.description}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex-1 rounded-[8px] bg-primary py-[10px] text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Influencer'}
          </button>
          <button
            type="button"
            onClick={handleStartOver}
            disabled={saveMutation.isPending}
            className="rounded-[8px] border border-border px-4 py-[10px] text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Form ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Influencer name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          placeholder="e.g. Aria Chen"
          className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {errors.name && <p className="mt-1 text-[11.5px] text-red-500">{errors.name.message}</p>}
      </div>

      {/* Description (for display) */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Display description
        </label>
        <input
          {...register('description')}
          placeholder="Short bio (optional)"
          className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Source image */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
          Source image
        </label>
        {filePreview ? (
          <div className="relative overflow-hidden rounded-[8px] border border-border">
            <img src={filePreview} alt="Source" className="h-40 w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setSourceFile(null);
                setFilePreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed p-6 text-center transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <input {...getInputProps()} />
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mb-2 text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p className="text-[12.5px] text-muted-foreground">
              Drop a photo here or <span className="text-primary">browse</span>
            </p>
          </div>
        )}
      </div>

      {/* Or — text description for DNA */}
      {!sourceFile && (
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
            Or describe the character
          </label>
          <textarea
            {...register('descriptionText')}
            rows={4}
            placeholder="Tall woman with high cheekbones, olive skin, dark wavy hair, athletic build..."
            className="w-full resize-none rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {!descriptionText && !sourceFile && (
            <p className="mt-1 text-[11.5px] text-amber-500">Provide an image or description</p>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-[8px] bg-primary py-[10px] text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isUploading
          ? 'Uploading…'
          : previewMutation.isPending
            ? 'Extracting DNA & generating profile…'
            : 'Generate Profile Image'}
      </button>
    </form>
  );
}
