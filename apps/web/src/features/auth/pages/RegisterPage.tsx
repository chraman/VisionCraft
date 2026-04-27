import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';
import { OAuthButton } from '../components/OAuthButton';

// Gradient tile placeholder
function GradientTile({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, hsl(262 70% 92%) 0%, hsl(262 83% 65%) 100%)',
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

export default function RegisterPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Left — form */}
      <div className="flex flex-col gap-6 overflow-auto px-20 py-12">
        <VCLogo />

        <div>
          <h1 className="font-display text-[44px] font-medium tracking-[-1.2px]">
            Create your account
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            10 generations on the house. No card required.
          </p>
        </div>

        <OAuthButton />

        {/* Divider */}
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or with email
          <div className="h-px flex-1 bg-border" />
        </div>

        <RegisterForm />

        <p className="text-[13px] text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-[3px]"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Right — image + testimonial */}
      <div className="relative flex flex-col overflow-hidden p-10">
        <GradientTile style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
        {/* Testimonial card */}
        <div
          className="relative mt-auto rounded-[14px] p-6 text-white"
          style={{ background: 'rgba(15,10,25,.55)', backdropFilter: 'blur(10px)' }}
        >
          <div className="font-display text-[26px] font-medium leading-[1.2] tracking-[-0.5px]">
            "It feels less like software and more like a tool. Prompts in, work out. No drama."
          </div>
          <div className="mt-3.5 text-[12.5px] opacity-80">
            — Mira Vance, Creative Director, Fold Studio
          </div>
        </div>
      </div>
    </div>
  );
}
