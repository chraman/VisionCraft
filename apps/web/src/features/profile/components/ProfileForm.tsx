import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@ai-platform/ui';
import { useProfile } from '../hooks/useProfile';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { query, mutation } = useProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: query.data?.name ?? '',
      avatarUrl: query.data?.avatarUrl ?? '',
    },
  });

  function onSubmit(data: ProfileFormData) {
    mutation.mutate({
      name: data.name,
      avatarUrl: data.avatarUrl || null,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <Input
          id="profile-name"
          type="text"
          className="mt-1 w-full"
          aria-describedby={errors.name ? 'profile-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="profile-name-error" className="mt-1 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="avatar-url" className="block text-sm font-medium text-gray-700">
          Avatar URL <span className="text-gray-400">(optional)</span>
        </label>
        <Input
          id="avatar-url"
          type="url"
          className="mt-1 w-full"
          aria-describedby={errors.avatarUrl ? 'avatar-url-error' : undefined}
          {...register('avatarUrl')}
        />
        {errors.avatarUrl && (
          <p id="avatar-url-error" className="mt-1 text-xs text-red-600">
            {errors.avatarUrl.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
