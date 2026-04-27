import { Link } from 'react-router-dom';

function SparkleIcon() {
  return (
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
      <path d="M19 15v3M17.5 16.5h3" />
    </svg>
  );
}

// Striped gradient placeholder
function GradientTile({ seed, rotate }: { seed: number; rotate: number }) {
  const hues = [
    ['239 70% 92%', '239 84% 67%'],
    ['262 70% 92%', '262 83% 65%'],
    ['178 60% 92%', '178 78% 45%'],
    ['25 80% 92%', '18 80% 55%'],
  ];
  const [from, to] = hues[seed % hues.length]!;
  return (
    <div
      className="h-[120px] w-[120px] overflow-hidden rounded-xl opacity-40"
      style={{
        transform: `rotate(${rotate}deg)`,
        background: `linear-gradient(135deg, hsl(${from}) 0%, hsl(${to}) 100%)`,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 16px)',
        }}
      />
    </div>
  );
}

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tint px-10 text-center">
      {/* Logo */}
      <span className="flex items-center gap-2 text-foreground">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <rect
            x="2.5"
            y="2.5"
            width="19"
            height="19"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="4.2" fill="hsl(var(--primary))" />
          <circle cx="17" cy="7" r="1.4" fill="currentColor" />
        </svg>
        <span className="font-display text-[15.6px] font-semibold tracking-[-0.4px]">
          VisionCraft
        </span>
      </span>

      {/* 404 display */}
      <div
        className="mt-[60px] font-display font-medium leading-none tracking-[-6px] text-primary"
        style={{ fontSize: 160 }}
      >
        404
      </div>

      <div className="mt-3 font-display text-[36px] font-medium tracking-[-1px]">
        Not in our model.
      </div>

      <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">
        The page you're looking for never generated. Try a prompt instead — our models are much
        better at making things than finding them.
      </p>

      <div className="mt-6 flex gap-2.5">
        <Link
          to="/dashboard"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-[13.5px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          Back to dashboard
        </Link>
        <Link
          to="/generate"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-[13.5px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <SparkleIcon /> Generate something
        </Link>
      </div>

      {/* Decorative tiles */}
      <div className="mt-[54px] flex gap-3">
        {[
          { seed: 0, rotate: -6 },
          { seed: 1, rotate: -3 },
          { seed: 2, rotate: 0 },
          { seed: 3, rotate: 4 },
        ].map(({ seed, rotate }, i) => (
          <GradientTile key={i} seed={seed} rotate={rotate} />
        ))}
      </div>
    </div>
  );
}
