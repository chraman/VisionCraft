import type { Influencer } from '@ai-platform/types';

interface Props {
  influencer: Influencer;
  onGenerate: () => void;
  onDelete: () => void;
}

export function InfluencerCard({ influencer, onGenerate, onDelete }: Props) {
  const dna = influencer.characterDna;

  return (
    <div className="group relative flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4 transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{influencer.name}</div>
          {influencer.description && (
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {influencer.description}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Delete influencer"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>

      {/* DNA chips */}
      <div className="flex flex-wrap gap-1">
        {[dna?.dynamic?.wardrobe, dna?.dynamic?.lighting].filter(Boolean).map((label, i) => (
          <span
            key={i}
            className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground"
          >
            {String(label).slice(0, 30)}
          </span>
        ))}
      </div>

      {/* Date */}
      <div className="text-[11px] text-muted-foreground">
        Created {new Date(influencer.createdAt).toLocaleDateString()}
      </div>

      {/* Generate CTA */}
      <button
        onClick={onGenerate}
        className="w-full rounded-[7px] bg-primary py-[8px] text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Generate image
      </button>
    </div>
  );
}
