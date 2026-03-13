import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@ai-platform/store';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/generate" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold text-indigo-600">VisionCraft</span>
          <p className="mt-2 text-sm text-gray-600">AI Image Creation Platform</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
