import { useRef, useEffect, useCallback, useState } from 'react';
import { RowsPhotoAlbum } from 'react-photo-album';
import 'react-photo-album/rows.css';
import type { RenderPhotoProps, RenderPhotoContext } from 'react-photo-album';
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

interface AlbumPhoto {
  src: string;
  width: number;
  height: number;
  key: string;
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

  const photos: AlbumPhoto[] = images.map((img) => ({
    src: img.cdnUrl ?? img.url,
    width: img.width || 512,
    height: img.height || 512,
    key: img.id,
  }));

  if (images.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No saved images yet. Generate some images to get started!
      </div>
    );
  }

  return (
    <div>
      <RowsPhotoAlbum
        photos={photos}
        render={{
          photo: (_props: RenderPhotoProps, context: RenderPhotoContext<AlbumPhoto>) => {
            const image = images.find((img) => img.id === context.photo.key);
            const index = images.findIndex((img) => img.id === context.photo.key);
            if (!image) return null;
            return (
              <ImageCard
                key={context.photo.key}
                image={image}
                onClick={() => setLightboxIndex(index)}
              />
            );
          },
        }}
      />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-4 flex justify-center">
        {isFetchingNextPage && <Spinner size="md" />}
      </div>

      <GalleryLightbox images={images} index={lightboxIndex} onClose={() => setLightboxIndex(-1)} />
    </div>
  );
}
