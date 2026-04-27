import { useState } from 'react';
import { ImageGrid } from '../components/ImageGrid';
import { useSavedImages } from '../hooks/useSavedImages';
import { Spinner } from '@ai-platform/ui';

const FILTER_CHIPS = ['All', 'Text→Img', 'Img→Img', 'SDXL', 'DALL·E 3', 'This week', 'Starred'];

function SearchIcon() {
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
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function PlusIcon() {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FilterIcon() {
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
      <path d="M3 5h18l-7 8v6l-4-2v-4z" />
    </svg>
  );
}

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSavedImages({ limit: 20 });

  const images = data?.pages.flatMap((page) => page?.data ?? []) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-8 py-[18px]">
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.5px]">Gallery</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {total} saved image{total !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-muted-foreground">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search prompts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-[260px] rounded-lg border border-border bg-background pl-9 pr-3 text-[13.5px] text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-[9px] text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
            <FilterIcon /> Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-[9px] text-[12.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <PlusIcon /> New
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-8 py-3.5">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={`rounded-full px-[11px] py-[5px] text-[12.5px] font-medium transition-colors ${
              activeFilter === chip
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            {chip}
          </button>
        ))}
        <div className="ml-auto text-[12.5px] text-muted-foreground">Sort: Newest first</div>
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-auto bg-tint p-[22px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center text-[14px] text-destructive">
            Failed to load images. Please try again.
          </div>
        ) : images.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <svg
              width={40}
              height={40}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-25"
            >
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" />
            </svg>
            <p className="text-[13px]">No saved images yet. Generate some to get started!</p>
          </div>
        ) : (
          <ImageGrid
            images={images}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        )}
      </div>
    </div>
  );
}
