import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchStockPhotos } from '../../../services/image.service';
import type { StockPhoto } from '../../../services/image.service';
import { Spinner } from '@ai-platform/ui';

interface Props {
  onSelect: (photo: StockPhoto) => void;
  onClose: () => void;
}

type Source = 'unsplash' | 'pexels';

export function StockPhotoPicker({ onSelect, onClose }: Props) {
  const [source, setSource] = useState<Source>('unsplash');
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('fashion editorial');
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch photos when query/source/page changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    searchStockPhotos(source, query, page, 20)
      .then((results) => {
        if (cancelled) return;
        setPhotos((prev) => (page === 1 ? results : [...prev, ...results]));
        setHasMore(results.length === 20);
      })
      .catch(() => {
        if (!cancelled) setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, query, page]);

  // IntersectionObserver for infinite scroll
  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !isLoading) {
            setPage((p) => p + 1);
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
      sentinelRef.current = node;
    },
    [hasMore, isLoading]
  );

  function handleInputChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== query) {
        setQuery(trimmed);
        setPage(1);
        setPhotos([]);
      }
    }, 400);
  }

  function handleSourceChange(s: Source) {
    setSource(s);
    setPage(1);
    setPhotos([]);
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="flex h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-[14px] font-semibold">Browse stock photos</div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              Pick a scene reference — it will be used to auto-generate your prompt
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
        </div>

        {/* Search + source tabs */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          {/* Source toggle */}
          <div className="flex gap-1 rounded-[8px] bg-muted p-[3px]">
            {(['unsplash', 'pexels'] as Source[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSourceChange(s)}
                className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-semibold capitalize transition-all ${
                  source === s
                    ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search photos…"
              className="w-full rounded-[8px] border border-input bg-background py-2 pl-8 pr-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 && !isLoading ? (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
              No photos found — try a different search
            </div>
          ) : (
            <>
              <div className="columns-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="mb-3 break-inside-avoid">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(photo);
                        onClose();
                      }}
                      className="group relative block w-full overflow-hidden rounded-[8px] border border-border transition-all hover:border-primary hover:shadow-md"
                    >
                      <img
                        src={photo.thumbUrl}
                        alt={`Photo by ${photo.author}`}
                        className="w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 transition-transform group-hover:translate-y-0">
                        <div className="truncate text-[10px] text-white/80">
                          {photo.author} · {photo.source}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
              <div ref={sentinelCallback} className="flex justify-center py-3">
                {isLoading && <Spinner size="sm" />}
              </div>
            </>
          )}
          {photos.length === 0 && isLoading && (
            <div className="flex h-full items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
