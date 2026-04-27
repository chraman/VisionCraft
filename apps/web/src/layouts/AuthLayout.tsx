import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
