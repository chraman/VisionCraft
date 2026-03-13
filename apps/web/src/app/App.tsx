import { RouterProvider } from 'react-router-dom';
import { initSentry } from '../lib/sentry';
import { initAnalytics } from '../lib/analytics';
import { Providers } from './providers';
import { router } from './router';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { useAuthStore } from '@ai-platform/store';
import { PageLoader } from '../components/PageLoader';

initSentry();
initAnalytics();

function TokenRefreshGate({ children }: { children: React.ReactNode }) {
  useTokenRefresh();
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return <PageLoader />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Providers>
      <TokenRefreshGate>
        <RouterProvider router={router} />
      </TokenRefreshGate>
    </Providers>
  );
}
