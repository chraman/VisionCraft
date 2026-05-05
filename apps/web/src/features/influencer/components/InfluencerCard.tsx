import type { Influencer } from '@ai-platform/types';

interface Props {
  influencer: Influencer;
  onGenerate: () => void;
  onDelete: () => void;
  onCardClick: () => void;
}

const GRADIENTS = [
  'linear-gradient(135deg,#f9d4c0,#d49b75)',
  'linear-gradient(135deg,#c4d8e8,#5d7a9a)',
  'linear-gradient(135deg,#d4e8d4,#6a9a6a)',
  'linear-gradient(135deg,#d4d4e8,#6a6a8a)',
  'linear-gradient(135deg,#e0d4f0,#8a6ab8)',
  'linear-gradient(135deg,#f0e4d4,#b87a50)',
  'linear-gradient(135deg,#e8d4d4,#9a5a5a)',
];

function nameToPaletteIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % GRADIENTS.length;
}

export function InfluencerCard({ influencer, onGenerate, onDelete, onCardClick }: Props) {
  const gradient = GRADIENTS[nameToPaletteIdx(influencer.name)];
  const faceAnchor = influencer.characterDna?.face_anchor;
  const createdDate = new Date(influencer.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card cursor-pointer group hover:shadow-md transition-shadow">
      {/* Portrait image area — clicking opens the profile modal */}
      <div className="relative cursor-pointer" style={{ aspectRatio: '3/4' }} onClick={onCardClick}>
        {influencer.profileImageUrl ? (
          <img
            src={influencer.profileImageUrl}
            alt={influencer.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}

        {/* LOCKED badge */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <svg
            width={10}
            height={10}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
          </svg>
          LOCKED
        </div>

        {/* Date badge */}
        <div className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-sm">
          {createdDate}
        </div>

        {/* Name + face_anchor gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
          <div className="text-[14px] font-semibold text-white">{influencer.name}</div>
          {faceAnchor && (
            <div className="mt-0.5 line-clamp-1 text-[10.5px] text-white/70">{faceAnchor}</div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <button
          onClick={onGenerate}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[7px] bg-primary py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <svg
            width={12}
            height={12}
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
          Generate
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="flex items-center justify-center rounded-[7px] border border-border p-2 text-muted-foreground transition-colors hover:border-red-300 hover:text-red-500"
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
