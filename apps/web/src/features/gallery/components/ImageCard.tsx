import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import type { Image } from '@ai-platform/types';
import { useImageActions } from '../hooks/useImageActions';

interface ImageCardProps {
  image: Image;
  onClick?: () => void;
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const [hovered, setHovered] = useState(false);
  const { saveMutation, deleteMutation } = useImageActions();

  const src = image.cdnUrl ?? image.url;

  return (
    <div
      className="group relative overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <LazyLoadImage
        src={src}
        alt={image.prompt}
        effect="blur"
        className="h-full w-full object-cover"
        wrapperClassName="block h-full w-full"
      />

      {hovered && (
        <div
          className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2">
            {!image.isSaved && (
              <button
                className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-white"
                onClick={() => saveMutation.mutate(image.id)}
                disabled={saveMutation.isPending}
              >
                Save
              </button>
            )}
            <button
              className="rounded-md bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
              onClick={() => deleteMutation.mutate(image.id)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
