import { useState } from 'react';
import { ProfileForm } from '../components/ProfileForm';
import { useLogout } from '../../auth/hooks/useLogout';
import { useQuota } from '../hooks/useQuota';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

const SECTIONS = [
  'Profile',
  'Plan & quota',
  'Security',
  'Notifications',
  'Preferences',
  'Danger zone',
];

function ProgressBar({ value, tone }: { value: number; tone?: 'amber' | 'red' | 'primary' }) {
  const color = tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-400' : 'bg-primary';
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState('Profile');
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: quota } = useQuota();
  const { user } = useAuthStore();

  const quotaPct = quota ? Math.min(Math.round((quota.used / quota.limit) * 100), 100) : 0;
  const quotaTone = quotaPct >= 90 ? 'red' : quotaPct >= 70 ? 'amber' : 'primary';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-8 py-[18px]">
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.5px]">Settings</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            Account, billing, and preferences
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-tint p-8">
        <div
          className="mx-auto grid max-w-[720px] gap-8"
          style={{ gridTemplateColumns: '180px 1fr' }}
        >
          {/* Left sticky nav */}
          <div className="sticky top-0 flex flex-col gap-0.5 self-start">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  activeSection === s
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex flex-col gap-4">
            {/* Profile card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div className="text-[15px] font-semibold">Profile</div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                This is how others will see you.
              </div>

              {/* Avatar */}
              <div className="mt-5 flex items-center gap-5">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary font-display text-[22px] font-medium text-primary-foreground">
                  {initials}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
                    Upload new
                  </button>
                  <button className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    Remove
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="mt-5">
                <ProfileForm />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  Cancel
                </button>
                <button
                  type="submit"
                  form="profile-form"
                  className="rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Save changes
                </button>
              </div>
            </div>

            {/* Plan & quota */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold">
                    Plan · {quota?.tier === 'pro' ? 'Pro' : 'Free'}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {quota?.used !== undefined && quota?.limit !== undefined
                      ? `${quota.used} of ${quota.limit} generations used`
                      : 'Loading quota…'}
                  </div>
                </div>
                {quota?.tier !== 'pro' && (
                  <button
                    onClick={() => track({ event: 'upgrade_clicked', userId: user?.id })}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>

              <div className="mt-4.5 mt-[18px]">
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="text-muted-foreground">Generations used</span>
                  <span className="font-medium">
                    {quota?.used ?? 0} of {quota?.limit ?? 10}
                  </span>
                </div>
                <ProgressBar value={quotaPct} tone={quotaTone} />
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <div className="text-[15px] font-semibold">Security</div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                Password and two-factor auth.
              </div>

              <div className="mt-4.5 mt-[18px] flex flex-col gap-3">
                {/* Password row */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <div className="text-[13px] font-medium">Password</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      Last changed 3 months ago
                    </div>
                  </div>
                  <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
                    Change
                  </button>
                </div>

                {/* 2FA row */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                      Two-factor auth
                      <span className="rounded-full bg-muted px-2 py-[2px] text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                        off
                      </span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      Protect your account with a TOTP app.
                    </div>
                  </div>
                  <button className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted">
                    Enable 2FA
                  </button>
                </div>
              </div>

              {/* Sign out */}
              <div className="mt-5 border-t border-border pt-4">
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Signing out…' : 'Sign out of all devices'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
