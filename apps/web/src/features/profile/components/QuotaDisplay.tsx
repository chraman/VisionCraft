import { Badge, Button } from '@ai-platform/ui';
import { useQuota } from '../hooks/useQuota';
import { useAuthStore } from '@ai-platform/store';
import { track } from '../../../lib/analytics';

export function QuotaDisplay() {
  const { data: quota, isLoading } = useQuota();
  const { user } = useAuthStore();

  if (isLoading || !quota) {
    return <div className="h-16 animate-pulse rounded-lg bg-gray-100" />;
  }

  const percentage = Math.min((quota.used / quota.limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isExhausted = quota.used >= quota.limit;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Monthly generations</span>
        <Badge variant={isExhausted ? 'destructive' : isNearLimit ? 'secondary' : 'default'}>
          {quota.tier}
        </Badge>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{quota.used} used</span>
          <span>{quota.limit} limit</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              isExhausted ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      {(isExhausted || isNearLimit) && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => track({ event: 'upgrade_clicked', userId: user?.id })}
        >
          Upgrade plan
        </Button>
      )}
    </div>
  );
}
