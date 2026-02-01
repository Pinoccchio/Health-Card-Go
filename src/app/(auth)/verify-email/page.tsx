'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AuthCard, Alert } from '@/components/auth';
import { Button } from '@/components/ui';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status'); // 'success' | 'error' | 'pending'

  // Default to pending (for patient registration)
  const verificationStatus = status || 'pending';

  return (
    <div className="flex justify-center">
      {verificationStatus === 'success' && (
        <AuthCard
          title="Email Verified!"
          subtitle="Your email has been successfully verified"
          showLogo={false}
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
            </div>

            <Alert
              variant="success"
              title="Verification Successful"
              message="Your email address has been verified. You can now log in to your account."
            />

            <Link href="/login">
              <Button variant="primary" size="lg" className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        </AuthCard>
      )}

      {verificationStatus === 'error' && (
        <AuthCard
          title="Verification Failed"
          subtitle="We couldn't verify your email address"
          showLogo={false}
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-danger" />
              </div>
            </div>

            <Alert
              variant="error"
              title="Verification Failed"
              message="The verification link is invalid or has expired. Please request a new verification email."
            />

            <Button variant="primary" size="lg" className="w-full">
              Resend Verification Email
            </Button>

            <Link href="/login">
              <Button variant="ghost" size="lg" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </AuthCard>
      )}

      {verificationStatus === 'pending' && (
        <AuthCard
          title="Registration Successful!"
          subtitle="Your account has been activated"
          showLogo={false}
        >
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
            </div>

            <Alert
              variant="success"
              title="Account Activated"
              message="Thank you for registering! Your account has been automatically activated. You can now log in and start booking appointments."
            />

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary-teal mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-1">What can you do now?</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Log in to access your patient dashboard</li>
                    <li>• Book appointments with healthcare providers</li>
                    <li>• View your health card</li>
                    <li>• Manage your profile and preferences</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full">
                  Go to Login
                </Button>
              </Link>

              <Link href="/">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              Have questions?{' '}
              <a
                href="mailto:support@healthcard.com"
                className="font-medium text-primary-teal hover:text-primary-teal-dark transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </AuthCard>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center">
        <AuthCard title="Loading..." subtitle="Please wait">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
          </div>
        </AuthCard>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
