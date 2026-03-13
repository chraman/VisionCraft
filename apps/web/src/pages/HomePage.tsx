import { Link } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';

// ─── Header ────────────────────────────────────────────────────────────────────

function Header() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">VisionCraft</span>
        </Link>

        <nav className="hidden gap-8 md:flex">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/generate"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go to app
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────────

function Hero() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white py-24 md:py-36">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30"
      >
        <div className="h-[600px] w-[600px] rounded-full bg-indigo-200 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700">
          Powered by Stable Diffusion XL &amp; DALL·E 3
        </span>

        <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
          Turn your words into
          <span className="text-indigo-600"> stunning images</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          VisionCraft lets you generate, transform, and save AI-created images in seconds. Type a
          prompt, upload a photo, or mix both — the results speak for themselves.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to={isAuthenticated ? '/generate' : '/register'}
            className="rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-indigo-700"
          >
            {isAuthenticated ? 'Go to app' : 'Start creating for free'}
          </Link>
          <a
            href="#how-it-works"
            className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50"
          >
            See how it works
          </a>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          No credit card required · 10 free generations/month
        </p>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: '✦',
    title: 'Text to Image',
    description:
      'Describe anything in plain English and watch it come to life. Supports aspect ratios, styles, and HD quality.',
  },
  {
    icon: '⇄',
    title: 'Image to Image',
    description:
      'Upload a photo and transform it with a prompt. Control how strongly the AI reimagines your original.',
  },
  {
    icon: '◈',
    title: 'Multi-model',
    description:
      'Choose between Stable Diffusion XL, DALL·E 3, and more. Automatic failover keeps generation always available.',
  },
  {
    icon: '⊟',
    title: 'Saved Gallery',
    description:
      'Every image you love is saved to your personal gallery. Browse, download, or delete at any time.',
  },
  {
    icon: '⚡',
    title: 'Real-time progress',
    description:
      'Server-sent events stream job status live — no page refresh needed to see your image appear.',
  },
  {
    icon: '⛨',
    title: 'Secure &amp; private',
    description:
      'RS256 JWT auth, httpOnly refresh cookies, and per-user quota enforcement keep your account safe.',
  },
];

function Features() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
            Everything you need to create
          </h2>
          <p className="mt-4 text-gray-600">
            A complete AI image platform, built for speed and reliability.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <span className="text-2xl text-indigo-500">{f.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p
                className="mt-2 text-sm leading-relaxed text-gray-600"
                dangerouslySetInnerHTML={{ __html: f.description }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ───────────────────────────────────────────────────────────────

const steps = [
  {
    step: '01',
    title: 'Create an account',
    body: 'Sign up free in seconds — email or Google OAuth.',
  },
  {
    step: '02',
    title: 'Write a prompt',
    body: 'Describe your image, pick aspect ratio and quality.',
  },
  {
    step: '03',
    title: 'Generate',
    body: 'Our AI pipeline runs your job and streams progress back live.',
  },
  { step: '04', title: 'Save & share', body: 'Keep your favourites in your personal gallery.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-indigo-50 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">How it works</h2>
          <p className="mt-4 text-gray-600">From sign-up to your first image in under a minute.</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl bg-white p-6 shadow-sm">
              <span className="text-4xl font-black text-indigo-100">{step}</span>
              <h3 className="mt-2 text-base font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ───────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    features: [
      '10 generations / month',
      'Standard quality',
      '1:1, 16:9 aspect ratios',
      'Saved gallery',
    ],
  },
  {
    name: 'Pro',
    price: '$12',
    period: 'per month',
    highlight: true,
    features: [
      '200 generations / month',
      'HD quality',
      'All aspect ratios',
      'Priority queue',
      'Model selector',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    highlight: false,
    features: [
      '2000+ generations / month',
      'Dedicated capacity',
      'API access',
      'Team workspaces',
      'SLA',
    ],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Simple pricing</h2>
          <p className="mt-4 text-gray-600">Start free. Upgrade when you need more.</p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlight
                  ? 'bg-indigo-600 text-white shadow-2xl ring-4 ring-indigo-300'
                  : 'border border-gray-200 bg-gray-50'
              }`}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-wider ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}
              >
                {plan.name}
              </p>
              <p
                className={`mt-2 text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}
              >
                {plan.price}
              </p>
              <p className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-gray-500'}`}>
                {plan.period}
              </p>

              <ul className="mt-6 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-indigo-100' : 'text-gray-700'}`}
                  >
                    <span className={plan.highlight ? 'text-indigo-300' : 'text-indigo-500'}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`mt-8 block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {plan.name === 'Enterprise' ? 'Contact us' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ─────────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section className="bg-indigo-600 py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          Ready to create your first image?
        </h2>
        <p className="mt-4 text-indigo-200">
          Join thousands of creators already using VisionCraft.
        </p>
        <Link
          to="/register"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          Start for free
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <span className="text-xl font-bold text-indigo-600">VisionCraft</span>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-gray-900">
              How it works
            </a>
            <a href="#pricing" className="hover:text-gray-900">
              Pricing
            </a>
            <Link to="/login" className="hover:text-gray-900">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-gray-900">
              Sign up
            </Link>
          </nav>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} VisionCraft. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
