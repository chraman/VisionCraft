import { useEffect, useRef, useState } from 'react';
import { useJobStatus } from '../hooks/useJobStatus';

// ─── Phase configuration ──────────────────────────────────────────────────────

type ChipVariant = 'gray' | 'amber' | 'primary' | 'green';

interface Phase {
  key: string;
  label: string;
  chipLabel: string;
  chipVariant: ChipVariant;
  duration: number;
  progressStart: number; // 0–1 drives the canvas gradient reveal
  progressEnd: number;
}

const PHASES: Phase[] = [
  {
    key: 'queued',
    label: 'Queued',
    chipLabel: 'Queued',
    chipVariant: 'gray',
    duration: 2000,
    progressStart: 0,
    progressEnd: 0,
  },
  {
    key: 'warming',
    label: 'GPU warming',
    chipLabel: 'Warming',
    chipVariant: 'amber',
    duration: 2000,
    progressStart: 0,
    progressEnd: 0.06,
  },
  {
    key: 'diffusing',
    label: 'Diffusing',
    chipLabel: 'Diffusing',
    chipVariant: 'primary',
    duration: 10000,
    progressStart: 0.06,
    progressEnd: 0.93,
  },
  {
    key: 'uploading',
    label: 'Uploading',
    chipLabel: 'Uploading',
    chipVariant: 'primary',
    duration: 1500,
    progressStart: 0.93,
    progressEnd: 0.99,
  },
  // Phase 4 only reached when server confirms COMPLETED — never by the demo clock alone
  {
    key: 'ready',
    label: 'Ready',
    chipLabel: 'Ready',
    chipVariant: 'green',
    duration: 2000,
    progressStart: 1,
    progressEnd: 1,
  },
];

// Cumulative start time (ms) for each phase
const PHASE_START = PHASES.reduce<number[]>((acc, _p, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1]! + PHASES[i - 1]!.duration);
  return acc;
}, []);

// Total run including ready hold (for loop mode)
const TOTAL_MS = PHASE_START[PHASES.length - 1]! + PHASES[PHASES.length - 1]!.duration;

// Last ms before the ready phase — animation is capped here unless server says COMPLETED
const UPLOADING_END_MS = PHASE_START[4]! - 1;

function phaseAtTime(ms: number): { index: number; t: number } {
  let idx = 0;
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (ms >= PHASE_START[i]!) {
      idx = i;
      break;
    }
  }
  const t = Math.min(1, (ms - PHASE_START[idx]!) / PHASES[idx]!.duration);
  return { index: idx, t };
}

// ─── Chip colour map ──────────────────────────────────────────────────────────

const CHIP_STYLE: Record<ChipVariant, { dot: string; bg: string; text: string; border: string }> = {
  gray: {
    dot: '#6b7280',
    bg: 'rgba(10,10,14,.75)',
    text: 'rgba(255,255,255,.55)',
    border: 'rgba(255,255,255,.1)',
  },
  amber: {
    dot: '#fbbf24',
    bg: 'rgba(10,10,14,.75)',
    text: '#fcd34d',
    border: 'rgba(251,191,36,.25)',
  },
  primary: {
    dot: 'hsl(var(--primary))',
    bg: 'rgba(10,10,14,.75)',
    text: 'hsl(var(--primary))',
    border: 'hsl(var(--primary) / .25)',
  },
  green: {
    dot: '#34d399',
    bg: 'rgba(10,10,14,.75)',
    text: '#6ee7b7',
    border: 'rgba(52,211,153,.25)',
  },
};

// ─── NoiseTile ────────────────────────────────────────────────────────────────
// 64×64 pixelated canvas. Animated colour noise that fades out as the warm
// gradient underneath reveals itself (progress 0 → 1).

function NoiseTile({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pRef = useRef(progress);
  pRef.current = progress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    const ctx: CanvasRenderingContext2D = rawCtx;
    const W = 64;
    const H = 64;

    const grad = ctx.createRadialGradient(W * 0.42, H * 0.32, 2, W * 0.5, H * 0.52, W * 0.72);
    grad.addColorStop(0, '#ffbe76');
    grad.addColorStop(0.3, '#e05f1c');
    grad.addColorStop(0.65, '#8b1a08');
    grad.addColorStop(1, '#1a0503');

    function draw() {
      const p = pRef.current;

      ctx.fillStyle = '#100906';
      ctx.fillRect(0, 0, W, H);

      if (p > 0) {
        ctx.globalAlpha = Math.pow(p, 0.6);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      const noiseAlpha = 1 - Math.pow(p, 0.45);
      if (noiseAlpha > 0.015) {
        const imgData = ctx.createImageData(W, H);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = (Math.random() * 255) | 0;
          d[i + 1] = (Math.random() * 200) | 0;
          d[i + 2] = (Math.random() * 255) | 0;
          d[i + 3] = (noiseAlpha * 230) | 0;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

// ─── Phase rail ───────────────────────────────────────────────────────────────

function PhaseRail({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-start">
      {PHASES.map((phase, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const upcoming = i > activeIndex;
        const isFirst = i === 0;
        const isLast = i === PHASES.length - 1;

        return (
          <div key={phase.key} className="flex flex-1 flex-col items-center">
            {/* Track + dot */}
            <div className="flex w-full items-center">
              <div
                className="h-[2px] flex-1 transition-colors duration-300"
                style={{
                  background: isFirst
                    ? 'transparent'
                    : done || active
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--border))',
                }}
              />
              <div className="relative flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center">
                {active && (
                  <span
                    className="absolute inset-0 rounded-full bg-primary"
                    style={{ animation: 'phase-pulse 1.6s ease-in-out infinite' }}
                  />
                )}
                <div
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: active ? 10 : 8,
                    height: active ? 10 : 8,
                    background: done || active ? 'hsl(var(--primary))' : 'transparent',
                    border: upcoming
                      ? '2px solid hsl(var(--border))'
                      : '2px solid hsl(var(--primary))',
                    boxShadow: active ? '0 0 0 3px hsl(var(--primary) / .18)' : 'none',
                  }}
                />
              </div>
              <div
                className="h-[2px] flex-1 transition-colors duration-300"
                style={{
                  background: isLast
                    ? 'transparent'
                    : done
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--border))',
                }}
              />
            </div>
            <div
              className="mt-1.5 text-center text-[10px] leading-tight transition-colors duration-300"
              style={{
                color: done || active ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                fontWeight: active ? 600 : 400,
              }}
            >
              {phase.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GenerationProgressProps {
  jobId: string | null;
  isSubmitting: boolean;
  loop?: boolean;
}

export function GenerationProgress({ jobId, isSubmitting, loop = false }: GenerationProgressProps) {
  const { data: job } = useJobStatus(jobId);

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  // The component is visible during active generation only
  const isActive =
    isSubmitting || Boolean(job && job.status !== 'COMPLETED' && job.status !== 'FAILED');

  // Server pushes the minimum elapsed time forward so the animation
  // never lags behind what the server has already reported
  const serverMinMs =
    !loop && job?.status === 'PROCESSING'
      ? (PHASE_START[2] ?? 0)
      : !loop && job?.status === 'PENDING'
        ? (PHASE_START[1] ?? 0)
        : 0;

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
      setElapsed(0);
      return;
    }

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const raw = now - startRef.current;
      setElapsed(loop ? raw % TOTAL_MS : Math.min(raw, TOTAL_MS));
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, loop]);

  if (!isActive) return null;

  // Cap at UPLOADING_END_MS so the animation never shows "Ready" on its own —
  // the ready phase only appears if we explicitly set it (currently we return null
  // on COMPLETED and let ResultDisplay handle the success state).
  const rawMs = Math.max(elapsed, serverMinMs);
  const effectiveMs = loop ? rawMs : Math.min(rawMs, UPLOADING_END_MS);

  const { index, t } = phaseAtTime(effectiveMs);
  const phase = PHASES[index] ?? PHASES[0]!;
  const chip = CHIP_STYLE[phase.chipVariant];

  // Progress value 0–1 for the canvas gradient
  const p = phase.progressStart + (phase.progressEnd - phase.progressStart) * t;

  // Live step counter during diffusing
  const diffStep = index === 2 ? Math.max(1, Math.min(40, Math.round(t * 40))) : 1;

  // Sub-copy per phase (key=index so it fades in only on phase change)
  const subcopy =
    index === 0
      ? 'Position 2 of 4 — waiting for free worker'
      : index === 1
        ? 'Cold-starting · loading SDXL weights'
        : index === 2
          ? `Step ${diffStep} of 40 · denoising latent space`
          : index === 3
            ? 'Saving 1024×1024 PNG to your gallery'
            : `Generated in ${(effectiveMs / 1000).toFixed(1)}s · click to view full size`;

  // ETA countdown from total expected duration
  const remainingSec = Math.ceil(Math.max(0, TOTAL_MS - effectiveMs) / 1000);
  const isReady = index === 4;

  return (
    <div
      className="mb-5"
      role="status"
      aria-live="polite"
      aria-label={`Image generation — ${phase.label}`}
    >
      {/* ── Square preview ───────────────────────────────────────────────── */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl"
        style={{
          maxWidth: 620,
          aspectRatio: '1 / 1',
          background: '#0c0908',
          boxShadow: '0 24px 64px -16px rgba(0,0,0,.5)',
        }}
      >
        <NoiseTile progress={p} />

        {/* ── Shimmer sweep — diagonal highlight that crosses the canvas ─── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(108deg, transparent 38%, rgba(255,255,255,.07) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
            animation: 'shimmer-sweep 2.8s linear infinite',
          }}
        />

        {/* ── Expanding rings — sonar-style loading pulse ───────────────── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          {([0, 0.9, 1.8] as const).map((delay, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: 64,
                height: 64,
                border: '1.5px solid rgba(255,255,255,.18)',
                animation: 'ring-expand 2.7s ease-out infinite',
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </div>

        {/* Status chip + sub-copy — top-left */}
        <div className="absolute left-3 top-3 max-w-[calc(100%-6.5rem)]">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-semibold backdrop-blur-[8px]"
            style={{
              background: chip.bg,
              color: chip.text,
              border: `1px solid ${chip.border}`,
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: chip.dot, transition: 'background 0.2s' }}
            />
            {phase.chipLabel}
            {index === 2 && <span className="ml-0.5 font-mono opacity-70">{diffStep}/40</span>}
          </div>

          {/* Sub-copy fades in on every phase change via key */}
          <p
            key={index}
            className="mt-1.5 max-w-[220px] truncate text-[10.5px] font-medium leading-snug text-white/55"
            style={{
              textShadow: '0 1px 4px rgba(0,0,0,.9)',
              animation: 'subcopy-in 0.22s ease both',
            }}
          >
            {subcopy}
          </p>
        </div>

        {/* ETA / Ready pill — top-right */}
        <div className="absolute right-3 top-3">
          {isReady ? (
            <span
              key="ready"
              className="flex items-center gap-1 rounded-full px-2.5 py-[5px] text-[11px] font-semibold backdrop-blur-[8px]"
              style={{
                background: 'rgba(10,10,14,.75)',
                color: '#6ee7b7',
                border: '1px solid rgba(52,211,153,.25)',
                animation: 'subcopy-in 0.22s ease both',
              }}
            >
              <svg
                width={9}
                height={9}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12l5 5L20 6" />
              </svg>
              Ready
            </span>
          ) : (
            <span
              className="rounded-full px-2.5 py-[5px] font-mono text-[11px] font-medium backdrop-blur-[8px]"
              style={{
                background: 'rgba(10,10,14,.75)',
                color: 'rgba(255,255,255,.6)',
                border: '1px solid rgba(255,255,255,.1)',
              }}
            >
              ~{remainingSec}s left
            </span>
          )}
        </div>
      </div>

      {/* ── Phase rail ───────────────────────────────────────────────────── */}
      <div className="mx-auto mt-4 px-2" style={{ maxWidth: 620 }}>
        <PhaseRail activeIndex={index} />
      </div>

      <style>{`
        @keyframes phase-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%       { opacity: 0;    transform: scale(2.3); }
        }
        @keyframes subcopy-in {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer-sweep {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.55); opacity: 0.7; }
          100% { transform: scale(4.5);  opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
