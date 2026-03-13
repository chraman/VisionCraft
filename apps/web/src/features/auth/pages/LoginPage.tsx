import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { OAuthButton } from '../components/OAuthButton';

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Sign in</h1>
      <OAuthButton />
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">or continue with email</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
