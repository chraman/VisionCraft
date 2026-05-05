import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPresignedUploadUrl, uploadFileToS3 } from '../../../services/image.service';
import { useCreateInfluencer } from '../hooks/useCreateInfluencer';
import type { CharacterDna, Influencer } from '@ai-platform/types';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    descriptionText: z.string().max(2000).optional(),
  })
  .refine((d) => d.descriptionText || true, {
    message: 'Provide a description or upload an image',
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  onCreated: (influencer: Influencer) => void;
}

export function CreateInfluencerForm({ onCreated }: Props) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedDna, setExtractedDna] = useState<CharacterDna | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useCreateInfluencer();
  const descriptionText = watch('descriptionText');

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setSourceFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  async function onSubmit(values: FormValues) {
    if (!sourceFile && !values.descriptionText) {
      return;
    }

    let sourceImageUrl: string | undefined;

    if (sourceFile) {
      setIsUploading(true);
      try {
        const { uploadUrl, key } = await getPresignedUploadUrl(sourceFile.name, sourceFile.type);
        await uploadFileToS3(uploadUrl, sourceFile);
        sourceImageUrl = key;
      } finally {
        setIsUploading(false);
      }
    }

    mutation.mutate(
      {
        name: values.name,
        description: values.description,
        sourceImageUrl,
        descriptionText: values.descriptionText,
      },
      {
        onSuccess: (influencer) => {
          setExtractedDna(influencer.characterDna);
          onCreated(influencer);
        },
      }
    );
  }

  const isLoading = isUploading || mutation.isPending;

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
        {preview ? (
          <div className="relative rounded-[8px] overflow-hidden border border-border">
            <img src={preview} alt="Source" className="w-full h-40 object-cover" />
            <button
              type="button"
              onClick={() => {
                setSourceFile(null);
                setPreview(null);
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
            className={`flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
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
            className="w-full rounded-[8px] border border-input bg-background px-3 py-[9px] text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
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
        {isUploading ? 'Uploading…' : mutation.isPending ? 'Extracting DNA…' : 'Create Influencer'}
      </button>

      {/* DNA summary after extraction */}
      {extractedDna && (
        <details className="rounded-[8px] border border-border bg-muted p-3">
          <summary className="cursor-pointer text-[12px] font-semibold text-muted-foreground">
            Extracted DNA — view details
          </summary>
          <div className="mt-2 space-y-1 text-[11.5px] text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Face:</span>{' '}
              {extractedDna.immutable.facial_topology}
            </p>
            <p>
              <span className="font-medium text-foreground">Skin:</span>{' '}
              {extractedDna.immutable.skin_texture}
            </p>
            <p>
              <span className="font-medium text-foreground">Bone:</span>{' '}
              {extractedDna.immutable.bone_structure}
            </p>
            <p>
              <span className="font-medium text-foreground">Body:</span>{' '}
              {extractedDna.immutable.body_morphology}
            </p>
            <p>
              <span className="font-medium text-foreground">Wardrobe:</span>{' '}
              {extractedDna.dynamic.wardrobe}
            </p>
            <p>
              <span className="font-medium text-foreground">Lighting:</span>{' '}
              {extractedDna.dynamic.lighting}
            </p>
          </div>
        </details>
      )}
    </form>
  );
}
