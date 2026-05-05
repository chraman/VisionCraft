import { useInfluencerImages } from '../hooks/useInfluencerImages';
import { ImageGrid } from '../../gallery/components/ImageGrid';

interface Props {
  influencerId: string | null;
}

export function InfluencerGallery({ influencerId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfluencerImages(
    influencerId ?? '',
    { limit: 12 }
  );

  if (!influencerId) return null;

  const images = data?.pages.flatMap((p) => p.data) ?? [];

  if (!isLoading && images.length === 0) {
    return (
      <div className="mt-6 rounded-[10px] border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
        No images generated for this influencer yet.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 text-[12.5px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">
        Generated images
      </div>
      <ImageGrid
        images={images}
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />
    </div>
  );
}
