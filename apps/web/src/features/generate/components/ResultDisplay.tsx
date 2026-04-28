import { useJobStatus } from '../hooks/useJobStatus';
import { useImageActions } from '../../gallery/hooks/useImageActions';
import { useQuota } from '../../profile/hooks/useQuota';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

interface ResultDisplayProps {
  jobId: string | null;
  onClear: () => void;
}

function RefreshIcon() {
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
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
function DownloadIcon() {
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
      <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
    </svg>
  );
}
function SaveIcon() {
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
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v5h8V3M8 21v-7h8v7" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  );
}

export function ResultDisplay({ jobId, onClear }: ResultDisplayProps) {
  const { data: job } = useJobStatus(jobId);
  const { saveMutation } = useImageActions();
  const { data: quota } = useQuota();
  const { user } = useAuthStore();

  if (!job) return null;

  // ── Failed ────────────────────────────────────────────────────────────────
  if (job.status === 'FAILED') {
    return (
      <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-3.5">
          <div className="text-[14px] font-semibold">Generation failed</div>
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
            style={{ background: 'hsl(0 84% 95%)', color: 'hsl(0 70% 42%)' }}
          >
            <WarnIcon /> Error
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-7 py-7 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-[14px]"
            style={{ background: 'hsl(0 84% 95%)', color: 'hsl(0 70% 42%)' }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l10 18H2z" />
              <path d="M12 10v5M12 18h.01" />
            </svg>
          </div>
          <div className="font-display text-[20px] font-medium tracking-[-0.3px]">
            Provider briefly unavailable
          </div>
          <p className="max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
            {job.errorMessage ??
              "The AI provider returned an error. We'll retry automatically, or you can try again now."}
          </p>
          <div className="mt-1 flex gap-2">
            <button
              onClick={onClear}
              className="rounded-lg border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              View details
            </button>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshIcon /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quota exceeded (completed but show upgrade CTA) ───────────────────────
  const isExhausted = quota && quota.used >= quota.limit;
  if (isExhausted && job.status === 'COMPLETED') {
    return (
      <div
        className="mb-5 overflow-hidden rounded-xl shadow-[0_1px_2px_rgba(16,24,40,.04)]"
        style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
      >
        <div
          className="flex items-center justify-between border-b px-[18px] py-3.5"
          style={{ borderColor: 'rgba(255,255,255,.1)' }}
        >
          <div className="text-[14px] font-semibold">Monthly limit reached</div>
          <span
            className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
            style={{ background: 'hsl(38 92% 93%)', color: 'hsl(25 85% 38%)' }}
          >
            {quota.used} / {quota.limit} used
          </span>
        </div>
        <div className="px-7 py-7">
          <div className="font-display text-[26px] font-medium leading-[1.15] tracking-[-0.6px]">
            You've used all {quota.limit} free generations this month.
          </div>
          <p className="mt-3.5 text-[13.5px] opacity-75 leading-relaxed">
            Upgrade to Pro for 200 HD generations, priority queue, and the model selector — or wait
            for your quota to reset.
          </p>
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={() => track({ event: 'upgrade_clicked', userId: user?.id })}
              className="flex-1 rounded-lg py-2.5 text-[13.5px] font-medium transition-opacity hover:opacity-90"
              style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
            >
              Upgrade to Pro · $12/mo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (job.status === 'COMPLETED' && job.imageId) {
    // Prefer the CDN/MinIO URL delivered via SSE — avoids an extra round-trip
    // through the gateway. Fall back to the API redirect route if unavailable.
    const imgSrc = job.cdnUrl ?? `/api/v1/images/${job.imageId}`;

    return (
      <div>
        {/* Result header */}
        <div className="mb-[18px] flex items-center justify-between">
          <div>
            <div className="font-display text-[22px] font-medium tracking-[-0.4px]">
              Latest generation
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Completed · SDXL · HD</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-[7px] text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RefreshIcon /> Regenerate
            </button>
            <a
              href={imgSrc}
              download
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-[7px] text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              <DownloadIcon /> Download
            </a>
            <button
              onClick={() => saveMutation.mutate(job.imageId!)}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-[7px] text-[12.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                'Saving…'
              ) : (
                <>
                  <SaveIcon /> Save to gallery
                </>
              )}
            </button>
          </div>
        </div>

        {/* Image */}
        <div
          className="mx-auto overflow-hidden rounded-2xl"
          style={{
            maxWidth: 600,
            aspectRatio: '1/1',
            boxShadow: '0 20px 60px -20px rgba(40,30,80,.18)',
          }}
        >
          <img src={imgSrc} alt={job.prompt} className="h-full w-full object-cover" />
        </div>

        {/* Success badge */}
        <div className="mx-auto mt-4 flex max-w-[600px] items-center justify-between text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <CheckIcon /> Complete
          </span>
          <span>
            Seed: <span className="font-mono">{job.imageId?.slice(0, 8)}</span>
          </span>
        </div>
      </div>
    );
  }

  return null;
}
