import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';
import { useQuota } from '../features/profile/hooks/useQuota';
import { useSavedImages } from '../features/gallery/hooks/useSavedImages';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-display text-[32px] font-medium leading-none tracking-[-0.8px]">
        {value}
      </div>
      <div
        className="mt-0.5 text-[12px]"
        style={{ color: subColor ?? 'hsl(var(--muted-foreground))' }}
      >
        {sub}
      </div>
    </div>
  );
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({
  icon,
  label,
  time,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-[18px] py-3 ${!last ? 'border-b border-border' : ''}`}
    >
      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1 text-[13px]">{label}</div>
      <div className="text-[11px] text-muted-foreground">{time}</div>
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

const SparkleIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
);
const SaveIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M8 3v5h8V3M8 21v-7h8v7" />
  </svg>
);
const RefreshIcon = () => (
  <svg
    width={14}
    height={14}
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
);
const ArrowRightIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: quota } = useQuota();
  const { data: imagesData, isLoading } = useSavedImages({ limit: 8 });

  const recentImages = imagesData?.pages.flatMap((p) => p?.data ?? []).slice(0, 8) ?? [];
  const savedCount = imagesData?.pages[0]?.pagination?.total ?? 0;
  const usedPct = quota ? Math.round((quota.used / quota.limit) * 100) : 0;

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-8 py-[18px]">
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.5px]">
            Welcome back, {firstName}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Here's what's happening in your workspace
          </div>
        </div>
        <button
          onClick={() => navigate('/generate')}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13.5px] font-medium text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New generation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Quota used"
            value={`${quota?.used ?? 0} / ${quota?.limit ?? 10}`}
            sub={`${usedPct}% of monthly limit`}
            subColor={usedPct >= 80 ? 'hsl(38 92% 45%)' : undefined}
          />
          <StatCard
            label="Saved images"
            value={String(savedCount)}
            sub="In your gallery"
            subColor="hsl(142 70% 42%)"
          />
          <StatCard
            label="Plan"
            value={quota?.tier === 'pro' ? 'Pro' : 'Free'}
            sub={quota?.tier === 'pro' ? 'All features unlocked' : 'Upgrade for more'}
          />
          <StatCard
            label="Generations left"
            value={String(Math.max(0, (quota?.limit ?? 10) - (quota?.used ?? 0)))}
            sub="This month"
          />
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-[1fr_300px] gap-4">
          {/* Recent images */}
          <div className="rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-[18px]">
              <div>
                <div className="text-[15px] font-semibold">Recent generations</div>
                <div className="text-[12px] text-muted-foreground">
                  Last {recentImages.length} · across all models
                </div>
              </div>
              <button
                onClick={() => navigate('/gallery')}
                className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View gallery <ArrowRightIcon />
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-4 gap-2.5 p-3.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : recentImages.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
                <svg
                  width={32}
                  height={32}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-30"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="M21 16l-5-5-10 10" />
                </svg>
                <p className="text-[13px]">No images yet — start generating!</p>
                <button
                  onClick={() => navigate('/generate')}
                  className="rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Generate now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2.5 p-3.5">
                {recentImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => navigate('/gallery')}
                    className="aspect-square cursor-pointer overflow-hidden rounded-lg"
                  >
                    <LazyLoadImage
                      src={img.cdnUrl ?? img.url}
                      alt={img.prompt}
                      effect="blur"
                      className="h-full w-full object-cover"
                      wrapperClassName="block h-full w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Quick start */}
            <div
              className="rounded-xl p-5 text-white"
              style={{
                background:
                  'linear-gradient(140deg, hsl(var(--primary)) 0%, hsl(239 84% 55%) 100%)',
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.6px] opacity-85">
                Quick start
              </div>
              <div className="mt-2 font-display text-[26px] font-medium leading-[1.1] tracking-[-0.6px]">
                Make something.
              </div>
              <div className="mt-1.5 text-[13px] leading-relaxed opacity-88">
                {quota
                  ? `${Math.max(0, quota.limit - quota.used)} generation${quota.limit - quota.used === 1 ? '' : 's'} left this month.`
                  : 'Start generating images.'}{' '}
                Try a prompt.
              </div>
              <button
                onClick={() => navigate('/generate')}
                className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/95 py-2 text-[13px] font-medium text-primary transition-opacity hover:opacity-90"
              >
                <SparkleIcon /> New from prompt
              </button>
            </div>

            {/* Activity */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div className="border-b border-border px-[18px] py-3.5 text-[14px] font-semibold">
                Activity
              </div>
              <ActivityRow icon={<SparkleIcon />} label="Generated an image" time="Just now" />
              <ActivityRow icon={<SaveIcon />} label="Saved to Gallery" time="2m ago" />
              <ActivityRow icon={<RefreshIcon />} label="Regenerated variant" time="1h ago" last />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
