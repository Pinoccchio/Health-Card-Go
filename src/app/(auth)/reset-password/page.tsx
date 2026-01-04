'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthCard, PasswordInput, Alert } from '@/components/auth';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, loading } = useAuth();
  const supabase = createClient();

  const [isValidating, setIsValidating] = useState(true);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Check if session is already established (from /auth/confirm route)
   * The /auth/confirm route verifies the token_hash and establishes the session
   * before redirecting here.
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsValidating(true);

        // Check for error from /auth/confirm callback
        const error = searchParams.get('error');
        if (error) {
          const errorMessages: Record<string, string> = {
            'invalid_link': 'This password reset link is invalid or has expired',
            'verification_failed': 'Failed to verify reset link. Please try again',
            'missing_params': 'Invalid reset link. Please request a new one',
          };

          console.error('Error from auth/confirm:', error);
          setServerError(errorMessages[error] || 'An error occurred. Please request a new reset link.');
          setIsValidating(false);
          return;
        }

        // Check if user has active session (established by /auth/confirm)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setServerError('Unable to verify reset link. Please request a new one.');
          setIsValidating(false);
          return;
        }

        if (session?.user) {
          console.log('Session established for user:', session.user.email);
          setSessionEstablished(true);
        } else {
          console.error('No active session found');
          setServerError('No active session. Please click the link in your email again.');
        }

        setIsValidating(false);
      } catch (err) {
        console.error('Validation error:', err);
        setServerError('An error occurred. Please try again.');
        setIsValidating(false);
      }
    };

    checkSession();
  }, [searchParams, supabase.auth]);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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

    if (!sessionEstablished) {
      setServerError('Invalid session. Please request a new reset link.');
      return;
    }

    if (!validate()) return;

    try {
      await resetPassword({ password, confirmPassword });
      setSuccessMessage(
        'Password reset successful! Redirecting to login...'
      );

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Failed to reset password. Please try again.'
      );
    }
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex justify-center">
        <AuthCard title="Reset Password" subtitle="Validating your reset link...">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-4 text-sm text-gray-600">Please wait...</p>
          </div>
        </AuthCard>
      </div>
    );
  }

  // If session not established, show error state
  if (!sessionEstablished) {
    return (
      <div className="flex justify-center">
        <AuthCard title="Invalid Link" subtitle="This password reset link is invalid or has expired">
          <div className="space-y-4">
            <Alert
              variant="error"
              title="Invalid Reset Link"
              message={serverError || "This password reset link is invalid or has expired. Please request a new one."}
            />

            <Link href="/forgot-password">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
              >
                Request New Link
              </Button>
            </Link>

            <Link href="/login">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="w-full"
              >
                Back to Login
              </Button>
            </Link>
          </div>
        </AuthCard>
      </div>
    );
  }

  // Show password reset form
  return (
    <div className="flex justify-center">
      <AuthCard
        title="Reset Password"
        subtitle="Enter your new password"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Alerts */}
          {serverError && (
            <Alert
              variant="error"
              message={serverError}
              closeable
              onClose={() => setServerError('')}
            />
          )}

          {successMessage && (
            <Alert
              variant="success"
              title="Success!"
              message={successMessage}
            />
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              New Password <span className="text-danger">*</span>
            </label>
            <PasswordInput
              id="password"
              placeholder="Enter new password (min. 8 characters)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              error={errors.password}
              icon={Lock}
              iconPosition="left"
              disabled={loading || !!successMessage}
              autoFocus
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm New Password <span className="text-danger">*</span>
            </label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              error={errors.confirmPassword}
              icon={Lock}
              iconPosition="left"
              disabled={loading || !!successMessage}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading || !!successMessage}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </Button>

          {/* Back to Login */}
          <Link href="/login">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              Back to Login
            </Button>
          </Link>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Password Requirements:
            </p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                At least 8 characters long
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                Contains letters and numbers (recommended)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-success" />
                Avoid common passwords
              </li>
            </ul>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center">
        <AuthCard title="Reset Password" subtitle="Loading...">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
          </div>
        </AuthCard>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
