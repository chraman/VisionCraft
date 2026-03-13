import { Link } from 'react-router-dom';
import { RegisterForm } from '../components/RegisterForm';
import { OAuthButton } from '../components/OAuthButton';

export default function RegisterPage() {
  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Create account</h1>
      <OAuthButton />
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">or continue with email</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
