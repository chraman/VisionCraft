import { ImageGrid } from '../components/ImageGrid';
import { useSavedImages } from '../hooks/useSavedImages';
import { Spinner } from '@ai-platform/ui';

export default function GalleryPage() {
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSavedImages({ limit: 20 });

  const images = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 items-center justify-center text-red-600">
        Failed to load images. Please try again.
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Saved Images</h1>
      <ImageGrid
        images={images}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />
    </div>
  );
}
