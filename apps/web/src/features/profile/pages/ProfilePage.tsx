import { ProfileForm } from '../components/ProfileForm';
import { QuotaDisplay } from '../components/QuotaDisplay';
import { useLogout } from '../../auth/hooks/useLogout';
import { Button } from '@ai-platform/ui';

export default function ProfilePage() {
  const { mutate: logout, isPending } = useLogout();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Profile</h1>
      <div className="space-y-6">
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Account details</h2>
          <ProfileForm />
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Usage</h2>
          <QuotaDisplay />
        </section>

        <Button variant="outline" onClick={() => logout()} disabled={isPending}>
          {isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </div>
  );
}
