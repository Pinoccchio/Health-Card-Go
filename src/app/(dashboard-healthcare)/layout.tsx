'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/utils/roleHelpers';

/**
 * Layout for Healthcare Admin dashboard routes
 * Protects all routes under /healthcare-admin from unauthorized access
 * Provides client-side redirect with visual feedback
 */
export default function HealthcareAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState<any>(null);

  // Load locale and messages
  useEffect(() => {
    const loadLocaleAndMessages = async () => {
      try {
        const response = await fetch('/api/locale');
        if (response.ok) {
          const data = await response.json();
          setLocale(data.locale);
          const messagesModule = await import(`../../../messages/${data.locale}.json`);
          setMessages(messagesModule.default);
        }
      } catch (error) {
        console.error('Failed to load locale/messages:', error);
        const messagesModule = await import(`../../../messages/en.json`);
        setMessages(messagesModule.default);
      }
    };
    loadLocaleAndMessages();
  }, []);

  // JOBSYNC PATTERN: Redirect unauthorized users to login or their correct dashboard
  // Uses router.push() for soft navigation (no full page reload)
  // Excludes router from dependencies to prevent instability
  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // User loaded - check status and role
      if (user) {
        // Inactive user - redirect to login
        if (user.status !== 'active') {
          router.push('/login');
          return;
        }
        // Wrong role - redirect to correct dashboard
        if (user.role_id !== 2) {
          router.push(getDashboardPath(user.role_id));
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user]); // router excluded per JobSync pattern

  // Show loading spinner while checking auth or loading messages
  if (loading || !messages) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // JOBSYNC PATTERN: Return null for unauthorized users (no spinner loop)
  if (!isAuthenticated || !user || user.status !== 'active' || user.role_id !== 2) {
    return null;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
