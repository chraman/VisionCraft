import { Link } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';

function MailIcon() {
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

export default function EmailVerifyPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tint px-10">
      {/* Logo */}
      <span className="flex items-center gap-2 text-foreground">
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
      </span>

      {/* Card */}
      <div className="mt-8 w-[480px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="px-9 pb-5 pt-9 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-soft text-primary">
            <MailIcon />
          </div>

          <h2 className="mt-5 mb-2 font-display text-[28px] font-medium tracking-[-0.8px]">
            Check your inbox.
          </h2>

          <p className="text-[14px] leading-[1.55] text-muted-foreground">
            We sent a verification link to
            <br />
            <span className="font-medium text-foreground">
              {user?.email ?? 'your email address'}
            </span>
            . Click it to activate your account.
          </p>

          <div className="mt-[26px] flex justify-center gap-2.5">
            <a
              href="https://gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              Open Gmail
            </a>
            <button className="rounded-lg bg-primary px-4 py-2 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Resend email
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted px-5 py-3.5 text-[12px] text-muted-foreground">
          <span>
            Check spam or{' '}
            <Link to="/register" className="text-foreground underline underline-offset-[3px]">
              change email
            </Link>
            .
          </span>
          <span>Expires in 24h</span>
        </div>
      </div>
    </div>
  );
}
