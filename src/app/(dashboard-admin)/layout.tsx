'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/utils/roleHelpers';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { AnnouncementProvider } from '@/lib/contexts/AnnouncementContext';
import { FeedbackProvider } from '@/lib/contexts/FeedbackContext';

/**
 * Layout for Super Admin dashboard routes
 * Protects all routes under /admin from unauthorized access
 * Provides client-side redirect with visual feedback
 * NOTE: No multi-language support - admins use English only
 */
export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

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
        if (user.role_id !== 1) {
          router.push(getDashboardPath(user.role_id));
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user]); // router excluded per JobSync pattern

  // Show loading spinner while checking auth
  if (loading) {
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
  if (!isAuthenticated || !user || user.status !== 'active' || user.role_id !== 1) {
    return null;
  }

  return (
    <ToastProvider>
      <AnnouncementProvider roleId={1}>
        <FeedbackProvider>
          {children}
        </FeedbackProvider>
      </AnnouncementProvider>
    </ToastProvider>
  );
}
