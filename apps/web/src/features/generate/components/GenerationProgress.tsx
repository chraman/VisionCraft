import { useEffect, useState } from 'react';
import { useJobStatus } from '../hooks/useJobStatus';

interface GenerationProgressProps {
  jobId: string | null;
  isSubmitting: boolean;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function GenerationProgress({ jobId, isSubmitting }: GenerationProgressProps) {
  const { data: job } = useJobStatus(jobId);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (job?.status !== 'PROCESSING') {
      setElapsed(0);
      return;
    }
    const start = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
    setElapsed(Date.now() - start);
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [job?.status, job?.startedAt]);

  // ── Phase 1: SUBMITTING ───────────────────────────────────────────────────
  if (isSubmitting && !jobId) {
    return (
      <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-3.5">
          <div className="text-[14px] font-semibold">Submitting…</div>
          <span className="flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-[3px] text-[11px] font-medium text-primary">
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
              <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
            </svg>
            Live
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-10">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-20" />
            <svg
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              style={{ animationDuration: '1.4s' }}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="text-[13px] font-medium text-foreground">Submitting request…</div>
          <div className="text-[12px] text-muted-foreground">Connecting to generation service</div>
        </div>
      </div>
    );
  }

  if (!job) return null;
  if (job.status === 'COMPLETED' || job.status === 'FAILED') return null;

  // ── Phase 2: QUEUED ───────────────────────────────────────────────────────
  if (job.status === 'PENDING') {
    return (
      <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex items-center justify-between border-b border-border px-[18px] py-3.5">
          <div className="text-[14px] font-semibold">In queue…</div>
          <span className="flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-[3px] text-[11px] font-medium text-primary">
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
              <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
            </svg>
            Live
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-5 py-10">
          <div className="flex items-end gap-1.5" style={{ height: 28 }}>
            {[0, 0.15, 0.3].map((delay, i) => (
              <span
                key={i}
                className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
                style={{
                  animation: `bounce-dot 1.1s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </div>
          <div className="text-[13px] font-medium text-foreground">
            Your request is in the queue
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            #{(jobId ?? '').slice(0, 8)}
          </div>
        </div>
        <style>{`
          @keyframes bounce-dot {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  // ── Phase 3: PROCESSING ───────────────────────────────────────────────────
  const truncatedPrompt = job.prompt
    ? job.prompt.length > 80
      ? job.prompt.slice(0, 80) + '…'
      : job.prompt
    : 'Generating…';

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-center justify-between border-b border-border px-[18px] py-3.5">
        <div className="text-[14px] font-semibold">Generating…</div>
        <span className="flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-[3px] text-[11px] font-medium text-primary">
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
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </svg>
          Live
        </span>
      </div>

      <div className="p-5">
        {/* Shimmer canvas */}
        <div
          className="flex flex-col items-center justify-center gap-2.5 rounded-[10px] py-10"
          style={{
            background:
              'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--vc-soft)) 50%, hsl(var(--muted)) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.6s linear infinite',
          }}
        >
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
            <path d="M19 15v3M17.5 16.5h3" />
          </svg>
          <div className="max-w-[260px] text-center font-mono text-[11.5px] leading-snug text-muted-foreground">
            {truncatedPrompt}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: '100%',
              background:
                'linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--primary)) 50%, hsl(var(--muted)) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.8s linear infinite',
            }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[12px] text-muted-foreground">
          {job.model && (
            <span className="rounded-full bg-muted px-2 py-[2px] font-mono text-[10.5px] ring-1 ring-border">
              {job.model}
            </span>
          )}
          {!job.model && <span />}
          <span className="font-mono">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
