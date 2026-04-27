import { useRef, useEffect, useCallback, useState } from 'react';
import type { Image } from '@ai-platform/types';
import { ImageCard } from './ImageCard';
import { GalleryLightbox } from './GalleryLightbox';
import { Spinner } from '@ai-platform/ui';

interface ImageGridProps {
  images: Image[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function ImageGrid({ images, hasNextPage, isFetchingNextPage, onLoadMore }: ImageGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        onLoadMore();
      }
    },
    [hasNextPage, isFetchingNextPage, onLoadMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [handleObserver]);

  return (
    <div>
      {/* CSS columns masonry grid */}
      <div className="columns-4 gap-3.5">
        {images.map((image, index) => (
          <div key={image.id} className="mb-3.5 break-inside-avoid">
            <ImageCard image={image} onClick={() => setLightboxIndex(index)} />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-4 flex justify-center py-2">
        {isFetchingNextPage && <Spinner size="md" />}
      </div>

      <GalleryLightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} />
    </div>
  );
}
