import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { OAuthButton } from '../components/OAuthButton';

// Gradient tile placeholder
function GradientTile({ seed, style }: { seed: number; style?: React.CSSProperties }) {
  const hues: Array<[string, string]> = [
    ['239 70% 92%', '239 84% 67%'],
    ['262 70% 92%', '262 83% 65%'],
    ['178 60% 92%', '178 78% 45%'],
    ['25 80% 92%', '18 80% 55%'],
    ['330 70% 92%', '330 75% 58%'],
    ['142 55% 92%', '142 65% 38%'],
    ['210 60% 94%', '210 75% 50%'],
  ];
  const [from, to] = hues[seed % hues.length]!;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, hsl(${from}) 0%, hsl(${to}) 100%)`,
        ...style,
      }}
      className="relative overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 16px)',
        }}
      />
    </div>
  );
}

function VCLogo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity w-fit"
    >
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
    </Link>
  );
}

export default function LoginPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Left — form */}
      <div className="flex flex-col justify-center gap-6 overflow-auto px-[88px] py-16">
        <VCLogo />

        <div>
          <h1 className="font-display text-[44px] font-medium tracking-[-1.2px]">Welcome back.</h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Sign in to pick up where you left off.
          </p>
        </div>

        <OAuthButton />

        {/* Divider */}
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <LoginForm />

        <p className="text-[13px] text-muted-foreground">
          New here?{' '}
          <Link
            to="/register"
            className="font-medium text-foreground underline underline-offset-[3px]"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Right — image collage */}
      <div className="bg-tint p-10">
        <div className="grid h-full grid-cols-2 items-center gap-3.5">
          <GradientTile seed={0} style={{ borderRadius: 12, aspectRatio: '3/4' }} />
          <GradientTile seed={4} style={{ borderRadius: 12, aspectRatio: '3/4', marginTop: 40 }} />
          <GradientTile seed={6} style={{ borderRadius: 12, aspectRatio: '3/4', marginTop: -30 }} />
          <GradientTile seed={3} style={{ borderRadius: 12, aspectRatio: '3/4' }} />
        </div>
      </div>
    </div>
  );
}
