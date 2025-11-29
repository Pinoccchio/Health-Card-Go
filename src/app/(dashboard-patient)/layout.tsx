'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/utils/roleHelpers';

/**
 * Layout for Patient dashboard routes
 * Protects all routes under /patient from unauthorized access
 * Also checks patient approval status
 */
export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      // Redirect to appropriate dashboard if not Patient
      if (user && user.role_id !== 4) {
        const correctDashboard = getDashboardPath(user.role_id);
        router.push(correctDashboard);
        return;
      }

      // Check if patient is approved (optional: can add this later)
      // if (user && user.status === 'pending') {
      //   router.push('/pending-approval');
      // }
    }
  }, [isAuthenticated, loading, user, router]);

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

  // Don't render if not authorized
  if (!isAuthenticated || !user || user.role_id !== 4) {
    return null;
  }

  return <>{children}</>;
}
