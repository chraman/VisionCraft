// All VisionCraft app screens — Phase 1 per frontend plan.

// ─── Shared bits ─────────────────────────────────────────────
const Sidebar = ({ active = 'generate' }) => {
  const items = [
    { k: 'dashboard', i: 'dashboard', t: 'Dashboard' },
    { k: 'generate', i: 'sparkle', t: 'Generate' },
    { k: 'gallery', i: 'gallery', t: 'Gallery' },
    { k: 'profile', i: 'user', t: 'Settings' },
  ];
  return (
    <aside
      style={{
        width: 232,
        background: 'hsl(var(--vc-card))',
        borderRight: '1px solid hsl(var(--vc-border))',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 14px',
      }}
    >
      <div style={{ padding: '0 8px 22px' }}>
        <VCLogo size={20} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const isA = it.k === active;
          return (
            <div
              key={it.k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: isA ? 600 : 500,
                cursor: 'pointer',
                background: isA ? 'hsl(var(--vc-soft))' : 'transparent',
                color: isA ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-muted-fg))',
              }}
            >
              <VCIcon name={it.i} size={17} /> {it.t}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 'auto',
          padding: 14,
          borderRadius: 10,
          background: 'hsl(var(--vc-muted))',
          border: '1px solid hsl(var(--vc-border))',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'hsl(var(--vc-muted-fg))',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
          }}
        >
          Quota · Free
        </div>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>
          7 <span style={{ color: 'hsl(var(--vc-muted-fg))', fontWeight: 400 }}>/ 10 used</span>
        </div>
        <VCProgress value={70} tone="amber" style={{ marginTop: 8 }} />
        <div style={{ marginTop: 10 }}>
          <VCButton size="sm" style={{ width: '100%', height: 30 }}>
            Upgrade to Pro
          </VCButton>
        </div>
      </div>
      <div
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '8px' }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'hsl(var(--vc-primary))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          AK
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Alex Kim
          </div>
          <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))' }}>Free tier</div>
        </div>
        <VCIcon name="logout" size={15} color="hsl(var(--vc-muted-fg))" />
      </div>
    </aside>
  );
};

const TopBar = ({ title, sub, right }) => (
  <div
    style={{
      padding: '18px 32px',
      borderBottom: '1px solid hsl(var(--vc-border))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'hsl(var(--vc-bg))',
    }}
  >
    <div>
      <div
        style={{
          fontFamily: 'var(--vc-font-display)',
          fontSize: 24,
          letterSpacing: -0.5,
          fontWeight: 500,
        }}
      >
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}>{sub}</div>
      )}
    </div>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{right}</div>
  </div>
);

// ─── 01 Landing ──────────────────────────────────────────────
function Screen01Landing() {
  return (
    <VCScreen scroll>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'hsla(var(--vc-bg) / 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(var(--vc-border))',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '18px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <VCLogo size={22} />
          <nav
            style={{ display: 'flex', gap: 28, fontSize: 13.5, color: 'hsl(var(--vc-muted-fg))' }}
          >
            <a>Features</a>
            <a>Models</a>
            <a>Gallery</a>
            <a>Pricing</a>
            <a>Docs</a>
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            <VCButton variant="ghost" size="sm">
              Sign in
            </VCButton>
            <VCButton variant="black" size="sm">
              Get started
            </VCButton>
          </div>
        </div>
      </div>
      <div
        style={{
          padding: '90px 40px 50px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at top, hsl(var(--vc-soft)) 0%, transparent 60%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 920, margin: '0 auto' }}>
          <VCBadge variant="soft">
            <VCIcon name="sparkle" size={13} /> New · SDXL Turbo available
          </VCBadge>
          <h1
            style={{
              fontFamily: 'var(--vc-font-display)',
              fontSize: 76,
              lineHeight: 1.02,
              letterSpacing: -2.2,
              fontWeight: 500,
              margin: '22px 0 20px',
            }}
          >
            Imagination,{' '}
            <em style={{ fontStyle: 'italic', color: 'hsl(var(--vc-primary))' }}>rendered</em>.
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'hsl(var(--vc-muted-fg))',
              maxWidth: 560,
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            A calm, fast workspace for turning prompts and reference images into finished work.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 30 }}>
            <VCButton size="xl">Start creating — it's free</VCButton>
            <VCButton variant="outline" size="xl">
              Watch 60-sec tour
            </VCButton>
          </div>
          <div style={{ marginTop: 18, fontSize: 12, color: 'hsl(var(--vc-muted-fg))' }}>
            10 free generations / month · No credit card
          </div>
        </div>
        <div
          style={{
            maxWidth: 1080,
            margin: '60px auto 0',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid hsl(var(--vc-border))',
            boxShadow: '0 30px 80px -20px rgba(40,30,80,.18)',
            background: 'hsl(var(--vc-card))',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid hsl(var(--vc-border))',
            }}
          >
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <div key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />
            ))}
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 11.5,
                color: 'hsl(var(--vc-muted-fg))',
                fontFamily: 'ui-monospace',
              }}
            >
              app.visioncraft.io/generate
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 380 }}>
            <div style={{ padding: 22, borderRight: '1px solid hsl(var(--vc-border))' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'hsl(var(--vc-muted-fg))',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Prompt
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: 14,
                  border: '1px solid hsl(var(--vc-border))',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  minHeight: 90,
                  background: 'hsl(var(--vc-muted))',
                }}
              >
                A ceramic teapot on a marble shelf, early morning light, 35mm
              </div>
              <div
                style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
              >
                {['1:1', '16:9', '9:16', '4:3'].map((r, i) => (
                  <VCButton
                    key={r}
                    variant={i === 0 ? 'default' : 'outline'}
                    size="sm"
                    style={{ height: 32 }}
                  >
                    {r}
                  </VCButton>
                ))}
              </div>
              <div style={{ marginTop: 18 }}>
                <VCButton style={{ width: '100%' }}>
                  <VCIcon name="sparkle" size={14} />
                  &nbsp;Generate
                </VCButton>
              </div>
            </div>
            <div style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[2, 5, 1, 3].map((s) => (
                <VCPlaceholder
                  key={s}
                  label="sdxl · teapot · 1:1"
                  seed={s}
                  style={{ borderRadius: 10 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '80px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            {
              i: 'sparkle',
              t: 'Text to image',
              d: 'Write a prompt, pick an aspect ratio, ship a hero in seconds.',
            },
            {
              i: 'image',
              t: 'Image to image',
              d: 'Upload a reference, tune strength, reimagine with a prompt.',
            },
            {
              i: 'layers',
              t: 'Model registry',
              d: 'SDXL, DALL·E 3, HuggingFace. One API, automatic failover.',
            },
            {
              i: 'bolt',
              t: 'Live progress',
              d: 'Real-time SSE updates stream straight to the canvas.',
            },
            {
              i: 'gallery',
              t: 'Personal gallery',
              d: 'Every save ends up in a fast, justified, lazy-loaded grid.',
            },
            {
              i: 'shield',
              t: 'Secure by default',
              d: 'RS256 JWT, httpOnly refresh, per-user quotas, audit log.',
            },
          ].map((f) => (
            <div key={f.t}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-soft))',
                  color: 'hsl(var(--vc-primary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VCIcon name={f.i} size={18} />
              </div>
              <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>{f.t}</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: 'hsl(var(--vc-muted-fg))',
                  lineHeight: 1.55,
                }}
              >
                {f.d}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '60px 40px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: 'var(--vc-font-display)',
              fontSize: 42,
              letterSpacing: -1.2,
              fontWeight: 500,
              margin: 0,
            }}
          >
            Priced for practitioners.
          </h2>
          <p style={{ color: 'hsl(var(--vc-muted-fg))', marginTop: 8 }}>
            Start free. Upgrade when the work starts paying.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {[
            {
              n: 'Free',
              p: '$0',
              sub: 'forever',
              f: ['10 generations / mo', 'Standard quality', '1:1 & 16:9', 'Personal gallery'],
              cta: 'Get started',
            },
            {
              n: 'Pro',
              p: '$12',
              sub: 'per month',
              f: [
                '200 generations / mo',
                'HD quality',
                'All aspect ratios',
                'Priority queue',
                'Model selector',
              ],
              cta: 'Start 14-day trial',
              hi: true,
            },
            {
              n: 'Studio',
              p: 'Custom',
              sub: 'contact us',
              f: [
                '2000+ generations',
                'Dedicated capacity',
                'API access',
                'Team workspaces',
                'SLA',
              ],
              cta: 'Talk to sales',
            },
          ].map((p) => (
            <VCCard
              key={p.n}
              padding={28}
              style={{
                ...(p.hi && {
                  background: 'hsl(var(--vc-fg))',
                  color: 'hsl(var(--vc-bg))',
                  border: '1px solid hsl(var(--vc-fg))',
                }),
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  opacity: p.hi ? 0.75 : 1,
                  color: p.hi ? 'inherit' : 'hsl(var(--vc-primary))',
                  fontWeight: 600,
                }}
              >
                {p.n}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--vc-font-display)',
                  fontSize: 44,
                  letterSpacing: -1.5,
                  fontWeight: 500,
                }}
              >
                {p.p}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.7 }}>{p.sub}</div>
              <div
                style={{
                  height: 1,
                  background: p.hi ? 'rgba(255,255,255,.12)' : 'hsl(var(--vc-border))',
                  margin: '18px 0',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.f.map((x) => (
                  <div key={x} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <VCIcon name="check" size={15} color="hsl(var(--vc-primary))" />
                    <span style={{ opacity: 0.88 }}>{x}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22 }}>
                <VCButton
                  variant={p.hi ? 'default' : 'outline'}
                  style={{
                    width: '100%',
                    ...(p.hi && { background: 'hsl(var(--vc-bg))', color: 'hsl(var(--vc-fg))' }),
                  }}
                >
                  {p.cta}
                </VCButton>
              </div>
            </VCCard>
          ))}
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 02 Sign Up ──────────────────────────────────────────────
function Screen02SignUp() {
  const [pw, setPw] = React.useState('CraftingVision7!');
  const [show, setShow] = React.useState(false);
  const strength = Math.min(4, Math.floor(pw.length / 3));
  return (
    <VCScreen>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
        <div
          style={{
            padding: '48px 80px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            overflow: 'auto',
          }}
        >
          <VCLogo size={22} />
          <div>
            <h1
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 44,
                letterSpacing: -1.2,
                fontWeight: 500,
                margin: 0,
              }}
            >
              Create your account
            </h1>
            <div style={{ marginTop: 6, color: 'hsl(var(--vc-muted-fg))', fontSize: 14 }}>
              10 generations on the house. No card required.
            </div>
          </div>
          <VCButton
            variant="outline"
            size="lg"
            style={{ width: '100%', justifyContent: 'center', gap: 10 }}
          >
            <VCIcon name="google" size={16} /> Continue with Google
          </VCButton>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'hsl(var(--vc-muted-fg))',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'hsl(var(--vc-border))' }} /> or with
            email <div style={{ flex: 1, height: 1, background: 'hsl(var(--vc-border))' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <VCInput
              label="Full name"
              defaultValue="Alex Kim"
              icon={<VCIcon name="user" size={15} />}
            />
            <VCInput
              label="Work email"
              defaultValue="alex@studio.co"
              icon={<VCIcon name="mail" size={15} />}
            />
            <VCInput
              label="Password"
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              icon={<VCIcon name="lock" size={15} />}
              trailing={
                <span onClick={() => setShow(!show)} style={{ cursor: 'pointer' }}>
                  <VCIcon name={show ? 'eyeOff' : 'eye'} size={15} />
                </span>
              }
              hint="Minimum 8 characters, mix case and numbers."
            />
            <div style={{ display: 'flex', gap: 4, marginTop: -2 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background:
                      i < strength
                        ? [
                            'hsl(0 80% 58%)',
                            'hsl(25 85% 55%)',
                            'hsl(45 90% 50%)',
                            'hsl(142 70% 42%)',
                          ][strength - 1]
                        : 'hsl(var(--vc-muted))',
                  }}
                />
              ))}
            </div>
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 12.5,
                color: 'hsl(var(--vc-muted-fg))',
              }}
            >
              <input type="checkbox" defaultChecked style={{ marginTop: 2 }} />
              <span>
                I agree to the{' '}
                <a style={{ color: 'hsl(var(--vc-fg))', textDecoration: 'underline' }}>Terms</a> and{' '}
                <a style={{ color: 'hsl(var(--vc-fg))', textDecoration: 'underline' }}>
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            <VCButton size="lg" style={{ marginTop: 6 }}>
              Create account
            </VCButton>
          </div>
          <div style={{ fontSize: 13, color: 'hsl(var(--vc-muted-fg))' }}>
            Already have an account?{' '}
            <a style={{ color: 'hsl(var(--vc-fg))', textDecoration: 'underline', fontWeight: 500 }}>
              Sign in
            </a>
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <VCPlaceholder label="" seed={2} style={{ position: 'absolute', inset: 0 }} />
          <div
            style={{
              position: 'relative',
              marginTop: 'auto',
              background: 'rgba(15,10,25,.55)',
              backdropFilter: 'blur(10px)',
              padding: 24,
              borderRadius: 14,
              color: '#fff',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 26,
                lineHeight: 1.2,
                letterSpacing: -0.5,
                fontWeight: 500,
              }}
            >
              "It feels less like software and more like a tool. Prompts in, work out. No drama."
            </div>
            <div style={{ marginTop: 14, fontSize: 12.5, opacity: 0.8 }}>
              — Mira Vance, Creative Director, Fold Studio
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 03 Log In ───────────────────────────────────────────────
function Screen03Login() {
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div
          style={{
            padding: '64px 88px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            justifyContent: 'center',
          }}
        >
          <VCLogo size={22} />
          <div>
            <h1
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 44,
                letterSpacing: -1.2,
                fontWeight: 500,
                margin: 0,
              }}
            >
              Welcome back.
            </h1>
            <div style={{ marginTop: 6, color: 'hsl(var(--vc-muted-fg))' }}>
              Sign in to pick up where you left off.
            </div>
          </div>
          <VCButton
            variant="outline"
            size="lg"
            style={{ width: '100%', justifyContent: 'center', gap: 10 }}
          >
            <VCIcon name="google" size={16} /> Continue with Google
          </VCButton>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'hsl(var(--vc-muted-fg))',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'hsl(var(--vc-border))' }} /> or{' '}
            <div style={{ flex: 1, height: 1, background: 'hsl(var(--vc-border))' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <VCInput
              label="Email"
              defaultValue="alex@studio.co"
              icon={<VCIcon name="mail" size={15} />}
            />
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 12.5, fontWeight: 500 }}>Password</label>
                <a style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))' }}>Forgot?</a>
              </div>
              <VCInput
                type="password"
                defaultValue="••••••••••"
                icon={<VCIcon name="lock" size={15} />}
              />
            </div>
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                fontSize: 12.5,
                color: 'hsl(var(--vc-muted-fg))',
              }}
            >
              <input type="checkbox" defaultChecked /> Keep me signed in for 30 days
            </label>
            <VCButton size="lg" style={{ marginTop: 4 }}>
              Sign in
            </VCButton>
          </div>
          <div style={{ fontSize: 13, color: 'hsl(var(--vc-muted-fg))' }}>
            New here?{' '}
            <a style={{ color: 'hsl(var(--vc-fg))', textDecoration: 'underline', fontWeight: 500 }}>
              Create an account
            </a>
          </div>
        </div>
        <div
          style={{
            background: 'hsl(var(--vc-tint))',
            padding: 40,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            alignContent: 'center',
          }}
        >
          <VCPlaceholder
            label="sdxl · dune"
            seed={0}
            style={{ borderRadius: 12, aspectRatio: '3/4' }}
          />
          <VCPlaceholder
            label="sdxl · portrait"
            seed={4}
            style={{ borderRadius: 12, aspectRatio: '3/4', marginTop: 40 }}
          />
          <VCPlaceholder
            label="dalle3 · studio"
            seed={6}
            style={{ borderRadius: 12, aspectRatio: '3/4', marginTop: -30 }}
          />
          <VCPlaceholder
            label="sdxl · archive"
            seed={3}
            style={{ borderRadius: 12, aspectRatio: '3/4' }}
          />
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 04 Email Verify ────────────────────────────────────────
function Screen04EmailVerify() {
  return (
    <VCScreen tint>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <VCLogo size={22} />
        <VCCard padding={0} style={{ marginTop: 32, width: 480, overflow: 'hidden' }}>
          <div style={{ padding: 36, textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: '0 auto',
                borderRadius: 18,
                background: 'hsl(var(--vc-soft))',
                color: 'hsl(var(--vc-primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VCIcon name="mail" size={30} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 28,
                letterSpacing: -0.8,
                fontWeight: 500,
                margin: '20px 0 8px',
              }}
            >
              Check your inbox.
            </h2>
            <div style={{ fontSize: 14, color: 'hsl(var(--vc-muted-fg))', lineHeight: 1.55 }}>
              We sent a verification link to
              <br />
              <span style={{ color: 'hsl(var(--vc-fg))', fontWeight: 500 }}>alex@studio.co</span>.
              Click it to activate your account.
            </div>
            <div style={{ marginTop: 26, display: 'flex', gap: 10, justifyContent: 'center' }}>
              <VCButton variant="outline">Open Gmail</VCButton>
              <VCButton>Resend email</VCButton>
            </div>
          </div>
          <div
            style={{
              padding: '14px 20px',
              background: 'hsl(var(--vc-muted))',
              borderTop: '1px solid hsl(var(--vc-border))',
              fontSize: 12,
              color: 'hsl(var(--vc-muted-fg))',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>
              Check spam or{' '}
              <a style={{ color: 'hsl(var(--vc-fg))', textDecoration: 'underline' }}>
                change email
              </a>
              .
            </span>
            <span>Expires in 24h</span>
          </div>
        </VCCard>
      </div>
    </VCScreen>
  );
}

// ─── 05 Dashboard ────────────────────────────────────────────
function Screen05Dashboard() {
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="dashboard" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar
            title="Welcome back, Alex"
            sub="Here's what's happening in your workspace"
            right={
              <>
                <VCInput
                  defaultValue=""
                  placeholder="Search images, prompts…"
                  icon={<VCIcon name="search" size={15} />}
                  wrapStyle={{ width: 280 }}
                />
                <VCButton>
                  <VCIcon name="plus" size={14} />
                  &nbsp;New generation
                </VCButton>
              </>
            }
          />
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            {/* stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { t: 'Generated', v: '148', d: '+12 this week', tone: 'hsl(var(--vc-primary))' },
                { t: 'Saved', v: '62', d: '42% save rate', tone: 'hsl(142 70% 42%)' },
                { t: 'Quota used', v: '7 / 10', d: 'Resets in 14 days', tone: 'hsl(38 92% 55%)' },
                {
                  t: 'Avg time',
                  v: '11.8s',
                  d: 'SDXL on Stability',
                  tone: 'hsl(var(--vc-muted-fg))',
                },
              ].map((s) => (
                <VCCard key={s.t} padding={18}>
                  <div style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))', fontWeight: 500 }}>
                    {s.t}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--vc-font-display)',
                      fontSize: 32,
                      letterSpacing: -0.8,
                      fontWeight: 500,
                      marginTop: 6,
                    }}
                  >
                    {s.v}
                  </div>
                  <div style={{ fontSize: 12, color: s.tone, marginTop: 2 }}>{s.d}</div>
                </VCCard>
              ))}
            </div>
            {/* main grid */}
            <div
              style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}
            >
              <VCCard padding={0}>
                <div
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid hsl(var(--vc-border))',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Recent generations</div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))' }}>
                      Last 8 · across all models
                    </div>
                  </div>
                  <VCButton variant="ghost" size="sm">
                    View gallery <VCIcon name="arrowRight" size={14} />
                  </VCButton>
                </div>
                <div
                  style={{
                    padding: 14,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        aspectRatio: '1/1',
                        position: 'relative',
                      }}
                    >
                      <VCPlaceholder label="" seed={i} />
                    </div>
                  ))}
                </div>
              </VCCard>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <VCCard
                  style={{
                    background:
                      'linear-gradient(140deg, hsl(var(--vc-primary)) 0%, hsl(var(--vc-primary) / .75) 100%)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      opacity: 0.85,
                      fontWeight: 600,
                    }}
                  >
                    Quick start
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--vc-font-display)',
                      fontSize: 26,
                      letterSpacing: -0.6,
                      fontWeight: 500,
                      marginTop: 8,
                      lineHeight: 1.1,
                    }}
                  >
                    Make something.
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.88, marginTop: 6, lineHeight: 1.5 }}>
                    3 free generations left this week. Try a prompt.
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <VCButton
                      variant="default"
                      style={{
                        background: 'rgba(255,255,255,.95)',
                        color: 'hsl(var(--vc-primary))',
                        width: '100%',
                      }}
                    >
                      <VCIcon name="sparkle" size={14} />
                      &nbsp;New from prompt
                    </VCButton>
                  </div>
                </VCCard>
                <VCCard padding={0}>
                  <div
                    style={{
                      padding: '14px 18px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderBottom: '1px solid hsl(var(--vc-border))',
                    }}
                  >
                    Activity
                  </div>
                  {[
                    { i: 'sparkle', t: 'Generated "teapot on marble"', s: '2m ago' },
                    { i: 'save', t: 'Saved to Gallery', s: '3m ago' },
                    { i: 'image', t: 'Upload ref.jpg → img2img', s: '1h ago' },
                    { i: 'refresh', t: 'Regenerated 2 variants', s: '3h ago' },
                  ].map((a, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px 18px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        borderBottom: i < 3 ? '1px solid hsl(var(--vc-border))' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: 'hsl(var(--vc-muted))',
                          color: 'hsl(var(--vc-muted-fg))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <VCIcon name={a.i} size={14} />
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>{a.t}</div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))' }}>{a.s}</div>
                    </div>
                  ))}
                </VCCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 06 Generate — Text ──────────────────────────────────────
function Screen06Text2Img() {
  const [ar, setAr] = React.useState('1:1');
  const [q, setQ] = React.useState('HD');
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="Turn prompts into finished images"
            right={
              <VCBadge variant="muted">
                <VCIcon name="bolt" size={12} /> 3 credits left
              </VCBadge>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '380px 1fr',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: 24,
                borderRight: '1px solid hsl(var(--vc-border))',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: 'hsl(var(--vc-card))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: 3,
                  background: 'hsl(var(--vc-muted))',
                  borderRadius: 10,
                }}
              >
                {['Text → Image', 'Image → Image'].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '7px 8px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      borderRadius: 7,
                      background: i === 0 ? 'hsl(var(--vc-bg))' : 'transparent',
                      color: i === 0 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                      cursor: 'pointer',
                      boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>Prompt</div>
                <textarea
                  defaultValue="A ceramic teapot on a marble shelf, early morning light through a linen curtain, shallow depth of field, 35mm film grain"
                  style={{
                    width: '100%',
                    minHeight: 130,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--vc-border))',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: 'hsl(var(--vc-muted-fg))',
                  }}
                >
                  <span>Describe subject, lighting, style.</span>
                  <span>147 / 1000</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>Aspect ratio</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { k: '1:1', w: 18, h: 18 },
                    { k: '16:9', w: 22, h: 13 },
                    { k: '9:16', w: 13, h: 22 },
                    { k: '4:3', w: 20, h: 15 },
                  ].map((r) => (
                    <button
                      key={r.k}
                      onClick={() => setAr(r.k)}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: 8,
                        border:
                          '1px solid ' +
                          (ar === r.k ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-border))'),
                        background: ar === r.k ? 'hsl(var(--vc-soft))' : 'hsl(var(--vc-bg))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        color: ar === r.k ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-muted-fg))',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      <div
                        style={{
                          width: r.w,
                          height: r.h,
                          border: '1.5px solid currentColor',
                          borderRadius: 2,
                        }}
                      />
                      {r.k}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12.5,
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                >
                  <span>Quality</span>
                  <span style={{ color: 'hsl(var(--vc-muted-fg))', fontWeight: 400 }}>{q}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Standard', 'HD'].map((k) => (
                    <button
                      key={k}
                      onClick={() => setQ(k)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 8,
                        border:
                          '1px solid ' +
                          (q === k ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-border))'),
                        background: q === k ? 'hsl(var(--vc-soft))' : 'hsl(var(--vc-bg))',
                        color: q === k ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-fg))',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: 12.5,
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: 12,
                  border: '1px solid hsl(var(--vc-border))',
                  borderRadius: 10,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  background: 'hsl(var(--vc-muted))',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'hsl(var(--vc-bg))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VCIcon name="layers" size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>Stable Diffusion XL</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))' }}>
                    Stability AI · Primary
                  </div>
                </div>
                <VCBadge variant="muted" style={{ fontSize: 10 }}>
                  auto
                </VCBadge>
              </div>
              <VCButton size="lg" style={{ justifyContent: 'center' }}>
                <VCIcon name="sparkle" size={15} />
                &nbsp;Generate · 1 credit
              </VCButton>
            </div>

            <div style={{ padding: 28, overflow: 'auto', background: 'hsl(var(--vc-tint))' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--vc-font-display)',
                      fontSize: 22,
                      letterSpacing: -0.4,
                      fontWeight: 500,
                    }}
                  >
                    Latest generation
                  </div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}>
                    Completed 12.4s ago · SDXL · 1:1 · HD
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <VCButton variant="outline" size="sm">
                    <VCIcon name="refresh" size={13} />
                    &nbsp;Regenerate
                  </VCButton>
                  <VCButton variant="outline" size="sm">
                    <VCIcon name="download" size={13} />
                    &nbsp;Download
                  </VCButton>
                  <VCButton size="sm">
                    <VCIcon name="save" size={13} />
                    &nbsp;Save to gallery
                  </VCButton>
                </div>
              </div>
              <div
                style={{
                  aspectRatio: '1/1',
                  borderRadius: 14,
                  overflow: 'hidden',
                  maxWidth: 600,
                  margin: '0 auto',
                  boxShadow: '0 20px 60px -20px rgba(40,30,80,.18)',
                }}
              >
                <VCPlaceholder label="sdxl · teapot on marble · 1024×1024" seed={2} />
              </div>
              <div style={{ marginTop: 24, maxWidth: 600, margin: '24px auto 0' }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'hsl(var(--vc-muted-fg))',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 10,
                  }}
                >
                  This session
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {[5, 1, 3, 0, 4].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1/1',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border:
                          i === 0
                            ? '2px solid hsl(var(--vc-primary))'
                            : '1px solid hsl(var(--vc-border))',
                      }}
                    >
                      <VCPlaceholder label="" seed={s} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 07 Generate — Img2Img ──────────────────────────────────
function Screen07Img2Img() {
  const [strength, setStrength] = React.useState(0.55);
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar title="Generate" sub="Transform an existing image with a prompt" />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '380px 1fr',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: 24,
                borderRight: '1px solid hsl(var(--vc-border))',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: 'hsl(var(--vc-card))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: 3,
                  background: 'hsl(var(--vc-muted))',
                  borderRadius: 10,
                }}
              >
                {['Text → Image', 'Image → Image'].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '7px 8px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      borderRadius: 7,
                      background: i === 1 ? 'hsl(var(--vc-bg))' : 'transparent',
                      color: i === 1 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                      cursor: 'pointer',
                      boxShadow: i === 1 ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>
                  Reference image
                </div>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 10,
                    overflow: 'hidden',
                    aspectRatio: '1/1',
                  }}
                >
                  <VCPlaceholder label="ref · portrait-014.jpg · 2.3 MB" seed={4} />
                  <button
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,.55)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <VCIcon name="crop" size={12} /> Crop
                  </button>
                  <button
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(0,0,0,.55)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <VCIcon name="refresh" size={12} /> Replace
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 8 }}>Prompt</div>
                <textarea
                  defaultValue="Reimagine as a Renaissance oil portrait, warm candlelight, chiaroscuro, painterly brushstrokes"
                  style={{
                    width: '100%',
                    minHeight: 88,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--vc-border))',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>Transform strength</span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      fontFamily: 'ui-monospace',
                    }}
                  >
                    {strength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.01"
                  value={strength}
                  onChange={(e) => setStrength(+e.target.value)}
                  style={{ width: '100%', accentColor: 'hsl(var(--vc-primary))' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    marginTop: 4,
                  }}
                >
                  <span>Subtle change</span>
                  <span>Reimagine</span>
                </div>
              </div>
              <VCButton size="lg" style={{ justifyContent: 'center' }}>
                <VCIcon name="sparkle" size={15} />
                &nbsp;Transform · 1 credit
              </VCButton>
            </div>
            <div style={{ padding: 28, overflow: 'auto', background: 'hsl(var(--vc-tint))' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                  maxWidth: 900,
                  margin: '0 auto',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--vc-muted-fg))',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      marginBottom: 10,
                    }}
                  >
                    Before
                  </div>
                  <div style={{ aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden' }}>
                    <VCPlaceholder label="original · 1024×1024" seed={4} />
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--vc-primary))',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      marginBottom: 10,
                    }}
                  >
                    After · Renaissance oil
                  </div>
                  <div style={{ aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden' }}>
                    <VCPlaceholder label="sdxl · strength 0.55" seed={5} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <VCButton variant="outline" size="sm">
                  <VCIcon name="refresh" size={13} />
                  &nbsp;New variant
                </VCButton>
                <VCButton variant="outline" size="sm">
                  <VCIcon name="download" size={13} />
                  &nbsp;Download
                </VCButton>
                <VCButton size="sm">
                  <VCIcon name="save" size={13} />
                  &nbsp;Save
                </VCButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 08 Generate States ──────────────────────────────────────
function Screen08States() {
  return (
    <VCScreen tint>
      <div
        style={{
          padding: 32,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          height: '100%',
        }}
      >
        {/* Loading */}
        <VCCard
          padding={0}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid hsl(var(--vc-border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Generating…</div>
            <VCBadge variant="soft">
              <VCIcon name="bolt" size={11} /> Live
            </VCBadge>
          </div>
          <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: 10,
                background:
                  'linear-gradient(90deg, hsl(var(--vc-muted)) 0%, hsl(var(--vc-soft)) 50%, hsl(var(--vc-muted)) 100%)',
                backgroundSize: '200% 100%',
                animation: 'vc-shimmer 1.6s linear infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <VCIcon name="sparkle" size={28} color="hsl(var(--vc-primary))" />
              <div
                style={{
                  fontSize: 12,
                  color: 'hsl(var(--vc-muted-fg))',
                  fontFamily: 'ui-monospace',
                }}
              >
                step 28 / 40 · diffusing
              </div>
            </div>
            <VCProgress value={70} tone="primary" />
            <div
              style={{
                fontSize: 12,
                color: 'hsl(var(--vc-muted-fg))',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Stability AI · SDXL · seed 438192</span>
              <span>~4s remaining</span>
            </div>
          </div>
        </VCCard>

        {/* Success */}
        <VCCard
          padding={0}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid hsl(var(--vc-border))',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Generation complete</div>
            <VCBadge variant="success">
              <VCIcon name="check" size={11} /> 11.8s
            </VCBadge>
          </div>
          <div style={{ flex: 1, padding: 22 }}>
            <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '1/1' }}>
              <VCPlaceholder label="sdxl · teapot · 1024²" seed={2} />
            </div>
          </div>
          <div
            style={{
              padding: 14,
              borderTop: '1px solid hsl(var(--vc-border))',
              display: 'flex',
              gap: 8,
            }}
          >
            <VCButton variant="outline" size="sm" style={{ flex: 1 }}>
              <VCIcon name="refresh" size={13} />
              &nbsp;Regenerate
            </VCButton>
            <VCButton variant="outline" size="sm" style={{ flex: 1 }}>
              <VCIcon name="download" size={13} />
              &nbsp;Download
            </VCButton>
            <VCButton size="sm" style={{ flex: 1 }}>
              <VCIcon name="save" size={13} />
              &nbsp;Save
            </VCButton>
          </div>
        </VCCard>

        {/* Error */}
        <VCCard
          padding={0}
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid hsl(var(--vc-border))',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Generation failed</div>
            <VCBadge variant="danger">
              <VCIcon name="warn" size={11} /> 502
            </VCBadge>
          </div>
          <div
            style={{
              flex: 1,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'hsl(0 84% 95%)',
                color: 'hsl(0 70% 42%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VCIcon name="warn" size={24} />
            </div>
            <div
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 20,
                letterSpacing: -0.3,
                fontWeight: 500,
              }}
            >
              Provider briefly unavailable
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'hsl(var(--vc-muted-fg))',
                maxWidth: 300,
                lineHeight: 1.5,
              }}
            >
              Stability AI returned 502. We'll retry on DALL·E 3 automatically, or you can try again
              now.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <VCButton variant="outline" size="sm">
                View details
              </VCButton>
              <VCButton size="sm">
                <VCIcon name="refresh" size={13} />
                &nbsp;Try again
              </VCButton>
            </div>
          </div>
        </VCCard>

        {/* Quota exceeded */}
        <VCCard
          padding={0}
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'hsl(var(--vc-fg))',
            color: 'hsl(var(--vc-bg))',
            border: 'none',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255,255,255,.1)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Monthly limit reached</div>
            <VCBadge variant="warn">10 / 10 used</VCBadge>
          </div>
          <div
            style={{
              flex: 1,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--vc-font-display)',
                fontSize: 26,
                letterSpacing: -0.6,
                fontWeight: 500,
                lineHeight: 1.15,
              }}
            >
              You've used all 10 free generations this month.
            </div>
            <div style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.55 }}>
              Upgrade to Pro for 200 HD generations, priority queue, and the model selector — or
              wait 14 days for your quota to reset.
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
              <VCButton
                variant="default"
                style={{ background: 'hsl(var(--vc-bg))', color: 'hsl(var(--vc-fg))' }}
              >
                Upgrade to Pro · $12/mo
              </VCButton>
              <VCButton
                variant="outline"
                style={{
                  background: 'transparent',
                  color: 'hsl(var(--vc-bg))',
                  border: '1px solid rgba(255,255,255,.25)',
                }}
              >
                See pricing
              </VCButton>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>
              Resets Nov 1 · 14 days
            </div>
          </div>
        </VCCard>
      </div>
      <style>{`@keyframes vc-shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }`}</style>
    </VCScreen>
  );
}

// ─── 09 Gallery ──────────────────────────────────────────────
function Screen09Gallery() {
  const imgs = [
    { s: 2, h: 240, p: 'teapot on marble shelf' },
    { s: 5, h: 300, p: 'Renaissance oil portrait' },
    { s: 0, h: 210, p: 'dune ridge at golden hour' },
    { s: 4, h: 260, p: 'editorial portrait, linen' },
    { s: 6, h: 230, p: 'studio lit still life' },
    { s: 1, h: 290, p: 'foggy coastal pine' },
    { s: 3, h: 220, p: 'archive shelf, morning' },
    { s: 6, h: 280, p: 'ceramic vessel on oak' },
    { s: 2, h: 210, p: 'minimal interior, dawn' },
    { s: 4, h: 250, p: 'overhead linen sheet' },
    { s: 0, h: 270, p: 'mountain pass, haze' },
    { s: 5, h: 230, p: 'oil painting, bird in hand' },
  ];
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="gallery" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Gallery"
            sub="62 saved images · 148 total generated"
            right={
              <>
                <VCInput
                  placeholder="Search prompts…"
                  icon={<VCIcon name="search" size={15} />}
                  wrapStyle={{ width: 260 }}
                />
                <VCButton variant="outline" size="sm">
                  <VCIcon name="filter" size={13} />
                  &nbsp;Filter
                </VCButton>
                <VCButton size="sm">
                  <VCIcon name="plus" size={13} />
                  &nbsp;New
                </VCButton>
              </>
            }
          />
          <div
            style={{
              padding: '14px 32px',
              borderBottom: '1px solid hsl(var(--vc-border))',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 12.5,
              background: 'hsl(var(--vc-card))',
            }}
          >
            {['All', 'Text2Img', 'Img2Img', 'SDXL', 'DALL·E 3', 'This week', 'Starred'].map(
              (t, i) => (
                <div
                  key={t}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: i === 0 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted))',
                    color: i === 0 ? 'hsl(var(--vc-bg))' : 'hsl(var(--vc-muted-fg))',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </div>
              )
            )}
            <div style={{ flex: 1 }} />
            <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>Sort: Newest first</span>
          </div>
          <div
            style={{ flex: 1, overflow: 'auto', padding: 22, background: 'hsl(var(--vc-tint))' }}
          >
            <div style={{ columnCount: 4, columnGap: 14 }}>
              {imgs.map((im, i) => (
                <div
                  key={i}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: 14,
                    borderRadius: 10,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div style={{ height: im.h, position: 'relative' }}>
                    <VCPlaceholder label={im.p} seed={im.s} />
                  </div>
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,.5)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <VCIcon name="heart" size={14} />
                    </div>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,.5)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <VCIcon name="more" size={14} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', left: 8, bottom: 8 }}>
                    <VCBadge
                      variant="muted"
                      style={{
                        background: 'rgba(0,0,0,.55)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 10,
                      }}
                    >
                      SDXL
                    </VCBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 10 Image Detail ────────────────────────────────────────
function Screen10Detail() {
  return (
    <VCScreen style={{ background: 'hsl(220 20% 4%)' }}>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 360px' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'rgba(255,255,255,.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <VCIcon name="x" size={17} />
            </div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12.5 }}>
              Gallery / <span style={{ color: '#fff' }}>teapot on marble</span>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 6 }}>
            {['zoomOut', 'zoomIn', 'maximize'].map((n) => (
              <div
                key={n}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,.08)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <VCIcon name={n} size={16} />
              </div>
            ))}
          </div>
          <div
            style={{
              maxHeight: '80%',
              aspectRatio: '1/1',
              width: '80%',
              maxWidth: 620,
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,.5)',
            }}
          >
            <VCPlaceholder label="sdxl · teapot · 1024×1024" seed={2} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 10,
              padding: 8,
              background: 'rgba(255,255,255,.08)',
              borderRadius: 12,
              backdropFilter: 'blur(10px)',
            }}
          >
            {[2, 5, 1, 3, 0, 4].map((s, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: i === 0 ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <VCPlaceholder label="" seed={s} />
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: 'hsl(var(--vc-bg))',
            borderLeft: '1px solid hsl(var(--vc-border))',
            padding: 24,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'hsl(var(--vc-muted-fg))',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 600,
              }}
            >
              Prompt
            </div>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 8,
                background: 'hsl(var(--vc-muted))',
                fontSize: 13,
                lineHeight: 1.55,
                position: 'relative',
              }}
            >
              A ceramic teapot on a marble shelf, early morning light through a linen curtain,
              shallow depth of field, 35mm film grain
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  padding: '4px 6px',
                  background: 'hsl(var(--vc-bg))',
                  borderRadius: 5,
                  cursor: 'pointer',
                }}
              >
                <VCIcon name="copy" size={13} />
              </div>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'hsl(var(--vc-muted-fg))',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Metadata
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              {[
                ['Model', 'Stable Diffusion XL'],
                ['Provider', 'Stability AI'],
                ['Dimensions', '1024 × 1024'],
                ['Aspect ratio', '1:1'],
                ['Quality', 'HD · 40 steps'],
                ['Seed', <span style={{ fontFamily: 'ui-monospace' }}>438192</span>],
                ['Generated', 'Oct 17, 2025 · 2:14pm'],
                ['Time', '11.8s'],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid hsl(var(--vc-border))',
                    paddingBottom: 8,
                  }}
                >
                  <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <VCButton variant="outline" size="sm">
              <VCIcon name="download" size={13} />
              &nbsp;Download
            </VCButton>
            <VCButton variant="outline" size="sm">
              <VCIcon name="share" size={13} />
              &nbsp;Share link
            </VCButton>
            <VCButton variant="outline" size="sm">
              <VCIcon name="refresh" size={13} />
              &nbsp;Variant
            </VCButton>
            <VCButton variant="outline" size="sm" style={{ color: 'hsl(0 70% 50%)' }}>
              <VCIcon name="trash" size={13} />
              &nbsp;Delete
            </VCButton>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 11 Profile / Settings ──────────────────────────────────
function Screen11Profile() {
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="profile" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar title="Settings" sub="Account, billing, and preferences" />
          <div
            style={{ flex: 1, overflow: 'auto', padding: 32, background: 'hsl(var(--vc-tint))' }}
          >
            <div
              style={{
                maxWidth: 720,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '180px 1fr',
                gap: 32,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  position: 'sticky',
                  top: 0,
                  alignSelf: 'start',
                }}
              >
                {[
                  'Profile',
                  'Plan & quota',
                  'Security',
                  'Notifications',
                  'Preferences',
                  'Danger zone',
                ].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: i === 0 ? 600 : 500,
                      color: i === 0 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                      background: i === 0 ? 'hsl(var(--vc-bg))' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <VCCard>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Profile</div>
                  <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}>
                    This is how others will see you.
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        background: 'hsl(var(--vc-primary))',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        fontWeight: 600,
                        fontFamily: 'var(--vc-font-display)',
                      }}
                    >
                      AK
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <VCButton variant="outline" size="sm">
                        Upload new
                      </VCButton>
                      <VCButton variant="ghost" size="sm">
                        Remove
                      </VCButton>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 20,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 14,
                    }}
                  >
                    <VCInput label="Full name" defaultValue="Alex Kim" />
                    <VCInput label="Username" defaultValue="alex.kim" />
                    <VCInput
                      label="Email"
                      defaultValue="alex@studio.co"
                      trailing={
                        <VCBadge variant="success" style={{ fontSize: 10 }}>
                          verified
                        </VCBadge>
                      }
                      wrapStyle={{ gridColumn: '1 / -1' }}
                    />
                  </div>
                  <div
                    style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}
                  >
                    <VCButton variant="ghost" size="sm">
                      Cancel
                    </VCButton>
                    <VCButton size="sm">Save changes</VCButton>
                  </div>
                </VCCard>

                <VCCard>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Plan · Free</div>
                      <div
                        style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}
                      >
                        Resets Nov 1
                      </div>
                    </div>
                    <VCButton size="sm">Upgrade to Pro</VCButton>
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>Generations used</span>
                      <span style={{ fontWeight: 500 }}>7 of 10</span>
                    </div>
                    <VCProgress value={70} tone="amber" />
                  </div>
                </VCCard>

                <VCCard>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Security</div>
                  <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}>
                    Password and two-factor auth.
                  </div>
                  <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid hsl(var(--vc-border))',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Password</div>
                        <div style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))' }}>
                          Last changed 3 months ago
                        </div>
                      </div>
                      <VCButton variant="outline" size="sm">
                        Change
                      </VCButton>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          Two-factor auth{' '}
                          <VCBadge variant="muted" style={{ fontSize: 10 }}>
                            off
                          </VCBadge>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))' }}>
                          Protect your account with a TOTP app.
                        </div>
                      </div>
                      <VCButton variant="outline" size="sm">
                        Enable 2FA
                      </VCButton>
                    </div>
                  </div>
                </VCCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 12 Quota modal ──────────────────────────────────────────
function Screen12QuotaModal() {
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: 'hsl(var(--vc-tint))',
            filter: 'blur(1px)',
          }}
        >
          <TopBar title="Generate" sub="Turn prompts into finished images" />
          <div style={{ padding: 40, opacity: 0.4 }}>
            <div
              style={{
                width: '60%',
                height: 300,
                background: 'hsl(var(--vc-muted))',
                borderRadius: 12,
              }}
            />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(20,15,30,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VCCard
            padding={0}
            style={{ width: 480, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.3)' }}
          >
            <div style={{ position: 'relative', padding: '38px 32px 20px', textAlign: 'center' }}>
              <VCPlaceholder
                label=""
                seed={5}
                style={{ position: 'absolute', inset: 0, opacity: 0.12 }}
              />
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto',
                    borderRadius: 16,
                    background: 'hsl(var(--vc-fg))',
                    color: 'hsl(var(--vc-bg))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VCIcon name="bolt" size={28} />
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--vc-font-display)',
                    fontSize: 26,
                    letterSpacing: -0.6,
                    fontWeight: 500,
                    marginTop: 16,
                    marginBottom: 6,
                  }}
                >
                  You've hit your monthly limit
                </h2>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    lineHeight: 1.55,
                    maxWidth: 360,
                    margin: '0 auto',
                  }}
                >
                  You've used all 10 free generations. Keep going with Pro — or wait 14 days for
                  your quota to reset.
                </div>
              </div>
            </div>
            <div style={{ padding: '10px 28px 20px' }}>
              <VCProgress value={100} tone="red" />
              <div
                style={{
                  fontSize: 11.5,
                  color: 'hsl(var(--vc-muted-fg))',
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                10 / 10 used · resets Nov 1
              </div>
            </div>
            <div
              style={{
                padding: 24,
                borderTop: '1px solid hsl(var(--vc-border))',
                background: 'hsl(var(--vc-muted))',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: 'hsl(var(--vc-muted-fg))',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                Pro · $12 / mo
              </div>
              <div
                style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
              >
                {[
                  '200 HD generations',
                  'Priority queue',
                  'Model selector',
                  'All aspect ratios',
                ].map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 6, fontSize: 12.5 }}>
                    <VCIcon name="check" size={14} color="hsl(var(--vc-primary))" />
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <VCButton variant="ghost" style={{ flex: 1 }}>
                  Maybe later
                </VCButton>
                <VCButton style={{ flex: 2 }}>Upgrade to Pro</VCButton>
              </div>
            </div>
          </VCCard>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── 13 404 ──────────────────────────────────────────────────
function Screen13NotFound() {
  return (
    <VCScreen tint>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          textAlign: 'center',
        }}
      >
        <VCLogo size={22} />
        <div
          style={{
            marginTop: 60,
            fontFamily: 'var(--vc-font-display)',
            fontSize: 160,
            letterSpacing: -6,
            fontWeight: 500,
            lineHeight: 1,
            color: 'hsl(var(--vc-primary))',
          }}
        >
          404
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: 'var(--vc-font-display)',
            fontSize: 36,
            letterSpacing: -1,
            fontWeight: 500,
          }}
        >
          Not in our model.
        </div>
        <div
          style={{
            marginTop: 10,
            color: 'hsl(var(--vc-muted-fg))',
            fontSize: 14,
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          The page you're looking for never generated. Try a prompt instead — our models are much
          better at making things than finding them.
        </div>
        <div style={{ marginTop: 26, display: 'flex', gap: 10 }}>
          <VCButton variant="outline">Back to dashboard</VCButton>
          <VCButton>
            <VCIcon name="sparkle" size={14} />
            &nbsp;Generate something
          </VCButton>
        </div>
        <div style={{ marginTop: 54, display: 'flex', gap: 12 }}>
          {[2, 5, 1, 3].map((s, i) => (
            <div
              key={i}
              style={{
                width: 120,
                height: 120,
                borderRadius: 10,
                overflow: 'hidden',
                opacity: 0.4,
                transform: `rotate(${(i - 1.5) * 4}deg)`,
              }}
            >
              <VCPlaceholder label="" seed={s} />
            </div>
          ))}
        </div>
      </div>
    </VCScreen>
  );
}

Object.assign(window, {
  Screen01Landing,
  Screen02SignUp,
  Screen03Login,
  Screen04EmailVerify,
  Screen05Dashboard,
  Screen06Text2Img,
  Screen07Img2Img,
  Screen08States,
  Screen09Gallery,
  Screen10Detail,
  Screen11Profile,
  Screen12QuotaModal,
  Screen13NotFound,
});
