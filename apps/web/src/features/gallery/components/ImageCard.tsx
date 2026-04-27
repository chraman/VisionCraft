import { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import type { Image } from '@ai-platform/types';
import { useImageActions } from '../hooks/useImageActions';

interface ImageCardProps {
  image: Image;
  onClick?: () => void;
}

function HeartIcon() {
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
      <path d="M12 21s-7-4.5-9.5-9.5A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5.5C19 16.5 12 21 12 21z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
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
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { deleteMutation } = useImageActions();

  const src = image.cdnUrl ?? image.url;

  return (
    <div className="group relative cursor-pointer overflow-hidden rounded-[10px]" onClick={onClick}>
      <LazyLoadImage
        src={src}
        alt={image.prompt}
        effect="blur"
        className="h-full w-full object-cover"
        wrapperClassName="block h-full w-full"
      />

      {/* Hover overlay actions */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {/* Top-right actions */}
        <div className="absolute right-2 top-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,.5)' }}
            title="Like"
          >
            <HeartIcon />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,.5)' }}
            onClick={() => setShowMenu((v) => !v)}
            title="More options"
          >
            <MoreIcon />
          </button>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div
            className="absolute right-2 top-[72px] z-10 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                deleteMutation.mutate(image.id);
                setShowMenu(false);
              }}
              disabled={deleteMutation.isPending}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-destructive hover:bg-muted disabled:opacity-50"
            >
              <TrashIcon /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Model badge */}
      <div className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100">
        <span
          className="rounded-full px-2 py-[3px] text-[10px] font-medium text-white"
          style={{ background: 'rgba(0,0,0,.55)' }}
        >
          SDXL
        </span>
      </div>
    </div>
  );
}
