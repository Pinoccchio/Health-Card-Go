'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthCard, FormField, Alert } from '@/components/auth';
import { Button } from '@/components/ui';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Validate email
   */
  const validate = (): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validate()) return;

    try {
      await forgotPassword({ email });
      setSuccessMessage(
        'If an account with this email exists, you will receive a password reset link shortly.'
      );
      setEmail(''); // Clear form
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to send reset email. Please try again.'
      );
    }
  };

  return (
    <div className="flex justify-center">
      <AuthCard
        title="Forgot Password?"
        subtitle="Enter your email to receive a password reset link"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Alerts */}
          {error && (
            <Alert
              variant="error"
              message={error}
              closeable
              onClose={() => setError('')}
            />
          )}

          {successMessage && (
            <Alert
              variant="success"
              title="Email Sent!"
              message={successMessage}
            />
          )}

          {/* Email Field */}
          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            icon={Mail}
            iconPosition="left"
            required
            disabled={loading || !!successMessage}
            autoComplete="email"
            autoFocus
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading || !!successMessage}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          {/* Back to Login */}
          <Link href="/login">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full"
              icon={ArrowLeft}
              disabled={loading}
            >
              Back to Login
            </Button>
          </Link>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> For security reasons, we will send a
              password reset link to the email address on file if an account
              exists. The link will expire in 1 hour.
            </p>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}
