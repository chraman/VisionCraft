import { useEffect } from 'react';
import { Button } from '@ai-platform/ui';
import { useQuota } from '../features/profile/hooks/useQuota';
import { track } from '../lib/analytics';
import { useAuthStore } from '@ai-platform/store';

interface QuotaGuardProps {
  children: React.ReactNode;
}

export function QuotaGuard({ children }: QuotaGuardProps) {
  const { data: quota } = useQuota();
  const { user } = useAuthStore();

  const isExhausted = quota !== undefined && quota.used >= quota.limit;

  useEffect(() => {
    if (isExhausted && quota && user) {
      track({
        event: 'quota_exceeded',
        userId: user.id,
        tier: quota.tier,
        used: quota.used,
        limit: quota.limit,
      });
    }
  }, [isExhausted, quota, user]);

  if (isExhausted) {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
          <div className="text-center p-6">
            <p className="text-lg font-semibold text-gray-900">Monthly limit reached</p>
            <p className="mt-1 text-sm text-gray-600">
              You've used {quota?.used} of {quota?.limit} generations this month.
            </p>
            <Button
              className="mt-4"
              onClick={() => track({ event: 'upgrade_clicked', userId: user?.id })}
            >
              Upgrade plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
