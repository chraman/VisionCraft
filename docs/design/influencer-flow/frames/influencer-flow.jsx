// Influencer face-consistency flow — VisionCraft
// Five screens covering the new two-step creation flow + reference-image generation:
//   I1 · Library / empty state
//   I2 · Create form (name + source image OR description)
//   I3 · Extracting DNA + generating profile image (multi-stage loading)
//   I4 · Preview profile image — confirm or start over
//   I5 · Generate with influencer (referenceStrength slider, ref image preview)
//   I6 · Consistency proof — 4 gens of same influencer, faces line up
//
// Sidebar / TopBar / VC* primitives come from screens.jsx (window globals).
// Apple photo at assets/red-apple.png is reused as a placeholder face token; in real
// app this would be a generated portrait. NoiseTile from gen-flow.jsx handles the
// noise→image reveal.

// ─── Sidebar variant with Influencers item ──────────────────────────
const InfSidebar = ({ active = 'influencers' }) => {
  const items = [
    { k: 'dashboard', i: 'dashboard', t: 'Dashboard' },
    { k: 'generate', i: 'sparkle', t: 'Generate' },
    { k: 'influencers', i: 'user', t: 'Influencers', badge: 'NEW' },
    { k: 'gallery', i: 'gallery', t: 'Gallery' },
    { k: 'profile', i: 'cog', t: 'Settings' },
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
        {items.map((it) => (
          <div
            key={it.k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              background: active === it.k ? 'hsl(var(--vc-muted))' : 'transparent',
              color: active === it.k ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
              fontWeight: active === it.k ? 500 : 400,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            <VCIcon name={it.i} size={15} />
            <span style={{ flex: 1 }}>{it.t}</span>
            {it.badge && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'hsl(var(--vc-primary))',
                  color: '#fff',
                  letterSpacing: 0.4,
                }}
              >
                {it.badge}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: 'hsl(var(--vc-tint))',
            border: '1px solid hsl(var(--vc-border))',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--vc-fg))' }}>Pro tip</div>
          <div
            style={{
              fontSize: 11,
              color: 'hsl(var(--vc-muted-fg))',
              marginTop: 3,
              lineHeight: 1.45,
            }}
          >
            Influencers keep faces consistent across every gen.
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
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>Alex Kim</div>
            <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))' }}>Pro · 142 left</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

// ─── A tiny chip used to render DNA fields ─────────────────────────
function DnaChip({ k, v, mono }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '8px 11px',
        borderRadius: 8,
        background: 'hsl(var(--vc-tint))',
        border: '1px solid hsl(var(--vc-border))',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: 'hsl(var(--vc-muted-fg))',
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'hsl(var(--vc-fg))',
          fontFamily: mono ? 'ui-monospace' : 'inherit',
          lineHeight: 1.4,
        }}
      >
        {v}
      </div>
    </div>
  );
}

// Synthetic "portrait" — colored gradient with apple as a face stand-in to hint at
// generated character without inventing real people.
function PortraitPlaceholder({ tone = 0, size = 'full' }) {
  const palettes = [
    { bg: 'linear-gradient(135deg, #f9d4c0, #d49b75)', accent: '#7a3a18' },
    { bg: 'linear-gradient(135deg, #c4d8e8, #5d7a9a)', accent: '#1f3a5c' },
    { bg: 'linear-gradient(135deg, #e8d4c4, #a07650)', accent: '#3a1f10' },
    { bg: 'linear-gradient(135deg, #d4d4e8, #6a6a8a)', accent: '#2a2a3a' },
    { bg: 'linear-gradient(135deg, #e0d4f0, #8a6ab8)', accent: '#3a1a5c' },
  ];
  const p = palettes[tone % palettes.length];
  return (
    <div style={{ position: 'absolute', inset: 0, background: p.bg, overflow: 'hidden' }}>
      {/* "head" silhouette */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '24%',
          transform: 'translateX(-50%)',
          width: '46%',
          aspectRatio: '0.78',
          borderRadius: '50% 50% 46% 46% / 56% 56% 44% 44%',
          background: `radial-gradient(ellipse at 38% 32%, rgba(255,235,215,0.95), ${p.accent})`,
        }}
      />
      {/* "shoulders" */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '32%',
          background: `linear-gradient(180deg, transparent, ${p.accent}aa)`,
        }}
      />
      {/* hair shape */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '20%',
          transform: 'translateX(-50%)',
          width: '50%',
          height: '22%',
          borderRadius: '50% 50% 18% 18%',
          background: `${p.accent}cc`,
        }}
      />
      {/* eye dots */}
      <div
        style={{
          position: 'absolute',
          left: '40%',
          top: '40%',
          width: '4%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: '#1a1410',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '56%',
          top: '40%',
          width: '4%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: '#1a1410',
        }}
      />
      {/* lip dash */}
      <div
        style={{
          position: 'absolute',
          left: '46%',
          top: '52%',
          width: '8%',
          height: '1.5%',
          borderRadius: 2,
          background: '#3a1010',
        }}
      />
    </div>
  );
}

// ─── I1 · Influencer library ─────────────────────────────────────────
function InfLibrary() {
  const influencers = [
    {
      id: 1,
      name: 'Maya Chen',
      tone: 0,
      gens: 24,
      created: '2d ago',
      dna: 'warm olive skin, soft heart-shaped face, dark almond eyes',
    },
    {
      id: 2,
      name: 'Theo Park',
      tone: 1,
      gens: 12,
      created: '5d ago',
      dna: 'fair complexion, angular jaw, deep-set hazel eyes, freckled bridge',
    },
    {
      id: 3,
      name: 'Adaeze',
      tone: 2,
      gens: 8,
      created: '1w ago',
      dna: 'rich umber skin, oval face, wide-set dark brown eyes, full lips',
    },
    {
      id: 4,
      name: 'Sasha Volk',
      tone: 3,
      gens: 31,
      created: '2w ago',
      dna: 'porcelain skin, sharp cheekbones, pale grey eyes, thin upper lip',
    },
    {
      id: 5,
      name: 'Iris Holt',
      tone: 4,
      gens: 5,
      created: '3w ago',
      dna: 'sun-tanned skin, square face, green-flecked eyes, dimpled chin',
    },
  ];
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="influencers" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Influencers"
            sub="Reusable characters that stay visually consistent across every generation"
            right={
              <>
                <VCInput
                  placeholder="Search influencers…"
                  icon={<VCIcon name="search" size={15} />}
                  wrapStyle={{ width: 240 }}
                />
                <VCButton size="sm">
                  <VCIcon name="plus" size={13} />
                  &nbsp;New influencer
                </VCButton>
              </>
            }
          />
          <div
            style={{ flex: 1, overflow: 'auto', padding: 32, background: 'hsl(var(--vc-tint))' }}
          >
            {/* What is an influencer? — explainer card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {[
                {
                  i: 'user',
                  t: '1. Define',
                  d: 'Upload a source photo or describe your character. We extract a face anchor from it.',
                },
                {
                  i: 'sparkle',
                  t: '2. Lock',
                  d: 'We generate a canonical profile image. This becomes the permanent identity reference.',
                },
                {
                  i: 'refresh',
                  t: '3. Reuse',
                  d: 'Every gen uses the profile as an img2img reference at strength 0.25 — same face, new scenes.',
                },
              ].map((s) => (
                <VCCard key={s.t} padding={18}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'hsl(var(--vc-soft))',
                      color: 'hsl(var(--vc-primary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <VCIcon name={s.i} size={15} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{s.t}</div>
                  <div
                    style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', lineHeight: 1.5 }}
                  >
                    {s.d}
                  </div>
                </VCCard>
              ))}
            </div>

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: 16,
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
                  Your influencers
                </div>
                <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 3 }}>
                  {influencers.length} characters · 80 generations across all
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: 3,
                  background: 'hsl(var(--vc-card))',
                  border: '1px solid hsl(var(--vc-border))',
                  borderRadius: 8,
                }}
              >
                {['Recent', 'Most used', 'A → Z'].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      padding: '6px 12px',
                      fontSize: 11.5,
                      borderRadius: 6,
                      background: i === 0 ? 'hsl(var(--vc-bg))' : 'transparent',
                      fontWeight: i === 0 ? 500 : 400,
                      color: i === 0 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid: new + saved influencers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {/* New card */}
              <div
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 14,
                  border: '2px dashed hsl(var(--vc-border))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  background: 'hsl(var(--vc-card) / .5)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'hsl(var(--vc-muted))',
                    color: 'hsl(var(--vc-muted-fg))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <VCIcon name="plus" size={20} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>New influencer</div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    textAlign: 'center',
                    maxWidth: 160,
                    lineHeight: 1.4,
                  }}
                >
                  Photo or description
                  <br />
                  ~12s to generate profile
                </div>
              </div>
              {influencers.map((inf) => (
                <div
                  key={inf.id}
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'hsl(var(--vc-card))',
                    border: '1px solid hsl(var(--vc-border))',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '3/4' }}>
                    <PortraitPlaceholder tone={inf.tone} />
                    {/* Identity-locked badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <VCIcon name="shield" size={10} /> LOCKED
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontFamily: 'ui-monospace',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {inf.gens} gens
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: '24px 12px 10px',
                        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.7))',
                      }}
                    >
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{inf.name}</div>
                      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, marginTop: 2 }}>
                        created {inf.created}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                    <VCButton size="sm" style={{ flex: 1 }}>
                      <VCIcon name="sparkle" size={12} />
                      &nbsp;Generate
                    </VCButton>
                    <VCButton size="sm" variant="outline">
                      <VCIcon name="more" size={12} />
                    </VCButton>
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

// ─── I2 · Create influencer — form (Step 1) ─────────────────────────
function InfCreateForm() {
  const [mode, setMode] = React.useState('photo'); // photo | text
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="influencers" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="New influencer"
            sub="Step 1 of 2 · Define the character"
            right={
              <VCButton variant="ghost" size="sm">
                Cancel
              </VCButton>
            }
          />
          <div
            style={{ flex: 1, overflow: 'auto', padding: 40, background: 'hsl(var(--vc-tint))' }}
          >
            {/* Step indicator */}
            <div
              style={{
                maxWidth: 680,
                margin: '0 auto 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {[
                { n: 1, label: 'Define', active: true },
                { n: 2, label: 'Preview & save', active: false },
              ].map((s, i, a) => (
                <React.Fragment key={s.n}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      opacity: s.active ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: s.active ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted))',
                        color: s.active ? 'hsl(var(--vc-bg))' : 'hsl(var(--vc-muted-fg))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {s.n}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                  </div>
                  {i < a.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: 'hsl(var(--vc-border))' }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <VCCard padding={0} style={{ maxWidth: 680, margin: '0 auto' }}>
              <div
                style={{ padding: '24px 28px', borderBottom: '1px solid hsl(var(--vc-border))' }}
              >
                <div
                  style={{
                    fontFamily: 'var(--vc-font-display)',
                    fontSize: 22,
                    letterSpacing: -0.4,
                    fontWeight: 500,
                  }}
                >
                  Tell us about your character
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'hsl(var(--vc-muted-fg))',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  We'll extract a precise face description and generate a canonical profile image
                  you can use as a reference.
                </div>
              </div>
              <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>
                {/* Name */}
                <div>
                  <label
                    style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, display: 'block' }}
                  >
                    Name
                  </label>
                  <VCInput defaultValue="Maya Chen" />
                  <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))', marginTop: 4 }}>
                    Used to derive a deterministic seed — same name → similar starting point.
                  </div>
                </div>
                {/* Source mode toggle */}
                <div>
                  <label
                    style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, display: 'block' }}
                  >
                    Reference
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      padding: 3,
                      background: 'hsl(var(--vc-muted))',
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      { k: 'photo', i: 'image', t: 'Source photo' },
                      { k: 'text', i: 'edit', t: 'Description' },
                    ].map((t) => (
                      <div
                        key={t.k}
                        onClick={() => setMode(t.k)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 7,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: mode === t.k ? 'hsl(var(--vc-bg))' : 'transparent',
                          color: mode === t.k ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                          boxShadow: mode === t.k ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 7,
                        }}
                      >
                        <VCIcon name={t.i} size={13} /> {t.t}
                      </div>
                    ))}
                  </div>
                  {mode === 'photo' ? (
                    <div
                      style={{
                        borderRadius: 12,
                        border: '2px dashed hsl(var(--vc-border))',
                        padding: 28,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        background: 'hsl(var(--vc-tint))',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: 'hsl(var(--vc-muted))',
                          color: 'hsl(var(--vc-muted-fg))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <VCIcon name="upload" size={18} />
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                        Drop a photo or click to upload
                      </div>
                      <div style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))' }}>
                        JPG, PNG · up to 10MB · single subject works best
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <VCButton size="sm" variant="outline">
                          <VCIcon name="upload" size={12} />
                          &nbsp;Choose file
                        </VCButton>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        defaultValue="A 28-year-old woman with warm olive skin, a soft heart-shaped face, and dark almond eyes. Long wavy brown hair parted in the middle. Subtle freckles across the nose. Calm, slightly amused expression."
                        style={{
                          width: '100%',
                          minHeight: 130,
                          padding: 14,
                          borderRadius: 8,
                          border: '1px solid hsl(var(--vc-border))',
                          fontSize: 13.5,
                          lineHeight: 1.55,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box',
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
                        <span>
                          Be specific about face — skin, eyes, lips, distinctive features.
                        </span>
                        <span>284 / 2000</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Description (optional notes) */}
                <div>
                  <label
                    style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, display: 'block' }}
                  >
                    Notes{' '}
                    <span style={{ color: 'hsl(var(--vc-muted-fg))', fontWeight: 400 }}>
                      · optional
                    </span>
                  </label>
                  <VCInput placeholder="e.g. fashion influencer, bohemian style, often in golden-hour outdoor scenes" />
                </div>
                {/* Cost preview */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'hsl(var(--vc-soft))',
                    border: '1px solid hsl(var(--vc-primary) / .25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'hsl(var(--vc-primary))',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VCIcon name="bolt" size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--vc-primary))' }}>
                      Generates in ~12 seconds
                    </div>
                    <div
                      style={{ fontSize: 11.5, color: 'hsl(var(--vc-primary) / .8)', marginTop: 2 }}
                    >
                      Costs 1 credit · 142 left this month · cancel free if you don't save
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '18px 28px',
                  borderTop: '1px solid hsl(var(--vc-border))',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'hsl(var(--vc-card))',
                }}
              >
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <VCIcon name="info" size={12} /> Profile image is portrait (9:16) at 1024×1820
                </div>
                <VCButton>
                  <VCIcon name="sparkle" size={13} />
                  &nbsp;Generate profile image
                </VCButton>
              </div>
            </VCCard>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── I3 · Generating profile (multi-stage loading) ──────────────────
function InfGeneratingProfile() {
  // 4 stages: extracting → seeded → diffusing → ready
  const [stage, setStage] = React.useState(2); // 0..3
  const stages = [
    {
      k: 'extracting',
      label: 'Extracting character DNA',
      sub: 'Gemini reads your reference & writes the face anchor',
      icon: 'search',
      pct: 0.18,
    },
    {
      k: 'seeding',
      label: 'Seeding identity',
      sub: 'Hashing name "Maya Chen" → seed 0xc4f81e2a',
      icon: 'shield',
      pct: 0.32,
    },
    {
      k: 'diffusing',
      label: 'Generating profile image',
      sub: 'SDXL · 9:16 portrait · step 18/40',
      icon: 'sparkle',
      pct: 0.62,
    },
    {
      k: 'ready',
      label: 'Profile image ready',
      sub: '12.4s · review and confirm to save the influencer',
      icon: 'check',
      pct: 1.0,
    },
  ];
  const cur = stages[stage];
  const isReady = stage === 3;
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="influencers" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="New influencer"
            sub="Step 1 of 2 · Generating profile image"
            right={
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  padding: 3,
                  background: 'hsl(var(--vc-muted))',
                  borderRadius: 8,
                }}
              >
                {stages.map((s, i) => (
                  <button
                    key={s.k}
                    onClick={() => setStage(i)}
                    style={{
                      padding: '6px 10px',
                      fontSize: 11,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: stage === i ? 'hsl(var(--vc-bg))' : 'transparent',
                      color: stage === i ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                    }}
                  >
                    {i + 1}. {s.k}
                  </button>
                ))}
              </div>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              overflow: 'hidden',
            }}
          >
            {/* Stage canvas */}
            <div
              style={{
                padding: 40,
                background: 'hsl(var(--vc-tint))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 'min(420px, 100%)',
                  aspectRatio: '9/16',
                  position: 'relative',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 30px 80px -20px rgba(40,30,80,.25)',
                  background: 'hsl(var(--vc-fg))',
                }}
              >
                {stage < 2 ? (
                  // Pre-diffusion: just noise + DNA scanning
                  <>
                    <NoiseTile progress={0.05} seed={2} />
                    {/* scan grid overlay during DNA extraction */}
                    {stage === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage:
                            'linear-gradient(0deg, transparent 49%, rgba(255,255,255,.18) 50%, transparent 51%), linear-gradient(90deg, transparent 49%, rgba(255,255,255,.18) 50%, transparent 51%)',
                          backgroundSize: '40px 40px',
                          animation: 'inf-scan 3s linear infinite',
                        }}
                      />
                    )}
                    <style>{`@keyframes inf-scan { 0%{background-position:0 0,0 0} 100%{background-position:40px 40px,40px 40px} }`}</style>
                  </>
                ) : (
                  <NoiseTile progress={cur.pct} seed={2} />
                )}
                {/* Status chip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,.65)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: isReady ? 'hsl(142 70% 60%)' : 'hsl(var(--vc-primary))',
                      animation: isReady ? 'none' : 'inf-pulse 1.4s infinite',
                    }}
                  />
                  {cur.label}
                </div>
                {/* Progress bar */}
                {!isReady && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 16,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(0,0,0,.62)',
                      backdropFilter: 'blur(14px)',
                      color: '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10.5,
                        fontFamily: 'ui-monospace',
                        opacity: 0.8,
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        {Math.round(cur.pct * 100)}% · {cur.k.toUpperCase()}
                      </span>
                      <span>~{Math.max(0, Math.ceil((1 - cur.pct) * 12))}s left</span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,.22)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${cur.pct * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #fff, hsl(var(--vc-primary)))',
                        }}
                      />
                    </div>
                  </div>
                )}
                <style>{`@keyframes inf-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
              </div>
            </div>
            {/* Right: stage timeline + DNA reveal */}
            <div
              style={{
                borderLeft: '1px solid hsl(var(--vc-border))',
                padding: 24,
                background: 'hsl(var(--vc-card))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                overflow: 'auto',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 4,
                  }}
                >
                  Pipeline
                </div>
                <div
                  style={{
                    fontFamily: 'var(--vc-font-display)',
                    fontSize: 20,
                    letterSpacing: -0.4,
                    fontWeight: 500,
                  }}
                >
                  {cur.label}
                </div>
                <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 3 }}>
                  {cur.sub}
                </div>
              </div>
              {/* Timeline */}
              <div>
                {stages.map((s, i, arr) => {
                  const done = i < stage;
                  const active = i === stage;
                  return (
                    <div
                      key={s.k}
                      style={{ display: 'flex', gap: 12, opacity: i > stage ? 0.4 : 1 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          width: 18,
                          paddingTop: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            background: done
                              ? 'hsl(142 70% 45%)'
                              : active
                                ? 'hsl(var(--vc-primary))'
                                : 'hsl(var(--vc-bg))',
                            border: `2px solid ${done ? 'hsl(142 70% 45%)' : active ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-border))'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {done && <VCIcon name="check" size={8} color="#fff" />}
                          {active && !isReady && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                background: '#fff',
                                animation: 'inf-pulse 1s infinite',
                              }}
                            />
                          )}
                        </div>
                        {i < arr.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              width: 2,
                              background: done ? 'hsl(142 70% 45%)' : 'hsl(var(--vc-border))',
                              minHeight: 30,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 18 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                        <div
                          style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}
                        >
                          {s.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* DNA reveal — appears once seeding is done */}
              {stage >= 1 && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: 'hsl(var(--vc-tint))',
                    border: '1px solid hsl(var(--vc-border))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: 'hsl(var(--vc-muted-fg))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <VCIcon name="shield" size={11} /> Character DNA
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: 'hsl(var(--vc-fg))' }}>
                    <strong style={{ fontWeight: 600, color: 'hsl(var(--vc-primary))' }}>
                      face_anchor:
                    </strong>{' '}
                    "warm olive skin, soft heart-shaped face, dark almond eyes, subtle freckles
                    across nose bridge, full upper lip"
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>seed</span>{' '}
                      <span style={{ fontFamily: 'ui-monospace', fontWeight: 500 }}>
                        0xc4f81e2a
                      </span>
                    </div>
                    <div style={{ fontSize: 11 }}>
                      <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>age</span>{' '}
                      <span style={{ fontWeight: 500 }}>28</span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                <VCButton variant="ghost" size="sm" style={{ flex: 1 }}>
                  <VCIcon name="x" size={12} />
                  &nbsp;Cancel
                </VCButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── I4 · Preview profile (Step 2) ──────────────────────────────────
function InfPreviewProfile() {
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="influencers" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="New influencer"
            sub="Step 2 of 2 · Confirm the profile image"
            right={
              <VCButton variant="ghost" size="sm">
                Cancel
              </VCButton>
            }
          />
          <div
            style={{ flex: 1, overflow: 'auto', padding: 40, background: 'hsl(var(--vc-tint))' }}
          >
            {/* Step indicator */}
            <div
              style={{
                maxWidth: 880,
                margin: '0 auto 28px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {[
                { n: 1, label: 'Define', done: true },
                { n: 2, label: 'Preview & save', done: false, active: true },
              ].map((s, i, a) => (
                <React.Fragment key={s.n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: s.done
                          ? 'hsl(142 70% 45%)'
                          : s.active
                            ? 'hsl(var(--vc-fg))'
                            : 'hsl(var(--vc-muted))',
                        color: s.done || s.active ? '#fff' : 'hsl(var(--vc-muted-fg))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {s.done ? <VCIcon name="check" size={12} /> : s.n}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: s.done ? 'hsl(var(--vc-muted-fg))' : 'hsl(var(--vc-fg))',
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                  {i < a.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: s.done ? 'hsl(142 70% 45%)' : 'hsl(var(--vc-border))',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            <VCCard padding={0} style={{ maxWidth: 880, margin: '0 auto', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr' }}>
                {/* Profile image */}
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '9/16',
                    background: 'hsl(var(--vc-fg))',
                  }}
                >
                  <PortraitPlaceholder tone={0} />
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,.62)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <VCIcon name="shield" size={11} /> PROFILE IMAGE
                  </div>
                  <div
                    style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 6 }}
                  >
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontFamily: 'ui-monospace',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      9:16
                    </div>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontFamily: 'ui-monospace',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      1024×1820
                    </div>
                    <div
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        background: 'rgba(0,0,0,.62)',
                        color: '#fff',
                        fontSize: 10,
                        fontFamily: 'ui-monospace',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      SDXL
                    </div>
                  </div>
                </div>
                {/* Right: details */}
                <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <VCBadge variant="soft">
                        <VCIcon name="check" size={10} /> Generated in 12.4s
                      </VCBadge>
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--vc-font-display)',
                        fontSize: 26,
                        letterSpacing: -0.5,
                        fontWeight: 500,
                      }}
                    >
                      Meet Maya Chen
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'hsl(var(--vc-muted-fg))',
                        marginTop: 4,
                        lineHeight: 1.55,
                      }}
                    >
                      This is the canonical profile. Every future generation with Maya will use this
                      as an img2img reference, locking her face to what you see here.
                    </div>
                  </div>

                  {/* DNA breakdown */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'hsl(var(--vc-muted-fg))',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <VCIcon name="shield" size={11} /> Character DNA
                    </div>
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: 'hsl(var(--vc-soft))',
                        border: '1px solid hsl(var(--vc-primary) / .25)',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        color: 'hsl(var(--vc-fg))',
                      }}
                    >
                      <strong style={{ color: 'hsl(var(--vc-primary))', fontWeight: 600 }}>
                        face_anchor
                      </strong>{' '}
                      · warm olive skin, soft heart-shaped face, dark almond eyes, subtle freckles
                      across nose bridge, full upper lip
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 8,
                      }}
                    >
                      <DnaChip k="seed" v="0xc4f81e2a" mono />
                      <DnaChip k="age" v="28" />
                      <DnaChip k="build" v="slim" />
                      <DnaChip k="hair" v="long, wavy, dark brown, parted middle" />
                      <DnaChip k="brows" v="natural arch, medium thickness" />
                      <DnaChip k="distinctive" v="freckles · dimpled chin" />
                    </div>
                  </div>

                  {/* What happens next */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: 'hsl(var(--vc-tint))',
                      border: '1px solid hsl(var(--vc-border))',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                      What happens when you save
                    </div>
                    <div
                      style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))', lineHeight: 1.55 }}
                    >
                      Profile image stored in your gallery · DNA + seed locked to "Maya Chen" · all
                      future gens use this image as a reference at strength 0.25 (tunable per
                      generation)
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                    <VCButton variant="outline" style={{ flex: 1 }}>
                      <VCIcon name="refresh" size={13} />
                      &nbsp;Regenerate
                    </VCButton>
                    <VCButton variant="ghost">
                      <VCIcon name="arrowLeft" size={13} />
                      &nbsp;Start over
                    </VCButton>
                    <VCButton style={{ flex: 1.5 }}>
                      <VCIcon name="check" size={13} />
                      &nbsp;Save influencer
                    </VCButton>
                  </div>
                </div>
              </div>
            </VCCard>

            {/* Tip below the card */}
            <div
              style={{
                maxWidth: 880,
                margin: '14px auto 0',
                padding: 12,
                borderRadius: 10,
                background: 'hsl(38 92% 96%)',
                border: '1px solid hsl(38 92% 70%)',
                fontSize: 12,
                color: 'hsl(38 60% 30%)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <VCIcon name="info" size={13} />
              <span>
                <strong>Heads up</strong> — if you don't save, this profile image is discarded after
                24h. Regenerating costs another credit.
              </span>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ─── I5 · Generate with influencer (referenceStrength slider) ──────
function InfGenerateWith() {
  const [strength, setStrength] = React.useState(0.25);
  const influencers = [
    { id: 1, name: 'Maya Chen', tone: 0, gens: 24, active: true },
    { id: 2, name: 'Theo Park', tone: 1, gens: 12, active: false },
    { id: 3, name: 'Adaeze', tone: 2, gens: 8, active: false },
    { id: 4, name: 'Sasha V.', tone: 3, gens: 31, active: false },
  ];
  // strength interpretation
  const strengthLabel =
    strength < 0.18
      ? 'Strong lock'
      : strength < 0.32
        ? 'Recommended'
        : strength < 0.42
          ? 'Looser'
          : 'Creative drift';
  const strengthSub =
    strength < 0.18
      ? 'Faithful to the profile · less prompt influence'
      : strength < 0.32
        ? 'Balanced face fidelity & prompt adherence'
        : strength < 0.42
          ? 'Prompt has more pull · face may drift slightly'
          : 'Prompt-led · use only for stylized scenes';
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="Influencer locked · Maya Chen"
            right={
              <VCBadge variant="muted">
                <VCIcon name="bolt" size={12} /> 142 left
              </VCBadge>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '420px 1fr',
              overflow: 'hidden',
            }}
          >
            {/* Left: composer */}
            <div
              style={{
                padding: 24,
                borderRight: '1px solid hsl(var(--vc-border))',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
                background: 'hsl(var(--vc-card))',
              }}
            >
              {/* Influencer pill picker */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    Influencer
                  </label>
                  <a style={{ fontSize: 11.5, color: 'hsl(var(--vc-primary))', cursor: 'pointer' }}>
                    View all →
                  </a>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {influencers.map((inf) => (
                    <div
                      key={inf.id}
                      style={{
                        flex: '0 0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px 6px 6px',
                        borderRadius: 999,
                        border: `2px solid ${inf.active ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-border))'}`,
                        background: inf.active ? 'hsl(var(--vc-soft))' : 'hsl(var(--vc-bg))',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          position: 'relative',
                          flexShrink: 0,
                        }}
                      >
                        <PortraitPlaceholder tone={inf.tone} />
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: inf.active ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-fg))',
                        }}
                      >
                        {inf.name}
                      </div>
                      {inf.active && (
                        <VCIcon name="check" size={11} color="hsl(var(--vc-primary))" />
                      )}
                    </div>
                  ))}
                  <div
                    style={{
                      flex: '0 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: '2px dashed hsl(var(--vc-border))',
                      color: 'hsl(var(--vc-muted-fg))',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <VCIcon name="plus" size={11} /> New
                  </div>
                </div>
              </div>

              {/* Locked profile preview */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-tint))',
                  border: '1px solid hsl(var(--vc-border))',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 72,
                    borderRadius: 8,
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <PortraitPlaceholder tone={0} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <VCIcon name="shield" size={11} color="hsl(142 70% 38%)" />
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(142 70% 32%)' }}>
                      FACE LOCKED
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                    Maya Chen · profile_c4f81e2a.png
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--vc-muted-fg))',
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    face_anchor + img2img reference at strength {strength.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Prompt
                </label>
                <textarea
                  defaultValue="Walking through a misty forest at golden hour, soft rim light through the trees, wearing a cream linen jacket, cinematic 35mm photography"
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--vc-border))',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    fontFamily: 'inherit',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: 'hsl(var(--vc-muted-fg))',
                    lineHeight: 1.4,
                  }}
                >
                  Final prompt (auto):{' '}
                  <span style={{ fontFamily: 'ui-monospace', color: 'hsl(var(--vc-fg))' }}>
                    "{`{face_anchor}`} {`{anchoring_prefix}`} walking through misty…"
                  </span>
                </div>
              </div>

              {/* Reference strength slider */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-tint))',
                  border: '1px solid hsl(var(--vc-border))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 10,
                  }}
                >
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <VCIcon name="shield" size={12} /> Reference strength
                  </label>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'ui-monospace',
                      color: 'hsl(var(--vc-primary))',
                    }}
                  >
                    {strength.toFixed(2)}
                  </div>
                </div>
                {/* Slider */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={strength * 100}
                    onChange={(e) => setStrength(e.target.value / 100)}
                    style={{ width: '100%' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: 'hsl(var(--vc-muted-fg))',
                      fontFamily: 'ui-monospace',
                      marginTop: 2,
                    }}
                  >
                    <span>0.10</span>
                    <span>0.25</span>
                    <span>0.50</span>
                  </div>
                </div>
                {/* Visual scale */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  {[0.12, 0.2, 0.25, 0.32, 0.4].map((s, i) => {
                    const active = Math.abs(strength - s) < 0.04;
                    return (
                      <div key={i} style={{ flex: 1, position: 'relative' }}>
                        <div
                          style={{
                            aspectRatio: '3/4',
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: `2px solid ${active ? 'hsl(var(--vc-primary))' : 'transparent'}`,
                            opacity: active ? 1 : 0.55,
                            position: 'relative',
                          }}
                        >
                          <PortraitPlaceholder tone={0} />
                          {/* visualize drift with overlay */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: `radial-gradient(circle at ${50 + (s - 0.25) * 100}% 50%, transparent ${(1 - s) * 60}%, rgba(120,80,160,${s * 0.8}))`,
                              mixBlendMode: 'overlay',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: 'hsl(var(--vc-muted-fg))',
                            textAlign: 'center',
                            marginTop: 3,
                            fontFamily: 'ui-monospace',
                          }}
                        >
                          {s.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--vc-primary))' }}>
                  {strengthLabel}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {strengthSub}
                </div>
              </div>

              {/* Other params */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Aspect
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[
                    { k: '1:1', sel: false },
                    { k: '4:5', sel: false },
                    { k: '9:16', sel: true },
                    { k: '16:9', sel: false },
                  ].map((a) => (
                    <div
                      key={a.k}
                      style={{
                        padding: '10px 0',
                        borderRadius: 8,
                        border: `1px solid ${a.sel ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-border))'}`,
                        fontSize: 11.5,
                        fontWeight: 500,
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: a.sel ? 'hsl(var(--vc-fg))' : 'transparent',
                        color: a.sel ? 'hsl(var(--vc-bg))' : 'hsl(var(--vc-fg))',
                      }}
                    >
                      {a.k}
                    </div>
                  ))}
                </div>
              </div>

              <VCButton style={{ marginTop: 'auto' }}>
                <VCIcon name="sparkle" size={14} />
                &nbsp;Generate · 1 credit
              </VCButton>
            </div>

            {/* Right: result */}
            <div
              style={{
                background: 'hsl(var(--vc-tint))',
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 'min(520px, 100%)',
                  aspectRatio: '9/16',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 30px 80px -20px rgba(40,30,80,.25)',
                  background: 'hsl(var(--vc-fg))',
                }}
              >
                <PortraitPlaceholder tone={0} />
                {/* forest atmosphere overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(180,140,80,.25), rgba(40,60,30,.35))',
                    mixBlendMode: 'multiply',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 11px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,.6)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  <VCIcon name="shield" size={11} color="hsl(142 70% 60%)" /> Face matched · 94%
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    right: 16,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,.6)',
                    backdropFilter: 'blur(12px)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11,
                  }}
                >
                  <div style={{ fontFamily: 'ui-monospace' }}>
                    9:16 · SDXL · str {strength.toFixed(2)} · 13.8s
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <VCIcon name="heart" size={14} />
                    <VCIcon name="download" size={14} />
                    <VCIcon name="more" size={14} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <VCButton variant="outline" size="sm">
                  <VCIcon name="refresh" size={13} />
                  &nbsp;Vary
                </VCButton>
                <VCButton variant="outline" size="sm">
                  <VCIcon name="layers" size={13} />
                  &nbsp;4 more
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

// ─── I6 · Consistency proof — 4 gens, same face ─────────────────────
function InfConsistencyProof() {
  const gens = [
    { id: 1, scene: 'Misty forest, golden hour', tone: 0, score: 0.94 },
    { id: 2, scene: 'Cafe interior, window light', tone: 0, score: 0.91 },
    { id: 3, scene: 'Tokyo street, neon night', tone: 0, score: 0.88 },
    { id: 4, scene: 'Studio portrait, soft key', tone: 0, score: 0.96 },
  ];
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <InfSidebar active="influencers" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Maya Chen"
            sub="24 generations · face consistency 92% avg"
            right={
              <>
                <VCButton variant="outline" size="sm">
                  <VCIcon name="cog" size={13} />
                  &nbsp;Edit DNA
                </VCButton>
                <VCButton size="sm">
                  <VCIcon name="sparkle" size={13} />
                  &nbsp;Generate new
                </VCButton>
              </>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              overflow: 'hidden',
            }}
          >
            {/* Left rail: profile + DNA + stats */}
            <div
              style={{
                borderRight: '1px solid hsl(var(--vc-border))',
                padding: 24,
                background: 'hsl(var(--vc-card))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '9/16',
                }}
              >
                <PortraitPlaceholder tone={0} />
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 9px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,.65)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <VCIcon name="shield" size={10} /> PROFILE
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 8,
                  }}
                >
                  Character DNA
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: 'hsl(var(--vc-soft))',
                    border: '1px solid hsl(var(--vc-primary) / .2)',
                    fontSize: 11.5,
                    lineHeight: 1.5,
                  }}
                >
                  warm olive skin · soft heart-shaped face · dark almond eyes · subtle freckles ·
                  full upper lip
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    fontSize: 11,
                  }}
                >
                  <div>
                    <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>seed</span>{' '}
                    <span style={{ fontFamily: 'ui-monospace' }}>0xc4f81e2a</span>
                  </div>
                  <div>
                    <span style={{ color: 'hsl(var(--vc-muted-fg))' }}>strength</span>{' '}
                    <span style={{ fontFamily: 'ui-monospace' }}>0.25</span>
                  </div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 8,
                  }}
                >
                  Stats
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: 'hsl(var(--vc-tint))',
                      border: '1px solid hsl(var(--vc-border))',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: 'hsl(var(--vc-muted-fg))',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Generations
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        fontFamily: 'var(--vc-font-display)',
                        letterSpacing: -0.4,
                        marginTop: 2,
                      }}
                    >
                      24
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      background: 'hsl(var(--vc-tint))',
                      border: '1px solid hsl(var(--vc-border))',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: 'hsl(var(--vc-muted-fg))',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Avg match
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        fontFamily: 'var(--vc-font-display)',
                        letterSpacing: -0.4,
                        marginTop: 2,
                        color: 'hsl(142 70% 38%)',
                      }}
                    >
                      92%
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  padding: 12,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-tint))',
                  border: '1px dashed hsl(var(--vc-border))',
                  fontSize: 11.5,
                  color: 'hsl(var(--vc-muted-fg))',
                  lineHeight: 1.5,
                }}
              >
                <strong
                  style={{
                    color: 'hsl(var(--vc-fg))',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 3,
                  }}
                >
                  How matching works
                </strong>
                Face match score compares the generated image against the profile via embeddings.
                Below 80% suggests the prompt is overpowering the reference — try lowering reference
                strength.
              </div>
            </div>

            {/* Right: gallery of consistent gens */}
            <div style={{ padding: 32, background: 'hsl(var(--vc-tint))', overflow: 'auto' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
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
                    Recent generations
                  </div>
                  <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 3 }}>
                    Same face, four different scenes — the profile image keeps Maya consistent.
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: 3,
                    background: 'hsl(var(--vc-card))',
                    border: '1px solid hsl(var(--vc-border))',
                    borderRadius: 8,
                  }}
                >
                  {['Grid', 'Compare'].map((t, i) => (
                    <div
                      key={t}
                      style={{
                        padding: '6px 12px',
                        fontSize: 11.5,
                        borderRadius: 6,
                        background: i === 0 ? 'hsl(var(--vc-bg))' : 'transparent',
                        fontWeight: i === 0 ? 500 : 400,
                        color: i === 0 ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {gens.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: 'hsl(var(--vc-card))',
                      border: '1px solid hsl(var(--vc-border))',
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '4/5' }}>
                      <PortraitPlaceholder tone={g.tone} />
                      {/* scene overlay tint to differentiate */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            g.id === 1
                              ? 'linear-gradient(180deg, rgba(180,140,80,.25), rgba(40,60,30,.4))'
                              : g.id === 2
                                ? 'linear-gradient(180deg, rgba(255,220,180,.2), rgba(80,50,30,.25))'
                                : g.id === 3
                                  ? 'linear-gradient(180deg, rgba(255,80,180,.18), rgba(30,30,60,.45))'
                                  : 'linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.15))',
                          mixBlendMode: 'multiply',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 9px',
                          borderRadius: 999,
                          background: 'rgba(0,0,0,.65)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 600,
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            background: g.score > 0.9 ? 'hsl(142 70% 60%)' : 'hsl(38 92% 60%)',
                          }}
                        />
                        {Math.round(g.score * 100)}% match
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {g.scene}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: 'hsl(var(--vc-muted-fg))',
                            marginTop: 2,
                            fontFamily: 'ui-monospace',
                          }}
                        >
                          str 0.25 · {g.id * 4}m ago
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: 'hsl(var(--vc-muted))',
                            color: 'hsl(var(--vc-muted-fg))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <VCIcon name="heart" size={12} />
                        </div>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: 'hsl(var(--vc-muted))',
                            color: 'hsl(var(--vc-muted-fg))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <VCIcon name="download" size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

Object.assign(window, {
  InfLibrary,
  InfCreateForm,
  InfGeneratingProfile,
  InfPreviewProfile,
  InfGenerateWith,
  InfConsistencyProof,
});
