import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@ai-platform/ui';
import { useRegister } from '../hooks/useRegister';
import { track } from '../../../lib/analytics';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { mutate: registerUser, isPending } = useRegister();
  const signupStartedFired = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  function handleFirstFocus() {
    if (!signupStartedFired.current) {
      signupStartedFired.current = true;
      track({ event: 'signup_started' });
    }
  }

  return (
    <form onSubmit={handleSubmit((data) => registerUser(data))} noValidate className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          className="mt-1 w-full"
          aria-describedby={errors.name ? 'name-error' : undefined}
          {...register('name', { onBlur: handleFirstFocus })}
          onFocus={handleFirstFocus}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          className="mt-1 w-full"
          aria-describedby={errors.email ? 'reg-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="reg-email-error" className="mt-1 text-xs text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full"
          aria-describedby={errors.password ? 'reg-password-error' : undefined}
          {...register('password')}
        />
        {errors.password && (
          <p id="reg-password-error" className="mt-1 text-xs text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full"
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="mt-1 text-xs text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
