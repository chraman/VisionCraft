// Generation-flow UX explorations — industry-standard patterns
// inspired by what Midjourney, DALL·E (ChatGPT), Krea, and Leonardo actually ship.
//
// Patterns covered:
//   A · DALL·E-style top-down scan reveal (skeleton + sweeping line)
//   B · Midjourney-style 2×2 racing tiles with live noise denoise
//   C · Diffusion step viewer (noise→image preview, step counter, ETA, queue)
//   D · History rail + ambient docked job (Leonardo/Krea hybrid)
//   E · Phase strip — direction C across all 5 phases on one frame
//
// Sidebar / TopBar / VC* primitives come from screens.jsx (window globals).

// ──────────────────────────────────────────────────────────────
// Reusable: noise canvas — animated grain that resolves into image
// ──────────────────────────────────────────────────────────────
function NoiseTile({ progress = 0, seed = 1, label = '' }) {
  // progress 0..1 — how far through the diffusion the tile is.
  // We layer: animated noise (fades out), blurred placeholder (sharpens), final image (fades in).
  const noiseOpacity = Math.max(0, 1 - progress * 1.4);
  const blurAmount = Math.max(0, 24 - progress * 28);
  const imageOpacity = Math.min(1, Math.max(0, progress * 1.2 - 0.1));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Underlying image (sharpens & fades in) — real apple photo so the reveal is recognizable */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: imageOpacity,
          filter: `blur(${blurAmount}px) saturate(${0.4 + progress * 0.6})`,
          transform: `scale(${1 + (1 - progress) * 0.06})`,
          transition: 'opacity .5s, filter .5s, transform .5s',
          backgroundImage: 'url("assets/red-apple.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Noise overlay (fades out) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: noiseOpacity,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${0.7 + seed * 0.05}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.${20 + seed} 0 0 0 0 0.${15 + seed} 0 0 0 0 0.${30 + seed} 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
          backgroundSize: '160px 160px',
          mixBlendMode: 'normal',
          animation: 'vc-noise-shift 0.6s steps(4) infinite',
        }}
      />
      {/* Color wash that hints at final palette — apple red on warm backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: noiseOpacity * 0.55,
          background: `radial-gradient(circle at 42% 48%, hsl(6 78% 52% / .92), hsl(20 30% 35% / .55) 55%, hsl(38 25% 80% / .35))`,
        }}
      />
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,.6)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: 10,
            fontFamily: 'ui-monospace',
            letterSpacing: 0.3,
          }}
        >
          {label}
        </div>
      )}
      <style>{`@keyframes vc-noise-shift { 0%{background-position:0 0} 100%{background-position:160px 160px} }`}</style>
    </div>
  );
}

// Animated dots
function GenDots({ color = 'currentColor' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            background: color,
            animation: `vc-bounce 1.2s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`@keyframes vc-bounce { 0%,80%,100% { opacity: .25 } 40% { opacity: 1 } }`}</style>
    </span>
  );
}

// Sparkline-ish step ticker (visual only)
function StepTicker({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const h = 5 + ((i * 7) % 12) + (done ? 2 : 0);
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 1,
              background: done ? 'hsl(var(--vc-primary))' : 'hsl(var(--vc-border))',
              transition: 'background .3s',
            }}
          />
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// A · DALL·E-style scan reveal
// Single big canvas. A horizontal scan line sweeps top→bottom; everything
// above the line is the resolved image, below is shimmering skeleton.
// ──────────────────────────────────────────────────────────────
function GenScanReveal() {
  const [progress, setProgress] = React.useState(0.55); // 0..1
  const phases = [
    { p: 0, k: 'Submitted', sub: 'Sending prompt to Kaggle worker' },
    { p: 0.18, k: 'GPU warming', sub: 'Cold-start · this can take ~25s' },
    { p: 0.55, k: 'Rendering', sub: 'Step 22 / 40' },
    { p: 0.92, k: 'Uploading', sub: 'Saving to gallery' },
    { p: 1, k: 'Ready', sub: '14.2s · SDXL · seed 438190' },
  ];
  const current =
    phases
      .slice()
      .reverse()
      .find((x) => progress >= x.p) || phases[0];
  const isReady = progress >= 1;
  const linePct = Math.max(0, Math.min(100, progress * 100));
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="A · Scan-reveal — DALL·E pattern"
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
                {phases.map((x, i) => (
                  <button
                    key={i}
                    onClick={() => setProgress(x.p)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      fontWeight: 500,
                      background: progress === x.p ? 'hsl(var(--vc-bg))' : 'transparent',
                      color: progress === x.p ? 'hsl(var(--vc-fg))' : 'hsl(var(--vc-muted-fg))',
                    }}
                  >
                    {i + 1}. {x.k}
                  </button>
                ))}
              </div>
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
            {/* Left: prompt panel (greyed during gen) */}
            <div
              style={{
                padding: 24,
                borderRight: '1px solid hsl(var(--vc-border))',
                background: 'hsl(var(--vc-card))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                opacity: isReady ? 1 : 0.55,
                pointerEvents: isReady ? 'auto' : 'none',
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
                    marginBottom: 8,
                  }}
                >
                  Prompt
                </div>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'hsl(var(--vc-tint))',
                    border: '1px solid hsl(var(--vc-border))',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'hsl(var(--vc-fg))',
                  }}
                >
                  A ceramic teapot on a marble shelf, early morning light streaming through a
                  window, 35mm film grain, soft shadows
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Model
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>SDXL Turbo</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Steps
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>40</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Size
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>1024 × 1024</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Seed
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'ui-monospace' }}>
                    438190
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <VCButton disabled={!isReady}>{isReady ? 'Generate again' : 'Generating…'}</VCButton>
            </div>
            {/* Right: stage */}
            <div
              style={{
                padding: 40,
                background: 'hsl(var(--vc-tint))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 22,
              }}
            >
              <div
                style={{
                  width: 520,
                  aspectRatio: '1/1',
                  borderRadius: 16,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 30px 80px -20px rgba(40,30,80,.25)',
                  background: 'hsl(var(--vc-muted))',
                }}
              >
                {/* Below line: skeleton shimmer */}
                {!isReady && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(110deg, hsl(var(--vc-muted)) 30%, hsl(var(--vc-border)) 50%, hsl(var(--vc-muted)) 70%)',
                      backgroundSize: '200% 100%',
                      animation: 'vc-shimmer 1.6s linear infinite',
                    }}
                  />
                )}
                {/* Above line: revealed image (clipped to top portion) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: `inset(0 0 ${100 - linePct}% 0)`,
                    transition: 'clip-path .8s cubic-bezier(.4,.0,.2,1)',
                  }}
                >
                  <VCPlaceholder label="" seed={2} />
                </div>
                {/* The scan line itself */}
                {!isReady && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${linePct}%`,
                        height: 2,
                        background:
                          'linear-gradient(90deg, transparent, hsl(var(--vc-primary)), transparent)',
                        boxShadow: '0 0 24px hsl(var(--vc-primary))',
                        transition: 'top .8s cubic-bezier(.4,.0,.2,1)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `calc(${linePct}% - 60px)`,
                        height: 60,
                        background:
                          'linear-gradient(180deg, transparent, rgba(255,255,255,.0) 60%, rgba(255,255,255,.35))',
                        transition: 'top .8s cubic-bezier(.4,.0,.2,1)',
                      }}
                    />
                  </>
                )}
                {/* Top-left status chip */}
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
                    background: 'rgba(0,0,0,.6)',
                    backdropFilter: 'blur(10px)',
                    color: '#fff',
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {isReady ? (
                    <VCIcon name="check" size={13} color="hsl(142 70% 65%)" />
                  ) : (
                    <GenDots color="#fff" />
                  )}
                  {current.k}
                </div>
                {/* Ready overlay actions */}
                {isReady && (
                  <div
                    style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 6 }}
                  >
                    {['heart', 'download', 'more'].map((n) => (
                      <div
                        key={n}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'rgba(0,0,0,.55)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <VCIcon name={n} size={16} />
                      </div>
                    ))}
                  </div>
                )}
                <style>{`@keyframes vc-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
              </div>
              <div
                style={{
                  width: 520,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--vc-font-display)',
                      fontSize: 18,
                      letterSpacing: -0.3,
                      fontWeight: 500,
                    }}
                  >
                    {current.k}
                    {!isReady && '…'}
                  </div>
                  <div style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))', marginTop: 3 }}>
                    {current.sub}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'hsl(var(--vc-muted-fg))',
                    fontFamily: 'ui-monospace',
                  }}
                >
                  {Math.round(progress * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ──────────────────────────────────────────────────────────────
// B · Midjourney-style 2×2 racing tiles
// 4 seeds in parallel, each tile shows live noise→image denoising at its
// own pace. Click any to jumbo it.
// ──────────────────────────────────────────────────────────────
function GenTilesRacing() {
  // each tile has its own progress; staggered to feel alive
  const [t, setT] = React.useState(0.5); // master scrubber 0..1
  const tileProgress = [
    Math.min(1, t * 1.2),
    Math.min(1, t * 1.05),
    Math.min(1, t * 0.92),
    Math.min(1, t * 0.78),
  ];
  const seeds = [2, 5, 1, 3];
  const allDone = tileProgress.every((p) => p >= 1);
  const eta = Math.max(0, Math.ceil((1 - t) * 22));
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="B · Racing tiles — Midjourney pattern"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'hsl(var(--vc-muted-fg))',
                    fontFamily: 'ui-monospace',
                  }}
                >
                  scrub
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={t * 100}
                  onChange={(e) => setT(e.target.value / 100)}
                  style={{ width: 140 }}
                />
              </div>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 320px',
              overflow: 'hidden',
            }}
          >
            {/* Stage */}
            <div
              style={{
                padding: 32,
                background: 'hsl(var(--vc-tint))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
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
                    {allDone ? 'Pick a favourite' : 'Drafting 4 variants'}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 4 }}>
                    {allDone
                      ? 'All 4 ready · 16.4s total'
                      : `${tileProgress.filter((p) => p >= 1).length} of 4 ready · ~${eta}s left`}
                  </div>
                </div>
                {!allDone && (
                  <VCBadge variant="soft">
                    <GenDots /> SDXL · 4 seeds
                  </VCBadge>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: 14,
                  minHeight: 0,
                }}
              >
                {tileProgress.map((p, i) => {
                  const done = p >= 1;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        borderRadius: 14,
                        overflow: 'hidden',
                        border: '1px solid hsl(var(--vc-border))',
                        background: 'hsl(var(--vc-fg))',
                        cursor: done ? 'pointer' : 'default',
                      }}
                    >
                      <NoiseTile
                        progress={p}
                        seed={seeds[i]}
                        label={`seed ${438190 + i}  ·  ${Math.round(p * 40)}/40`}
                      />
                      {!done && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 9px',
                            borderRadius: 999,
                            background: 'rgba(0,0,0,.65)',
                            color: '#fff',
                            fontSize: 10.5,
                            fontWeight: 500,
                            fontFamily: 'ui-monospace',
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              background: 'hsl(142 70% 60%)',
                              animation: 'vc-pulse 1s infinite',
                            }}
                          />
                          {Math.round(p * 100)}%
                        </div>
                      )}
                      {done && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            display: 'flex',
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: 'rgba(0,0,0,.55)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            <VCIcon name="heart" size={13} />
                          </div>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: 'rgba(0,0,0,.55)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            <VCIcon name="maximize" size={13} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <style>{`@keyframes vc-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
            </div>
            {/* Sidebar: prompt + actions per tile */}
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
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-tint))',
                  border: '1px solid hsl(var(--vc-border))',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                "A ceramic teapot on a marble shelf, early morning light, 35mm film grain"
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'hsl(var(--vc-muted-fg))',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 10,
                  }}
                >
                  Per-variant actions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid hsl(var(--vc-border))',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: `hsl(${(n * 47) % 360} 60% 70%)`,
                          fontSize: 11,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                        }}
                      >
                        V{n}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          fontSize: 12,
                          fontFamily: 'ui-monospace',
                          color: 'hsl(var(--vc-muted-fg))',
                        }}
                      >
                        seed {438190 + n - 1}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          style={{
                            padding: '4px 8px',
                            fontSize: 10.5,
                            borderRadius: 6,
                            border: '1px solid hsl(var(--vc-border))',
                            background: 'hsl(var(--vc-bg))',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Vary
                        </button>
                        <button
                          style={{
                            padding: '4px 8px',
                            fontSize: 10.5,
                            borderRadius: 6,
                            border: '1px solid hsl(var(--vc-border))',
                            background: 'hsl(var(--vc-bg))',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          Upscale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  marginTop: 'auto',
                  padding: 12,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-primary) / .08)',
                  border: '1px solid hsl(var(--vc-primary) / .25)',
                  fontSize: 12,
                  color: 'hsl(var(--vc-primary))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <VCIcon name="bolt" size={13} /> Tip · click any variant for upscale & re-roll
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ──────────────────────────────────────────────────────────────
// C · Diffusion step viewer — live noise-to-image preview
// The recommended primary direction. Honest about cold-start, shows queue
// position, step counter, ETA, and a noise→image preview on the canvas.
// ──────────────────────────────────────────────────────────────
function GenStepViewer() {
  // 0..40 step counter
  const [step, setStep] = React.useState(22);
  const total = 40;
  const stage =
    step <= 0
      ? 'queued'
      : step < 4
        ? 'warming'
        : step < total
          ? 'diffusing'
          : step < total + 4
            ? 'uploading'
            : 'ready';
  const stageMeta = {
    queued: {
      label: 'Queued',
      color: 'hsl(var(--vc-muted-fg))',
      sub: 'Position 2 of 4 — waiting for free Kaggle worker',
    },
    warming: {
      label: 'GPU warming',
      color: 'hsl(38 92% 50%)',
      sub: 'Cold-starting · loading SDXL weights (one-time, ~25s)',
    },
    diffusing: {
      label: 'Diffusing',
      color: 'hsl(var(--vc-primary))',
      sub: `Step ${step} of ${total} · denoising latent space`,
    },
    uploading: {
      label: 'Uploading',
      color: 'hsl(var(--vc-primary))',
      sub: 'Saving 1024×1024 PNG to your gallery',
    },
    ready: {
      label: 'Ready',
      color: 'hsl(142 70% 38%)',
      sub: 'Generated in 14.2s · click to view full size',
    },
  }[stage];
  const visualProgress =
    stage === 'queued'
      ? 0
      : stage === 'warming'
        ? 0.04
        : stage === 'diffusing'
          ? step / total
          : stage === 'uploading'
            ? 0.97
            : 1;
  const isReady = stage === 'ready';
  const elapsed =
    stage === 'queued'
      ? 0
      : stage === 'warming'
        ? 4
        : stage === 'diffusing'
          ? 4 + step * 0.25
          : stage === 'uploading'
            ? 14
            : 14.2;
  const etaTotal = 16;
  const remaining = Math.max(0, Math.ceil(etaTotal - elapsed));

  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="C · Step viewer (recommended) — honest about Kaggle cold-start"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'hsl(var(--vc-muted-fg))',
                    fontFamily: 'ui-monospace',
                  }}
                >
                  step
                </div>
                <input
                  type="range"
                  min="0"
                  max={total + 6}
                  value={step}
                  onChange={(e) => setStep(+e.target.value)}
                  style={{ width: 140 }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'ui-monospace',
                    color: 'hsl(var(--vc-fg))',
                    width: 40,
                  }}
                >
                  {step}/{total}
                </div>
              </div>
            }
          />
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 360px',
              overflow: 'hidden',
            }}
          >
            {/* Canvas with live denoising preview */}
            <div
              style={{
                padding: 32,
                background: 'hsl(var(--vc-tint))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                overflow: 'hidden',
              }}
            >
              <div
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div
                  style={{
                    width: 'min(620px, 100%)',
                    aspectRatio: '1/1',
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 30px 80px -20px rgba(40,30,80,.25)',
                    background: 'hsl(var(--vc-fg))',
                  }}
                >
                  <NoiseTile progress={visualProgress} seed={2} label="" />
                  {/* Top status chip */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 18,
                      left: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,.65)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        background: stageMeta.color,
                        animation: isReady ? 'none' : 'vc-pulse 1.4s infinite',
                      }}
                    />
                    {stageMeta.label}
                  </div>
                  {/* Bottom bar: step + ETA on canvas */}
                  {!isReady && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 18,
                        right: 18,
                        bottom: 18,
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: 'rgba(0,0,0,.62)',
                        backdropFilter: 'blur(14px)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11.5,
                            fontFamily: 'ui-monospace',
                            opacity: 0.85,
                          }}
                        >
                          <span>{stageMeta.label.toUpperCase()}</span>
                          <span>~{remaining}s remaining</span>
                        </div>
                        <div
                          style={{
                            height: 4,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,.2)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${visualProgress * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #fff, hsl(var(--vc-primary)))',
                              transition: 'width .4s',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {isReady && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 18,
                        right: 18,
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: '#fff',
                          color: 'hsl(var(--vc-fg))',
                          fontSize: 12.5,
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          cursor: 'pointer',
                        }}
                      >
                        <VCIcon name="download" size={14} /> Download
                      </div>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,.95)',
                          color: 'hsl(var(--vc-fg))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <VCIcon name="heart" size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <style>{`@keyframes vc-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
            </div>
            {/* Right: timeline + technical detail */}
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
              {/* Big stage label */}
              <div>
                <div
                  style={{
                    fontFamily: 'var(--vc-font-display)',
                    fontSize: 24,
                    letterSpacing: -0.5,
                    fontWeight: 500,
                    color: stageMeta.color,
                  }}
                >
                  {stageMeta.label}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'hsl(var(--vc-muted-fg))',
                    marginTop: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {stageMeta.sub}
                </div>
              </div>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { k: 'queued', label: 'Queued', time: '0.0s', detail: 'Position 2 in queue' },
                  {
                    k: 'warming',
                    label: 'GPU warming',
                    time: '2.1s',
                    detail: 'Cold-starting Kaggle worker',
                  },
                  {
                    k: 'diffusing',
                    label: 'Diffusing',
                    time: '4.0s',
                    detail: `Step ${stage === 'diffusing' ? step : stage === 'ready' || stage === 'uploading' ? total : 0} / ${total}`,
                  },
                  {
                    k: 'uploading',
                    label: 'Uploading',
                    time: '14.0s',
                    detail: 'PNG → S3 → gallery',
                  },
                  {
                    k: 'ready',
                    label: 'Ready',
                    time: '14.2s',
                    detail: 'View · download · favourite',
                  },
                ].map((item, i, arr) => {
                  const order = ['queued', 'warming', 'diffusing', 'uploading', 'ready'];
                  const myIdx = order.indexOf(item.k);
                  const curIdx = order.indexOf(stage);
                  const isDone = myIdx < curIdx;
                  const isActive = myIdx === curIdx;
                  const isFuture = myIdx > curIdx;
                  return (
                    <div
                      key={item.k}
                      style={{ display: 'flex', gap: 12, opacity: isFuture ? 0.42 : 1 }}
                    >
                      {/* Rail */}
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
                            background: isDone
                              ? 'hsl(142 70% 45%)'
                              : isActive
                                ? stageMeta.color
                                : 'hsl(var(--vc-bg))',
                            border: `2px solid ${isDone ? 'hsl(142 70% 45%)' : isActive ? stageMeta.color : 'hsl(var(--vc-border))'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isDone && <VCIcon name="check" size={8} color="#fff" />}
                          {isActive && !isReady && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                background: '#fff',
                                animation: 'vc-pulse 1s infinite',
                              }}
                            />
                          )}
                        </div>
                        {i < arr.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              width: 2,
                              background: isDone ? 'hsl(142 70% 45%)' : 'hsl(var(--vc-border))',
                              minHeight: 24,
                            }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 18 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace',
                              color: 'hsl(var(--vc-muted-fg))',
                            }}
                          >
                            {item.time}
                          </div>
                        </div>
                        <div
                          style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}
                        >
                          {item.detail}
                        </div>
                        {isActive && stage === 'diffusing' && (
                          <div style={{ marginTop: 8 }}>
                            <StepTicker step={step} total={total} />
                          </div>
                        )}
                        {isActive && stage === 'warming' && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: 'hsl(38 92% 50% / .12)',
                              border: '1px solid hsl(38 92% 50% / .3)',
                              fontSize: 11.5,
                              color: 'hsl(38 92% 35%)',
                              lineHeight: 1.5,
                            }}
                          >
                            First gen of the session is slower — the GPU loads model weights into
                            memory. Subsequent generations skip this step.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Footer actions */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                {!isReady && (
                  <VCButton variant="ghost" size="sm" style={{ flex: 1 }}>
                    <VCIcon name="bell" size={13} />
                    &nbsp;Notify me
                  </VCButton>
                )}
                {!isReady && (
                  <VCButton variant="ghost" size="sm">
                    <VCIcon name="x" size={13} />
                    &nbsp;Cancel
                  </VCButton>
                )}
                {isReady && (
                  <VCButton size="sm" style={{ flex: 1 }}>
                    Generate again
                  </VCButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </VCScreen>
  );
}

// ──────────────────────────────────────────────────────────────
// D · History rail + ambient docked job
// Past gens visible as a scrollable rail; current job sits as a docked
// preview on top, can be expanded. User can keep working.
// ──────────────────────────────────────────────────────────────
function GenHistoryRail() {
  const [progress, setProgress] = React.useState(0.42);
  const isReady = progress >= 1;
  const eta = Math.max(0, Math.ceil((1 - progress) * 16));
  const history = [
    { id: 1, seed: 7, prompt: 'misty mountain lake at dawn', time: '2m ago', favourite: true },
    { id: 2, seed: 4, prompt: 'cyberpunk noodle bar, neon', time: '8m ago', favourite: false },
    { id: 3, seed: 6, prompt: 'an astronaut tending a garden', time: '14m ago', favourite: true },
    { id: 4, seed: 1, prompt: 'origami fox, paper texture', time: '22m ago', favourite: false },
    {
      id: 5,
      seed: 3,
      prompt: 'bauhaus poster, geometric shapes',
      time: '38m ago',
      favourite: false,
    },
  ];
  return (
    <VCScreen>
      <div style={{ height: '100%', display: 'flex' }}>
        <Sidebar active="generate" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <TopBar
            title="Generate"
            sub="D · History rail + ambient docked job"
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress * 100}
                  onChange={(e) => setProgress(e.target.value / 100)}
                  style={{ width: 120 }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'ui-monospace',
                    color: 'hsl(var(--vc-muted-fg))',
                  }}
                >
                  {Math.round(progress * 100)}%
                </div>
              </div>
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
            {/* Left: prompt + composer (still usable while gen runs) */}
            <div
              style={{
                padding: 28,
                borderRight: '1px solid hsl(var(--vc-border))',
                background: 'hsl(var(--vc-card))',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
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
                    marginBottom: 8,
                  }}
                >
                  Compose your next gen
                </div>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    background: 'hsl(var(--vc-tint))',
                    border: '1px solid hsl(var(--vc-border))',
                    fontSize: 13,
                    lineHeight: 1.55,
                    minHeight: 80,
                    color: 'hsl(var(--vc-muted-fg))',
                  }}
                >
                  Type a prompt while your last one renders…
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Model
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>SDXL Turbo</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Aspect
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Square</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Variants
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>4</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: 'hsl(var(--vc-muted-fg))',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    Quality
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Standard</div>
                </div>
              </div>
              <VCButton>
                <VCIcon name="bolt" size={14} />
                &nbsp;Generate
              </VCButton>
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: 'hsl(var(--vc-tint))',
                  border: '1px dashed hsl(var(--vc-border))',
                  fontSize: 12,
                  color: 'hsl(var(--vc-muted-fg))',
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: 'hsl(var(--vc-fg))', fontWeight: 600 }}>
                  Keep working.
                </strong>{' '}
                Your job runs in the background — we'll ping you when it's ready. You can queue up
                the next prompt while this one cooks.
              </div>
            </div>
            {/* Right: history feed */}
            <div
              style={{
                padding: 28,
                background: 'hsl(var(--vc-tint))',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--vc-font-display)',
                    fontSize: 20,
                    letterSpacing: -0.4,
                    fontWeight: 500,
                  }}
                >
                  Recent generations
                </div>
                <div style={{ fontSize: 12, color: 'hsl(var(--vc-muted-fg))' }}>
                  Today · 5 generations
                </div>
              </div>
              {/* Active job card sits at the top */}
              <div
                style={{
                  marginBottom: 14,
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: `1px solid ${isReady ? 'hsl(142 70% 45% / .35)' : 'hsl(var(--vc-primary) / .35)'}`,
                  background: 'hsl(var(--vc-card))',
                  boxShadow: '0 6px 24px -8px rgba(40,30,80,.18)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                  <div style={{ position: 'relative', aspectRatio: '1/1' }}>
                    <NoiseTile progress={progress} seed={2} />
                  </div>
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '5px 11px',
                          borderRadius: 999,
                          background: isReady
                            ? 'hsl(142 70% 45% / .12)'
                            : 'hsl(var(--vc-primary) / .12)',
                          color: isReady ? 'hsl(142 70% 32%)' : 'hsl(var(--vc-primary))',
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        {isReady ? (
                          <>
                            <VCIcon name="check" size={11} /> Ready just now
                          </>
                        ) : (
                          <>
                            <GenDots /> {progress < 0.06 ? 'GPU warming' : 'Diffusing'} · ~{eta}s
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: 'ui-monospace',
                          color: 'hsl(var(--vc-muted-fg))',
                        }}
                      >
                        {Math.round(progress * 100)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'hsl(var(--vc-fg))' }}>
                      "A ceramic teapot on a marble shelf, early morning light, 35mm film grain"
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'hsl(var(--vc-muted))',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress * 100}%`,
                          height: '100%',
                          background: isReady ? 'hsl(142 70% 45%)' : 'hsl(var(--vc-primary))',
                          transition: 'width .3s',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      {isReady ? (
                        <>
                          <VCButton size="sm">
                            <VCIcon name="maximize" size={13} />
                            &nbsp;View
                          </VCButton>
                          <VCButton size="sm" variant="ghost">
                            <VCIcon name="download" size={13} />
                            &nbsp;Download
                          </VCButton>
                          <VCButton size="sm" variant="ghost">
                            <VCIcon name="heart" size={13} />
                          </VCButton>
                        </>
                      ) : (
                        <>
                          <VCButton size="sm" variant="ghost">
                            <VCIcon name="bell" size={13} />
                            &nbsp;Notify
                          </VCButton>
                          <VCButton size="sm" variant="ghost">
                            <VCIcon name="x" size={13} />
                            &nbsp;Cancel
                          </VCButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* History rail */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {history.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: 'hsl(var(--vc-card))',
                      border: '1px solid hsl(var(--vc-border))',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ aspectRatio: '1/1', position: 'relative' }}>
                      <VCPlaceholder label="" seed={h.seed} />
                      {h.favourite && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            background: 'rgba(0,0,0,.55)',
                            backdropFilter: 'blur(6px)',
                            color: 'hsl(0 80% 65%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <VCIcon name="heart" size={12} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'hsl(var(--vc-fg))',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h.prompt}
                      </div>
                      <div
                        style={{ fontSize: 10.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}
                      >
                        {h.time}
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

// ──────────────────────────────────────────────────────────────
// E · Phase strip — direction C across all 5 phases on one frame
// ──────────────────────────────────────────────────────────────
function GenPhaseStrip() {
  const stages = [
    { k: 'Queued', prog: 0.0, color: 'hsl(var(--vc-muted-fg))', sub: 'Position 2/4 · waiting' },
    { k: 'Warming', prog: 0.04, color: 'hsl(38 92% 50%)', sub: 'Cold-start GPU' },
    { k: 'Diffusing', prog: 0.55, color: 'hsl(var(--vc-primary))', sub: 'Step 22/40' },
    { k: 'Uploading', prog: 0.97, color: 'hsl(var(--vc-primary))', sub: 'Saving PNG' },
    { k: 'Ready', prog: 1.0, color: 'hsl(142 70% 38%)', sub: '14.2s · done' },
  ];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 32,
        background: 'hsl(var(--vc-tint))',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        overflow: 'hidden',
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
          Direction C — full arc
        </div>
        <div style={{ fontSize: 12.5, color: 'hsl(var(--vc-muted-fg))', marginTop: 4 }}>
          Five phases, side by side · noise resolves into image as steps complete
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          minHeight: 0,
        }}
      >
        {stages.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid hsl(var(--vc-border))',
                background: 'hsl(var(--vc-fg))',
              }}
            >
              <NoiseTile progress={s.prog} seed={2} />
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  padding: '4px 9px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,.65)',
                  color: '#fff',
                  fontSize: 10.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 3, background: s.color }} />
                {s.k}
              </div>
              {s.prog < 1 && s.prog > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 10,
                    right: 10,
                    bottom: 10,
                    height: 3,
                    borderRadius: 2,
                    background: 'rgba(0,0,0,.4)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${s.prog * 100}%`, height: '100%', background: '#fff' }} />
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: s.color }}>
                {i + 1}. {s.k}
              </div>
              <div style={{ fontSize: 11, color: 'hsl(var(--vc-muted-fg))', marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  GenScanReveal,
  GenTilesRacing,
  GenStepViewer,
  GenHistoryRail,
  GenPhaseStrip,
});
