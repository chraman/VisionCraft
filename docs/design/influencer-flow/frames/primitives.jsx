// Shared primitives matching packages/ui (shadcn-style) + VisionCraft theme tokens
// Reads CSS custom properties from the artboard's local scope so Tweaks can
// swap accent/theme/density/font at runtime.

const VC_TOKENS = {
  indigo: { p: '239 84% 67%', ring: '239 84% 67%', soft: '239 100% 97%', tint: '239 84% 97%' },
  violet: { p: '262 83% 65%', ring: '262 83% 65%', soft: '262 100% 97%', tint: '262 83% 97%' },
  teal: { p: '178 78% 39%', ring: '178 78% 39%', soft: '178 60% 95%', tint: '178 60% 96%' },
};

// Screen wrapper — each artboard wraps its content in this so it gets the
// VC theme vars + inter font + cross-iframe isolation from the canvas.
function VCScreen({
  children,
  width = 1440,
  height = 900,
  tint = false,
  bg,
  scroll = false,
  style,
}) {
  return (
    <div
      style={{
        width,
        height,
        background: bg || (tint ? 'hsl(var(--vc-tint))' : 'hsl(var(--vc-bg))'),
        color: 'hsl(var(--vc-fg))',
        fontFamily: 'var(--vc-font-sans)',
        fontFeatureSettings: '"cv02","cv03","cv04","cv11"',
        overflow: scroll ? 'auto' : 'hidden',
        position: 'relative',
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Button matches packages/ui Button cva shape
function VCButton({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  style,
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    borderRadius: 8,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all .15s',
    border: '1px solid transparent',
    fontFamily: 'inherit',
  };
  const sizes = {
    default: { height: 38, padding: '0 16px', fontSize: 13.5 },
    sm: { height: 32, padding: '0 12px', fontSize: 12.5 },
    lg: { height: 44, padding: '0 22px', fontSize: 14.5 },
    icon: { height: 38, width: 38, padding: 0 },
    xl: { height: 52, padding: '0 28px', fontSize: 15 },
  };
  const variants = {
    default: {
      background: 'hsl(var(--vc-primary))',
      color: '#fff',
      boxShadow:
        '0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.18)',
    },
    outline: {
      background: 'hsl(var(--vc-bg))',
      color: 'hsl(var(--vc-fg))',
      border: '1px solid hsl(var(--vc-border))',
    },
    ghost: { background: 'transparent', color: 'hsl(var(--vc-fg))' },
    soft: { background: 'hsl(var(--vc-soft))', color: 'hsl(var(--vc-primary))' },
    destructive: { background: 'hsl(0 84% 60%)', color: '#fff' },
    link: {
      background: 'transparent',
      color: 'hsl(var(--vc-primary))',
      textDecoration: 'underline',
      textUnderlineOffset: 4,
    },
    black: { background: 'hsl(var(--vc-fg))', color: 'hsl(var(--vc-bg))' },
  };
  return (
    <button {...rest} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function VCInput({ label, hint, error, icon, trailing, className, style, wrapStyle, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...wrapStyle }}>
      {label && (
        <label style={{ fontSize: 12.5, fontWeight: 500, color: 'hsl(var(--vc-fg))' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: 12,
              color: 'hsl(var(--vc-muted-fg))',
              display: 'flex',
            }}
          >
            {icon}
          </span>
        )}
        <input
          {...rest}
          style={{
            height: 40,
            width: '100%',
            padding: icon ? '0 12px 0 38px' : '0 12px',
            paddingRight: trailing ? 40 : 12,
            borderRadius: 8,
            border: `1px solid ${error ? 'hsl(0 80% 60%)' : 'hsl(var(--vc-border))'}`,
            background: 'hsl(var(--vc-bg))',
            color: 'hsl(var(--vc-fg))',
            fontSize: 13.5,
            outline: 'none',
            fontFamily: 'inherit',
            boxShadow: '0 1px 2px rgba(16,24,40,.04)',
            ...style,
          }}
        />
        {trailing && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              color: 'hsl(var(--vc-muted-fg))',
              display: 'flex',
            }}
          >
            {trailing}
          </span>
        )}
      </div>
      {hint && !error && (
        <span style={{ fontSize: 11.5, color: 'hsl(var(--vc-muted-fg))' }}>{hint}</span>
      )}
      {error && <span style={{ fontSize: 11.5, color: 'hsl(0 80% 55%)' }}>{error}</span>}
    </div>
  );
}

function VCCard({ children, padding = 24, style, hover }) {
  return (
    <div
      style={{
        background: 'hsl(var(--vc-card))',
        border: '1px solid hsl(var(--vc-border))',
        borderRadius: 12,
        padding,
        boxShadow: '0 1px 2px rgba(16,24,40,.04)',
        transition: 'all .15s',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function VCBadge({ children, variant = 'default', style }) {
  const variants = {
    default: { background: 'hsl(var(--vc-fg))', color: 'hsl(var(--vc-bg))' },
    soft: { background: 'hsl(var(--vc-soft))', color: 'hsl(var(--vc-primary))' },
    outline: {
      background: 'transparent',
      color: 'hsl(var(--vc-fg))',
      border: '1px solid hsl(var(--vc-border))',
    },
    muted: { background: 'hsl(var(--vc-muted))', color: 'hsl(var(--vc-muted-fg))' },
    success: { background: 'hsl(142 72% 93%)', color: 'hsl(142 72% 29%)' },
    warn: { background: 'hsl(38 92% 93%)', color: 'hsl(25 85% 38%)' },
    danger: { background: 'hsl(0 84% 95%)', color: 'hsl(0 70% 42%)' },
    dot: {
      background: 'hsl(var(--vc-card))',
      color: 'hsl(var(--vc-fg))',
      border: '1px solid hsl(var(--vc-border))',
    },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 500,
        padding: '3px 8px',
        borderRadius: 999,
        lineHeight: 1.3,
        letterSpacing: -0.1,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// Mono-captioned striped placeholder — our stand-in for "real" AI images.
function VCPlaceholder({ label = 'image', width, height, seed = 1, accent, style }) {
  const hues = [
    [239, 70, 92, 239, 84, 67], // indigo
    [262, 70, 92, 262, 83, 65], // violet
    [178, 60, 92, 178, 78, 45], // teal
    [25, 80, 92, 18, 80, 55], // amber
    [330, 70, 92, 330, 75, 58], // pink
    [142, 55, 92, 142, 65, 38], // green
    [210, 60, 94, 210, 75, 50], // sky
  ];
  const s = hues[seed % hues.length];
  const grad = `linear-gradient(135deg, hsl(${s[0]} ${s[1]}% ${s[2]}%) 0%, hsl(${s[3]} ${s[4]}% ${s[5]}%) 100%)`;
  return (
    <div
      style={{
        position: 'relative',
        width: width || '100%',
        height: height || '100%',
        background: grad,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* subtle noise stripes */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 16px)',
        }}
      />
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 10.5,
            color: 'rgba(255,255,255,.85)',
            background: 'rgba(0,0,0,.35)',
            padding: '3px 7px',
            borderRadius: 4,
            backdropFilter: 'blur(4px)',
            letterSpacing: -0.1,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function VCLogo({ size = 22, showWord = true, color }) {
  const c = color || 'hsl(var(--vc-fg))';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: c }}>
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
        <circle cx="12" cy="12" r="4.2" fill="hsl(var(--vc-primary))" />
        <circle cx="17" cy="7" r="1.4" fill="currentColor" />
      </svg>
      {showWord && (
        <span
          style={{
            fontSize: size * 0.78,
            fontWeight: 600,
            letterSpacing: -0.4,
            fontFamily: 'var(--vc-font-display)',
          }}
        >
          VisionCraft
        </span>
      )}
    </span>
  );
}

// Icons — minimal line set, 18×18 default
function VCIcon({ name, size = 18, color = 'currentColor', style }) {
  const S = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style,
  };
  const paths = {
    sparkle: (
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="M19 15v3M17.5 16.5h3" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5-5-10 10" />
      </>
    ),
    gallery: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
      </>
    ),
    heart: <path d="M12 21s-7-4.5-9.5-9.5A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5.5C19 16.5 12 21 12 21z" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      </>
    ),
    check: <path d="M4 12l5 5L20 6" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    arrowRight: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    google: (
      <g strokeWidth="0" stroke="none">
        <path
          fill="#4285F4"
          d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.3-.9 2.4-2 3.1v2.6h3.2c1.9-1.7 3-4.3 3-7.5z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3v2.6A10 10 0 0 0 12 22z"
        />
        <path
          fill="#FBBC05"
          d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3A10 10 0 0 0 3 17l3.4-3z"
        />
        <path
          fill="#EA4335"
          d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"
        />
      </g>
    ),
    upload: (
      <>
        <path d="M12 15V3M6 9l6-6 6 6M4 21h16" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M2 2l20 20M6.7 6.7A10 10 0 0 0 2 12s4 7 10 7a10 10 0 0 0 5.3-1.7M9.9 4.2A10 10 0 0 1 12 4c6 0 10 7 10 7a19 19 0 0 1-2.3 3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 7 9-7" />
      </>
    ),
    bell: (
      <>
        <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 0 0 4 0" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v5h1" />
      </>
    ),
    warn: (
      <>
        <path d="M12 3l10 18H2z" />
        <path d="M12 10v5M12 18h.01" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h16M4 12h10M4 17h6" />
        <circle cx="17" cy="12" r="2" />
        <circle cx="13" cy="17" r="2" />
      </>
    ),
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    crop: (
      <>
        <path d="M6 2v16h16M18 22V6H2" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M8 3v5h8V3M8 21v-7h8v7" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
        <path d="M21 3v5h-5" />
      </>
    ),
    layers: (
      <>
        <path d="M12 3l10 5-10 5L2 8l10-5z" />
        <path d="M2 13l10 5 10-5M2 18l10 5 10-5" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-2 6-6 2 2-6z" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    chevronRight: <path d="M9 6l6 6-6 6" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    menu: (
      <>
        <path d="M3 6h18M3 12h18M3 18h18" />
      </>
    ),
    filter: <path d="M3 5h18l-7 8v6l-4-2v-4z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" />,
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="14" r="4" />
        <path d="M12 14h10l-2 2 2 2-3 3" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="8" height="10" rx="1.5" />
        <rect x="13" y="3" width="8" height="6" rx="1.5" />
        <rect x="3" y="15" width="8" height="6" rx="1.5" />
        <rect x="13" y="11" width="8" height="10" rx="1.5" />
      </>
    ),
    home: (
      <>
        <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
      </>
    ),
    star: <path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 21l1.2-6.5L2.5 9.9 9.1 9z" />,
    dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    share: (
      <>
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
      </>
    ),
    film: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 10h4M17 10h4M3 14h4M17 14h4" />
      </>
    ),
    maximize: (
      <>
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      </>
    ),
    zoomIn: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
      </>
    ),
    zoomOut: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3M8 11h6" />
      </>
    ),
  };
  return <svg {...S}>{paths[name] || paths.dot}</svg>;
}

// Progress bar
function VCProgress({ value = 50, tone = 'primary', height = 6, style }) {
  const colors = {
    primary: 'hsl(var(--vc-primary))',
    amber: 'hsl(38 92% 55%)',
    green: 'hsl(142 70% 42%)',
    red: 'hsl(0 80% 58%)',
  };
  return (
    <div
      style={{
        width: '100%',
        height,
        background: 'hsl(var(--vc-muted))',
        borderRadius: 999,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          background: colors[tone],
          transition: 'width .3s',
        }}
      />
    </div>
  );
}

// Generic dashed-outline "drop / empty" surface
function VCDashed({ children, style }) {
  return (
    <div
      style={{
        border: '1.5px dashed hsl(var(--vc-border))',
        borderRadius: 12,
        background: 'hsl(var(--vc-muted))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

Object.assign(window, {
  VCScreen,
  VCButton,
  VCInput,
  VCCard,
  VCBadge,
  VCPlaceholder,
  VCLogo,
  VCIcon,
  VCProgress,
  VCDashed,
  VC_TOKENS,
});
