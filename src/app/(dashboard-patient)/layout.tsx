'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/utils/roleHelpers';
import { ToastProvider } from '@/lib/contexts/ToastContext';

/**
 * Layout for Patient dashboard routes
 * Protects all routes under /patient from unauthorized access
 * Provides client-side redirect with visual feedback
 */
export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [locale, setLocale] = useState('en');
  const [messages, setMessages] = useState<any>(null);

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

  // Redirect unauthorized users to login or their correct dashboard
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (user) {
        // Check user status - only active users can access dashboard
        if (user.status !== 'active') {
          router.push('/login');
          return;
        }
        // Check role
        if (user.role_id !== 4) {
          router.push(getDashboardPath(user.role_id));
        }
      }
    }
  }, [isAuthenticated, loading, user, router]);

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

  // Show redirecting spinner instead of blank screen
  if (!isAuthenticated || !user || user.status !== 'active' || user.role_id !== 4) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ToastProvider>{children}</ToastProvider>
    </NextIntlClientProvider>
  );
}
