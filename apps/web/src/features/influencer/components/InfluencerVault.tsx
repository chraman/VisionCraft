import { useRef, useCallback, useState } from 'react';
import type { Influencer } from '@ai-platform/types';
import { useInfluencers } from '../hooks/useInfluencers';
import { deleteInfluencer } from '../../../services/influencer.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { InfluencerCard } from './InfluencerCard';

interface Props {
  onSelect: (influencerId: string) => void;
  onCreateClick: () => void;
}

const SORT_OPTIONS = ['Recent', 'A → Z'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const EXPLAINER_STEPS = [
  {
    icon: (
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
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    ),
    title: '1. Define',
    desc: 'Upload a source photo or describe your character. We extract a face anchor from it.',
  },
  {
    icon: (
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
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="M19 15v3M17.5 16.5h3" />
      </svg>
    ),
    title: '2. Lock',
    desc: 'We generate a canonical profile image — this becomes the permanent identity reference.',
  },
  {
    icon: (
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
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    ),
    title: '3. Reuse',
    desc: 'Every gen uses the profile as an img2img reference at strength 0.25 — same face, new scenes.',
  },
];

export function InfluencerVault({ onSelect, onCreateClick }: Props) {
  const [activeSort, setActiveSort] = useState<SortOption>('Recent');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfluencers();
  const queryClient = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(node);
      sentinelRef.current = node;
      return () => observer.disconnect();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const influencers: Influencer[] = data?.pages.flatMap((page) => page.data) ?? [];

  const sorted = [...influencers].sort((a, b) =>
    activeSort === 'A → Z'
      ? a.name.localeCompare(b.name)
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  async function handleDelete(influencerId: string, name: string) {
    try {
      await deleteInfluencer(influencerId);
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error('Failed to delete influencer');
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Explainer cards */}
      <div className="grid grid-cols-3 gap-4">
        {EXPLAINER_STEPS.map((s) => (
          <div
            key={s.title}
            className="rounded-[12px] border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.04)]"
          >
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-soft text-primary">
              {s.icon}
            </div>
            <div className="mb-1 text-[13.5px] font-semibold">{s.title}</div>
            <div className="text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Header + sort */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-[22px] font-medium tracking-[-0.4px]">
            Your influencers
          </h2>
          {!isLoading && (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {influencers.length} {influencers.length === 1 ? 'character' : 'characters'}
            </p>
          )}
        </div>
        <div className="flex gap-1 rounded-[8px] border border-border bg-card p-[3px]">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveSort(opt)}
              className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                activeSort === opt
                  ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[14px] bg-muted"
              style={{ aspectRatio: '3/4' }}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {/* New influencer dashed card */}
            <button
              onClick={onCreateClick}
              className="flex flex-col items-center justify-center gap-2.5 rounded-[14px] border-2 border-dashed border-border bg-card/50 text-center transition-colors hover:border-primary/40 hover:bg-card"
              style={{ aspectRatio: '3/4' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="text-[13px] font-medium">New influencer</div>
              <div className="max-w-[160px] text-[11.5px] leading-relaxed text-muted-foreground">
                Photo or description
                <br />
                ~12s to generate profile
              </div>
            </button>

            {sorted.map((inf) => (
              <InfluencerCard
                key={inf.id}
                influencer={inf}
                onGenerate={() => onSelect(inf.id)}
                onDelete={() => void handleDelete(inf.id, inf.name)}
              />
            ))}
          </div>

          <div ref={observerRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="text-center text-[12px] text-muted-foreground">Loading more…</div>
          )}
        </>
      )}
    </div>
  );
}
