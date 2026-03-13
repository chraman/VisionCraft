import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLoader } from '../components/PageLoader';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

const HomePage = lazy(() => import('../pages/HomePage'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const GeneratePage = lazy(() => import('../features/generate/pages/GeneratePage'));
const GalleryPage = lazy(() => import('../features/gallery/pages/GalleryPage'));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage'));

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  // Public homepage
  {
    path: '/',
    element: withSuspense(<HomePage />),
  },
  // Auth pages (redirect to /generate if already logged in)
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: withSuspense(<LoginPage />) }],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [{ index: true, element: withSuspense(<RegisterPage />) }],
  },
  // Authenticated app
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/generate', element: withSuspense(<GeneratePage />) },
          { path: '/gallery', element: withSuspense(<GalleryPage />) },
          { path: '/profile', element: withSuspense(<ProfilePage />) },
        ],
      },
    ],
  },
  // 404
  {
    path: '*',
    element: (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <p className="mt-2 text-gray-600">Page not found</p>
          <a href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            Go home
          </a>
        </div>
      </div>
    ),
  },
]);
