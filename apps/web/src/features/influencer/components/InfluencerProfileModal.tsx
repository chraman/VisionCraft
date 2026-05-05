import { useEffect, useRef } from 'react';
import type { Influencer } from '@ai-platform/types';
import { useInfluencerImages } from '../hooks/useInfluencerImages';
import { ImageCard } from '../../gallery/components/ImageCard';
import { GalleryLightbox } from '../../gallery/components/GalleryLightbox';
import { Spinner } from '@ai-platform/ui';
import { useState, useCallback } from 'react';

interface Props {
  influencer: Influencer;
  onClose: () => void;
  onGenerate: () => void;
}

function DnaSection({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-border bg-muted/40 px-3 py-2.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
        {label}
      </div>
      <div className="text-[12px] leading-relaxed text-foreground">{value}</div>
    </div>
  );
}

export function InfluencerProfileModal({ influencer, onClose, onGenerate }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfluencerImages(
    influencer.id,
    { limit: 20 }
  );

  const images = data?.pages.flatMap((p) => p.data) ?? [];

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      obs.observe(node);
      sentinelRef.current = node;
      return () => obs.disconnect();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex < 0) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightboxIndex]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const dna = influencer.characterDna;
  const createdDate = new Date(influencer.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-[18px] border border-border bg-background shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Left panel — profile + DNA */}
        <div className="flex w-[300px] flex-shrink-0 flex-col overflow-y-auto border-r border-border">
          {/* Profile image */}
          <div className="relative flex-shrink-0" style={{ aspectRatio: '3/4' }}>
            {influencer.profileImageUrl ? (
              <img
                src={influencer.profileImageUrl}
                alt={influencer.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
            {/* Name overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
              <div className="text-[18px] font-semibold text-white">{influencer.name}</div>
              <div className="mt-0.5 text-[11px] text-white/60">{createdDate}</div>
            </div>
          </div>

          {/* DNA info */}
          <div className="flex flex-col gap-2.5 p-4">
            {/* Generate button */}
            <button
              onClick={onGenerate}
              className="flex w-full items-center justify-center gap-2 rounded-[9px] bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
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
              Generate image
            </button>

            {/* Description */}
            {influencer.description && (
              <div className="rounded-[8px] border border-border bg-muted/40 px-3 py-2.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  Description
                </div>
                <div className="text-[12px] leading-relaxed text-foreground">
                  {influencer.description}
                </div>
              </div>
            )}

            {/* Face anchor */}
            {dna?.face_anchor && <DnaSection label="Face anchor" value={dna.face_anchor} />}

            {/* Immutable traits */}
            {dna?.immutable && (
              <div className="rounded-[8px] border border-border bg-muted/40 px-3 py-2.5">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  Identity traits
                </div>
                <div className="flex flex-col gap-1.5">
                  {dna.immutable.facial_topology && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground">Face · </span>
                      <span className="text-[11.5px] text-foreground">
                        {dna.immutable.facial_topology}
                      </span>
                    </div>
                  )}
                  {dna.immutable.skin_texture && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground">Skin · </span>
                      <span className="text-[11.5px] text-foreground">
                        {dna.immutable.skin_texture}
                      </span>
                    </div>
                  )}
                  {dna.immutable.bone_structure && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground">Bone · </span>
                      <span className="text-[11.5px] text-foreground">
                        {dna.immutable.bone_structure}
                      </span>
                    </div>
                  )}
                  {dna.immutable.body_morphology && (
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground">Body · </span>
                      <span className="text-[11.5px] text-foreground">
                        {dna.immutable.body_morphology}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Anchoring prefix */}
            {dna?.anchoring_prefix && (
              <DnaSection label="Prompt anchor" value={dna.anchoring_prefix} />
            )}

            {/* Seed */}
            {dna?.seed != null && (
              <div className="flex items-center justify-between rounded-[8px] border border-border bg-muted/40 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
                  Seed
                </span>
                <span className="font-mono text-[12px] text-foreground">{dna.seed}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — generated images */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0 border-b border-border px-5 py-3.5">
            <h3 className="text-[14px] font-semibold">Generated images</h3>
            {!isLoading && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {images.length} {images.length === 1 ? 'image' : 'images'} generated
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : images.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m3 9 5-5 4 4 4-6 5 6" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] font-medium">No images yet</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Generate your first image using this influencer
                  </div>
                </div>
                <button
                  onClick={onGenerate}
                  className="mt-1 rounded-[8px] bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Generate now
                </button>
              </div>
            ) : (
              <>
                <div className="columns-3 gap-3">
                  {images.map((image, idx) => (
                    <div key={image.id} className="mb-3 break-inside-avoid">
                      <ImageCard image={image} onClick={() => setLightboxIndex(idx)} />
                    </div>
                  ))}
                </div>
                <div ref={observerRef} className="mt-2 flex justify-center py-2">
                  {isFetchingNextPage && <Spinner size="sm" />}
                </div>
              </>
            )}
          </div>
        </div>

        <GalleryLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      </div>
    </div>
  );
}
