import { useRef, useCallback } from 'react';
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

export function InfluencerVault({ onSelect, onCreateClick }: Props) {
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

  async function handleDelete(influencerId: string, name: string) {
    try {
      await deleteInfluencer(influencerId);
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      toast.success(`"${name}" deleted`);
    } catch {
      toast.error('Failed to delete influencer');
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-[10px] bg-muted" />
        ))}
      </div>
    );
  }

  if (influencers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
          className="mb-4 text-muted-foreground opacity-30"
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c0-5 3.6-9 8-9s8 4 8 9" />
        </svg>
        <div className="text-[14px] font-medium text-muted-foreground">No influencers yet</div>
        <div className="mt-1 text-[12px] text-muted-foreground opacity-60">
          Create one to start generating consistent character images
        </div>
        <button
          onClick={onCreateClick}
          className="mt-4 rounded-[8px] bg-primary px-5 py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"
        >
          Create influencer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {influencers.map((inf) => (
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
    </div>
  );
}
