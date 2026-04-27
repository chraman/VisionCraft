import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useImgToImg } from '../hooks/useImgToImg';
import { QuotaGuard } from '../../../components/QuotaGuard';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

const schema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  strength: z.number().min(0.1).max(1.0).default(0.55),
});

type FormData = z.infer<typeof schema>;

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

interface ImageUploaderProps {
  onJobStarted: (jobId: string) => void;
}

export function ImageUploader({ onJobStarted }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const { mutation } = useImgToImg();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
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
      const rawFile = acceptedFiles[0];
      if (!rawFile) return;

      const compressed = await imageCompression(rawFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      setFile(compressed as unknown as File);
      setPreview(URL.createObjectURL(compressed));
    },
    [user?.id]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  function onSubmit(data: FormData) {
    if (!file) return;
    mutation.mutate(
      { file, prompt: data.prompt, strength: data.strength },
      { onSuccess: ({ jobId }) => onJobStarted(jobId) }
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Reference image upload */}
      <div>
        <div className="mb-2 text-[12.5px] font-medium">Reference image</div>
        {!preview ? (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-[1.5px] border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? 'border-primary bg-soft'
                : 'border-border bg-muted hover:border-primary/50 hover:bg-soft/50'
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
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2 text-muted-foreground"
            >
              <path d="M12 15V3M6 9l6-6 6 6M4 21h16" />
            </svg>
            <p className="text-[13px] font-medium text-foreground">
              {isDragActive ? 'Drop here…' : 'Drag & drop or click to upload'}
            </p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">PNG, JPG, WEBP up to 10 MB</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[10px]" style={{ aspectRatio: '1/1' }}>
            <ReactCrop crop={crop} onChange={setCrop}>
              <img src={preview} alt="Upload preview" className="h-full w-full object-cover" />
            </ReactCrop>
            <div className="absolute inset-x-0 top-0 flex justify-between p-2">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur-sm"
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                }}
              >
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
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Replace
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] text-white backdrop-blur-sm"
              >
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
                  <path d="M6 2v16h16M18 22V6H2" />
                </svg>
                Crop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div>
        <div className="mb-2 text-[12.5px] font-medium">Prompt</div>
        <textarea
          {...register('prompt')}
          rows={4}
          placeholder="Describe the transformation…"
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
          disabled={mutation.isPending || !file}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-[11px] text-[14.5px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <SparkleIcon />
          {mutation.isPending ? 'Transforming…' : 'Transform · 1 credit'}
        </button>
      </QuotaGuard>
    </form>
  );
}
