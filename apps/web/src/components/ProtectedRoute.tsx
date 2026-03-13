import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';
import { useFlag } from '@ai-platform/feature-flags';
import type { FeatureFlagKey } from '@ai-platform/types';

interface ProtectedRouteProps {
  flag?: FeatureFlagKey;
  redirectTo?: string;
}

function FlagGate({ flagKey, redirectTo }: { flagKey: FeatureFlagKey; redirectTo: string }) {
  const enabled = useFlag(flagKey);
  if (!enabled) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

export function ProtectedRoute({ flag, redirectTo = '/generate' }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (flag) {
    return <FlagGate flagKey={flag} redirectTo={redirectTo} />;
  }

  return <Outlet />;
}
