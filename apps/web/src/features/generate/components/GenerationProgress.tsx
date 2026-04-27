import { useJobStatus } from '../hooks/useJobStatus';

interface GenerationProgressProps {
  jobId: string | null;
}

export function GenerationProgress({ jobId }: GenerationProgressProps) {
  const { data: job } = useJobStatus(jobId);

  if (!jobId || !job) return null;
  if (job.status !== 'PENDING' && job.status !== 'PROCESSING') return null;

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      {/* Header */}
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

      {/* Shimmer area */}
      <div className="p-5">
        <div
          className="flex flex-col items-center justify-center gap-2.5 rounded-[10px] py-12"
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
          <div className="font-mono text-[12px] text-muted-foreground">diffusing…</div>
        </div>

        {/* Progress bar */}
        <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-1/2 rounded-full bg-primary"
            style={{ animation: 'shimmer 2s ease-in-out infinite' }}
          />
        </div>

        <div className="mt-2.5 flex justify-between text-[12px] text-muted-foreground">
          <span>Stability AI · SDXL</span>
          <span>{job.status === 'PENDING' ? 'Queued…' : 'Processing…'}</span>
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
