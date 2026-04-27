import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageLoader } from '../components/PageLoader';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';

const HomePage = lazy(() => import('../pages/HomePage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('../features/auth/pages/OAuthCallbackPage'));
const EmailVerifyPage = lazy(() => import('../features/auth/pages/EmailVerifyPage'));

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
  // Auth pages
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
  {
    path: '/email-verify',
    element: withSuspense(<EmailVerifyPage />),
  },
  {
    path: '/auth/callback',
    element: withSuspense(<OAuthCallbackPage />),
  },
  // Authenticated app
  {
    element: <ProtectedRoute redirectTo="/dashboard" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Default redirect to dashboard
          { path: '/app', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
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
    element: withSuspense(<NotFoundPage />),
  },
]);
