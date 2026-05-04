import { useCallback, useRef, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import { useImgToImg } from '../hooks/useImgToImg';
import { QuotaGuard } from '../../../components/QuotaGuard';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

const MAX_IMAGES = 4;

const schema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  strength: z.number().min(0.1).max(1.0).default(0.55),
});

type FormData = z.infer<typeof schema>;

interface UploadEntry {
  file: File;
  preview: string;
}

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

function PlusIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function XIcon() {
  return (
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
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

interface ImageUploaderProps {
  onJobStarted: (jobId: string) => void;
  onSubmitStart?: () => void;
  onSubmitError?: () => void;
}

export function ImageUploader({ onJobStarted, onSubmitStart, onSubmitError }: ImageUploaderProps) {
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const { mutation } = useImgToImg();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { strength: 0.55 },
  });

  const strength = watch('strength');

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        track({ event: 'upload_failed', userId: user?.id });
        return;
      }

      const remaining = MAX_IMAGES - uploads.length;
      const toProcess = acceptedFiles.slice(0, remaining);

      const compressed = await Promise.all(
        toProcess.map((raw) =>
          imageCompression(raw, { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true })
        )
      );

      setUploads((prev) => [
        ...prev,
        ...compressed.map((c) => ({ file: c as unknown as File, preview: URL.createObjectURL(c) })),
      ]);
    },
    [uploads.length, user?.id]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: MAX_IMAGES,
    maxSize: 10 * 1024 * 1024,
    disabled: uploads.length >= MAX_IMAGES,
  });

  function removeUpload(index: number) {
    setUploads((prev) => {
      URL.revokeObjectURL(prev[index]!.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function insertReference(imageNumber: number) {
    const ref = `[image${imageNumber}]`;
    const textarea = promptRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const current = textarea.value;
    const next = current.slice(0, start) + ref + current.slice(end);

    setValue('prompt', next, { shouldValidate: true });

    // Restore cursor position after the inserted reference
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + ref.length, start + ref.length);
    });
  }

  function onSubmit(data: FormData) {
    if (uploads.length === 0) return;
    onSubmitStart?.();
    mutation.mutate(
      { files: uploads.map((u) => u.file), prompt: data.prompt, strength: data.strength },
      {
        onSuccess: ({ jobId }) => onJobStarted(jobId),
        onError: () => onSubmitError?.(),
      }
    );
  }

  const { ref: rhfRef, ...promptRest } = register('prompt');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Image grid */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[12.5px] font-medium">
          <span>Reference images</span>
          <span className="font-normal text-muted-foreground">
            {uploads.length}/{MAX_IMAGES}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {uploads.map((entry, i) => (
            <div
              key={entry.preview}
              className="group relative overflow-hidden rounded-[10px] bg-muted"
              style={{ aspectRatio: '1/1' }}
            >
              <img
                src={entry.preview}
                alt={`Reference ${i + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Label badge */}
              <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-sm">
                [image{i + 1}]
              </span>

              {/* Overlay controls */}
              <div className="absolute inset-0 flex flex-col items-center justify-end gap-1.5 bg-black/0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => insertReference(i + 1)}
                  className="w-full rounded-md bg-black/65 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                >
                  Insert reference
                </button>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeUpload(i)}
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                aria-label="Remove image"
              >
                <XIcon />
              </button>
            </div>
          ))}

          {/* Add slot */}
          {uploads.length < MAX_IMAGES && (
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed transition-colors ${
                isDragActive
                  ? 'border-primary bg-soft'
                  : 'border-border bg-muted hover:border-primary/50 hover:bg-soft/50'
              } ${uploads.length === 0 ? 'col-span-2 py-8' : ''}`}
              style={uploads.length > 0 ? { aspectRatio: '1/1' } : undefined}
            >
              <input {...getInputProps()} />
              {uploads.length === 0 ? (
                <>
                  <svg
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-2 text-muted-foreground"
                  >
                    <path d="M12 15V3M6 9l6-6 6 6M4 21h16" />
                  </svg>
                  <p className="text-[13px] font-medium text-foreground">
                    {isDragActive ? 'Drop here…' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Up to {MAX_IMAGES} images · PNG, JPG, WEBP · 10 MB each
                  </p>
                </>
              ) : (
                <PlusIcon />
              )}
            </div>
          )}
        </div>

        {uploads.length > 0 && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Hover an image and click <strong>Insert reference</strong> to use{' '}
            <code className="rounded bg-muted px-1">[imageN]</code> in your prompt.
          </p>
        )}
      </div>

      {/* Prompt */}
      <div>
        <div className="mb-2 text-[12.5px] font-medium">Prompt</div>
        <textarea
          {...promptRest}
          ref={(el) => {
            rhfRef(el);
            promptRef.current = el;
          }}
          rows={4}
          placeholder={
            uploads.length > 1
              ? 'e.g. Give the character from [image1] the outfit from [image2]…'
              : 'Describe the transformation…'
          }
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-3 text-[13.5px] leading-[1.55] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          aria-describedby={errors.prompt ? 'img-prompt-error' : undefined}
        />
        {errors.prompt && (
          <p id="img-prompt-error" className="mt-1 text-[11.5px] text-destructive">
            {errors.prompt.message}
          </p>
        )}
      </div>

      {/* Transform strength */}
      <div>
        <div className="mb-2 flex justify-between text-[12.5px] font-medium">
          <span>Transform strength</span>
          <span className="font-mono font-normal text-muted-foreground">{strength.toFixed(2)}</span>
        </div>
        <Controller
          name="strength"
          control={control}
          render={({ field }) => (
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={field.value}
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          )}
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
          <span>Subtle change</span>
          <span>Reimagine</span>
        </div>
      </div>

      {/* Submit */}
      <QuotaGuard>
        <button
          type="submit"
          disabled={mutation.isPending || uploads.length === 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-[11px] text-[14.5px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <SparkleIcon />
          {mutation.isPending ? 'Transforming…' : 'Transform · 1 credit'}
        </button>
      </QuotaGuard>
    </form>
  );
}
