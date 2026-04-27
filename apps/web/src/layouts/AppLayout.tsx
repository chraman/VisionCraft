import { useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { track } from '../lib/analytics';
import { useAuthStore } from '@ai-platform/store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { useQuota } from '../features/profile/hooks/useQuota';

// ─── Sidebar icons (inline SVG, minimal set) ──────────────────────────────────

function Icon({
  name,
  size = 17,
  className = 'stroke-current',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="8" height="10" rx="1.5" />
        <rect x="13" y="3" width="8" height="6" rx="1.5" />
        <rect x="3" y="15" width="8" height="6" rx="1.5" />
        <rect x="13" y="11" width="8" height="10" rx="1.5" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="M19 15v3M17.5 16.5h3" />
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
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function VCLogo() {
  return (
    <span className="flex items-center gap-2 text-foreground">
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
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
      <span className="text-[15.6px] font-semibold tracking-[-0.4px] font-display">
        VisionCraft
      </span>
    </span>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/generate', icon: 'sparkle', label: 'Generate' },
  { to: '/gallery', icon: 'gallery', label: 'Gallery' },
  { to: '/profile', icon: 'user', label: 'Settings' },
];

// ─── Quota progress bar ───────────────────────────────────────────────────────

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const tone = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-primary';
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const { user } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: quota } = useQuota();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  return (
    <aside className="flex h-full w-[232px] flex-shrink-0 flex-col border-r border-border bg-card px-[14px] py-[22px]">
      {/* Logo */}
      <div className="px-2 pb-[22px]">
        <VCLogo />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-[11px] rounded-lg px-3 py-[9px] text-[13.5px] font-medium transition-colors ${
                isActive
                  ? 'bg-soft text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  name={icon}
                  size={17}
                  className={isActive ? 'stroke-primary' : 'stroke-current'}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Quota widget */}
      <div className="mt-auto rounded-[10px] border border-border bg-muted p-[14px]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-muted-foreground">
          Quota · {quota?.tier ?? 'Free'}
        </div>
        <div className="mt-2 text-[13px] font-semibold">
          {quota?.used ?? 0}{' '}
          <span className="font-normal text-muted-foreground">/ {quota?.limit ?? 10} used</span>
        </div>
        <QuotaBar used={quota?.used ?? 0} limit={quota?.limit ?? 10} />
        <button
          onClick={() => navigate('/profile')}
          className="mt-2.5 w-full rounded-lg bg-primary py-[7px] text-[12.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Upgrade to Pro
        </button>
      </div>

      {/* User row */}
      <div className="mt-3 flex items-center gap-2.5 px-1 py-2">
        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium">{user?.name ?? 'User'}</div>
          <div className="text-[11px] text-muted-foreground capitalize">
            {quota?.tier ?? 'Free'} tier
          </div>
        </div>
        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          title="Sign out"
          className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          <Icon name="logout" size={15} className="stroke-current" />
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar (shared by child pages via context) ───────────────────────────────
// Each page renders its own top-bar inline; AppLayout just provides the shell.

export default function AppLayout() {
  useCurrentUser();

  const location = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    track({ event: 'page_view', path: location.pathname, userId: user?.id });
  }, [location.pathname, user?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
