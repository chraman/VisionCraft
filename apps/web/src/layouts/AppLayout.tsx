import { useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { track } from '../lib/analytics';
import { useAuthStore } from '@ai-platform/store';
import { useLogout } from '../features/auth/hooks/useLogout';

const navLinks = [
  { to: '/generate', label: 'Generate' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/profile', label: 'Profile' },
];

export default function AppLayout() {
  useCurrentUser();

  const location = useLocation();
  const { user } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  useEffect(() => {
    track({
      event: 'page_view',
      path: location.pathname,
      userId: user?.id,
    });
  }, [location.pathname, user?.id]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col">
        <div className="mb-8">
          <span className="text-xl font-bold text-indigo-600">VisionCraft</span>
        </div>
        <nav className="flex flex-col gap-1">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-gray-200">
          <button
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="w-full rounded-md px-3 py-2 text-sm font-medium text-left text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
