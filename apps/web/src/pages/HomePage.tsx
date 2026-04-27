import { Link } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';

// ─── Logo ─────────────────────────────────────────────────────────────────────

function VCLogo({ size = 22 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2 text-foreground">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
      <span
        className="font-display font-semibold tracking-[-0.4px]"
        style={{ fontSize: size * 0.78 }}
      >
        VisionCraft
      </span>
    </span>
  );
}

// ─── Icon strip for feature cards ─────────────────────────────────────────────

const featureIcons: Record<string, React.ReactNode> = {
  sparkle: (
    <svg
      width={18}
      height={18}
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
  ),
  image: (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-10 10" />
    </svg>
  ),
  layers: (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l10 5-10 5L2 8l10-5z" />
      <path d="M2 13l10 5 10-5M2 18l10 5 10-5" />
    </svg>
  ),
  bolt: (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  gallery: (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  shield: (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />
    </svg>
  ),
  check: (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12l5 5L20 6" />
    </svg>
  ),
};

// Striped gradient placeholder
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
      className="relative overflow-hidden rounded-[10px]"
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

// ─── Sections ─────────────────────────────────────────────────────────────────

function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-10 py-[18px]">
        <VCLogo size={22} />
        <nav className="flex gap-7 text-[13.5px] text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </a>
          <Link to="/gallery" className="hover:text-foreground transition-colors">
            Gallery
          </Link>
        </nav>
        <div className="flex gap-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Go to app
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden px-10 pb-[50px] pt-[90px] text-center">
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at top, hsl(var(--vc-soft)) 0%, transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-[920px]">
        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-[5px] text-[11px] font-medium text-primary">
          {featureIcons.sparkle} New · SDXL Turbo available
        </span>

        {/* Headline */}
        <h1
          className="mt-[22px] mb-5 font-display font-medium tracking-[-2.2px] leading-[1.02]"
          style={{ fontSize: 76 }}
        >
          Imagination, <em className="not-italic text-primary">rendered</em>.
        </h1>

        <p className="mx-auto max-w-[560px] text-[18px] leading-relaxed text-muted-foreground">
          A calm, fast workspace for turning prompts and reference images into finished work.
        </p>

        <div className="mt-[30px] flex justify-center gap-2.5">
          <Link
            to={isAuthenticated ? '/generate' : '/register'}
            className="rounded-xl bg-primary px-[28px] py-[14px] text-[15px] font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Start creating — it's free
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-border bg-card px-[28px] py-[14px] text-[15px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            Watch 60-sec tour
          </a>
        </div>

        <p className="mt-[18px] text-[12px] text-muted-foreground">
          10 free generations / month · No credit card
        </p>
      </div>

      {/* App preview window */}
      <div
        className="mx-auto mt-[60px] max-w-[1080px] overflow-hidden rounded-2xl border border-border bg-card"
        style={{ boxShadow: '0 30px 80px -20px rgba(40,30,80,.18)' }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} className="h-[11px] w-[11px] rounded-full" style={{ background: c }} />
          ))}
          <div className="flex-1 text-center font-mono text-[11.5px] text-muted-foreground">
            app.visioncraft.io/generate
          </div>
        </div>

        <div className="grid min-h-[380px]" style={{ gridTemplateColumns: '320px 1fr' }}>
          {/* Left controls */}
          <div className="border-r border-border p-5">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">
              Prompt
            </div>
            <div className="min-h-[90px] rounded-lg border border-border bg-muted p-3.5 text-left text-[13px] leading-relaxed">
              A ceramic teapot on a marble shelf, early morning light, 35mm
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {['1:1', '16:9', '9:16', '4:3'].map((r, i) => (
                <button
                  key={r}
                  className={`rounded-lg border py-1.5 text-[12px] font-medium transition-colors ${
                    i === 0
                      ? 'border-primary bg-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-[13.5px] font-medium text-primary-foreground">
              {featureIcons.sparkle} Generate
            </button>
          </div>

          {/* Right image grid */}
          <div className="grid grid-cols-2 gap-3.5 p-5">
            {[2, 5, 1, 3].map((s) => (
              <GradientTile key={s} seed={s} style={{ aspectRatio: '1/1' }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: 'sparkle',
      t: 'Text to image',
      d: 'Write a prompt, pick an aspect ratio, ship a hero in seconds.',
    },
    {
      icon: 'image',
      t: 'Image to image',
      d: 'Upload a reference, tune strength, reimagine with a prompt.',
    },
    {
      icon: 'layers',
      t: 'Model registry',
      d: 'SDXL, DALL·E 3, HuggingFace. One API, automatic failover.',
    },
    { icon: 'bolt', t: 'Live progress', d: 'Real-time SSE updates stream straight to the canvas.' },
    {
      icon: 'gallery',
      t: 'Personal gallery',
      d: 'Every save ends up in a fast, justified, lazy-loaded grid.',
    },
    {
      icon: 'shield',
      t: 'Secure by default',
      d: 'RS256 JWT, httpOnly refresh, per-user quotas, audit log.',
    },
  ];

  return (
    <section id="features" className="px-10 py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.t}>
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-soft text-primary">
                {featureIcons[f.icon]}
              </div>
              <div className="mt-3 text-[15px] font-semibold">{f.t}</div>
              <div className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      sub: 'forever',
      features: ['10 generations / mo', 'Standard quality', '1:1 & 16:9', 'Personal gallery'],
      cta: 'Get started',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$12',
      sub: 'per month',
      features: [
        '200 generations / mo',
        'HD quality',
        'All aspect ratios',
        'Priority queue',
        'Model selector',
      ],
      cta: 'Start 14-day trial',
      highlight: true,
    },
    {
      name: 'Studio',
      price: 'Custom',
      sub: 'contact us',
      features: ['2000+ generations', 'Dedicated capacity', 'API access', 'Team workspaces', 'SLA'],
      cta: 'Talk to sales',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="px-10 py-[60px] pb-[100px]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 text-center">
          <h2 className="font-display text-[42px] font-medium tracking-[-1.2px]">
            Priced for practitioners.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Start free. Upgrade when the work starts paying.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-[18px]">
          {plans.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border p-7"
              style={
                p.highlight
                  ? {
                      background: 'hsl(var(--foreground))',
                      color: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--foreground))',
                    }
                  : { background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }
              }
            >
              <div
                className="text-[12px] font-semibold uppercase tracking-[0.8px]"
                style={{ color: p.highlight ? 'rgba(255,255,255,.75)' : 'hsl(var(--primary))' }}
              >
                {p.name}
              </div>
              <div className="mt-2 font-display text-[44px] font-medium leading-none tracking-[-1.5px]">
                {p.price}
              </div>
              <div className="text-[12.5px] opacity-70">{p.sub}</div>
              <div
                className="my-[18px] h-px"
                style={{ background: p.highlight ? 'rgba(255,255,255,.12)' : 'hsl(var(--border))' }}
              />
              <div className="flex flex-col gap-[9px]">
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-[13px]">
                    <span
                      style={{ color: p.highlight ? 'hsl(var(--primary))' : 'hsl(var(--primary))' }}
                    >
                      {featureIcons.check}
                    </span>
                    <span className="opacity-88">{feat}</span>
                  </div>
                ))}
              </div>
              <div className="mt-[22px]">
                <Link
                  to="/register"
                  className="block w-full rounded-lg py-2.5 text-center text-[13.5px] font-medium transition-opacity hover:opacity-90"
                  style={
                    p.highlight
                      ? { background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }
                      : {
                          background: 'transparent',
                          color: 'hsl(var(--foreground))',
                          border: '1px solid hsl(var(--border))',
                        }
                  }
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto max-w-[1200px] px-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <VCLogo size={20} />
          <nav className="flex flex-wrap justify-center gap-6 text-[13.5px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <Link to="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </nav>
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} VisionCraft. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={isAuthenticated} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
