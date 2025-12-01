'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  AuthCard,
  FormField,
  PasswordInput,
  Checkbox,
  Alert,
} from '@/components/auth';
import { Button } from '@/components/ui';
import { LoginCredentials } from '@/types/auth';
import { getDashboardPath } from '@/lib/utils/roleHelpers';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [serverError, setServerError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validate()) return;

    try {
      // Login returns user data immediately (JobSync pattern)
      // Note: login() validates user status - only 'active' users can proceed
      const user = await login(formData);

      // Determine dashboard based on role
      const dashboardPath = getDashboardPath(user.role_id);

      setSuccessMessage('Login successful! Redirecting...');

      // JOBSYNC PATTERN: Use router.push() directly
      // The middleware only refreshes session, it doesn't block routes
      // Route protection happens in the dashboard layouts
      router.push(dashboardPath);
    } catch (error) {
      // Display error from login (includes status validation errors)
      setServerError(
        error instanceof Error ? error.message : 'Login failed. Please try again.'
      );
    }
  };

  /**
   * Handle input changes
   */
  const handleChange = (field: keyof LoginCredentials, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="flex justify-center">
      <AuthCard
        title="Welcome Back"
        subtitle="Sign in to your HealthCard account"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="error" message={serverError} closeable onClose={() => setServerError('')} />
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert variant="success" message={successMessage} />
          )}

          {/* Email Field */}
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            icon={Mail}
            iconPosition="left"
            required
            disabled={loading}
            autoComplete="email"
          />

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password <span className="text-danger">*</span>
            </label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              icon={Lock}
              iconPosition="left"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <Checkbox
              id="rememberMe"
              label="Remember me"
              checked={formData.rememberMe}
              onChange={(e) => handleChange('rememberMe', e.target.checked)}
              disabled={loading}
            />

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary-teal hover:text-primary-teal-dark transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Don't have an account?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link href="/register">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              Create an account
            </Button>
          </Link>

          {/* Test Credentials Helper (for development) */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Test Credentials:
            </p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <strong>Patient:</strong> patient@healthcard.com / patient123
              </p>
              <p>
                <strong>Doctor:</strong> doctor@healthcard.com / doctor123
              </p>
              <p>
                <strong>Admin:</strong> healthcard.admin@healthcard.com / healthcard123
              </p>
              <p>
                <strong>Super Admin:</strong> admin@healthcard.com / admin123
              </p>
            </div>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
