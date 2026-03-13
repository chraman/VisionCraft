import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import imageCompression from 'browser-image-compression';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button, Input } from '@ai-platform/ui';
import { useImgToImg } from '../hooks/useImgToImg';
import { QuotaGuard } from '../../../components/QuotaGuard';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

const imgToImgSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000),
  strength: z.number().min(0.1).max(1.0).default(0.7),
});

type ImgToImgFormData = z.infer<typeof imgToImgSchema>;

export function ImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 100, height: 100, x: 0, y: 0 });
  const { mutation } = useImgToImg();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ImgToImgFormData>({
    resolver: zodResolver(imgToImgSchema),
    defaultValues: { strength: 0.7 },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        track({ event: 'upload_failed', userId: user?.id });
        return;
      }

      const rawFile = acceptedFiles[0];
      if (!rawFile) return;

      // Compress to < 1MB
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
    maxSize: 10 * 1024 * 1024, // 10MB before compression
  });

  async function onSubmit(data: ImgToImgFormData) {
    if (!file) return;
    mutation.mutate({ file, prompt: data.prompt, strength: data.strength });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400'
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop the image here…' : 'Drag & drop an image, or click to select'}
          </p>
          <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          <ReactCrop crop={crop} onChange={setCrop}>
            <img src={preview} alt="Upload preview" className="max-h-64 rounded-lg" />
          </ReactCrop>
          <button
            type="button"
            className="text-xs text-red-500 hover:underline"
            onClick={() => {
              setPreview(null);
              setFile(null);
            }}
          >
            Remove image
          </button>
        </div>
      )}

      <div>
        <label htmlFor="img2img-prompt" className="block text-sm font-medium text-gray-700">
          Prompt
        </label>
        <textarea
          id="img2img-prompt"
          rows={3}
          placeholder="Describe the transformation…"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-describedby={errors.prompt ? 'img2img-prompt-error' : undefined}
          {...register('prompt')}
        />
        {errors.prompt && (
          <p id="img2img-prompt-error" className="mt-1 text-xs text-red-600">
            {errors.prompt.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="strength" className="block text-sm font-medium text-gray-700">
          Strength:{' '}
          <Controller
            name="strength"
            control={control}
            render={({ field }) => <span>{field.value}</span>}
          />
        </label>
        <Controller
          name="strength"
          control={control}
          render={({ field }) => (
            <Input
              id="strength"
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              className="mt-1 w-full"
              value={field.value}
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
            />
          )}
        />
      </div>

      <QuotaGuard>
        <Button type="submit" className="w-full" disabled={mutation.isPending || !file}>
          {mutation.isPending ? 'Generating…' : 'Generate from image'}
        </Button>
      </QuotaGuard>
    </form>
  );
}
