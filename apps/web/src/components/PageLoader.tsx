import { Spinner } from '@ai-platform/ui';

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
