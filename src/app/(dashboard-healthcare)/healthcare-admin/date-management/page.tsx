'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ServiceDateManager } from '@/components/healthcare-admin/ServiceDateManager';
import {
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';

interface ServiceInfo {
  id: number;
  name: string;
  category: string;
}

export default function DateManagementPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<ServiceInfo | null>(null);

  useEffect(() => {
    async function fetchServiceInfo() {
      // Wait for auth to finish loading
      if (authLoading) return;

      // Check if user is logged in
      if (!user?.id) {
        setError('Please log in to access this page');
        setLoading(false);
        return;
      }

      // Check if user is a healthcare admin
      if (user.role_id !== 2) {
        setError('Only Healthcare Admins can manage service date availability');
        setLoading(false);
        return;
      }

      // Check if user has an assigned service
      if (!user.assigned_service_id) {
        setError('You do not have an assigned service. Contact the Super Admin to assign you to a service.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch service details
        const serviceResponse = await fetch(`/api/services/${user.assigned_service_id}`);
        if (!serviceResponse.ok) {
          throw new Error('Failed to fetch service details');
        }

        const serviceData = await serviceResponse.json();
        setService(serviceData.data);
      } catch (err) {
        console.error('Error fetching service info:', err);
        setError('Failed to load service information');
      } finally {
        setLoading(false);
      }
    }

    fetchServiceInfo();
  }, [user?.id, user?.role_id, user?.assigned_service_id, authLoading]);

  // Show loading while auth is loading
  if (authLoading || loading) {
    return (
      <DashboardLayout
        roleId={user?.role_id || 2}
        pageTitle="Date Management"
        pageDescription="Manage service availability"
      >
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        roleId={user?.role_id || 2}
        pageTitle="Date Management"
        pageDescription="Manage service availability"
      >
        <Container>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Management</h2>
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={user?.role_id || 2}
      pageTitle="Date Management"
      pageDescription="Control which dates are available for patient bookings"
    >
      <Container>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Date Management</h1>
              <p className="text-gray-500 mt-1">
                Control which dates are available for patient bookings
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">How Date Availability Works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>
                    <strong>All dates are blocked by default</strong> - Patients cannot book until you open dates
                  </li>
                  <li>
                    <strong>Green dates</strong> are available for booking
                  </li>
                  <li>
                    <strong>Red dates</strong> are blocked - click to open them
                  </li>
                  <li>
                    Weekends and holidays cannot be modified
                  </li>
                  <li>
                    Use &quot;Open All Weekdays&quot; to quickly enable the entire month
                  </li>
                  <li>
                    Existing appointments are not affected when blocking a date
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Service Date Manager */}
          {service && user?.assigned_service_id && (
            <ServiceDateManager
              serviceId={user.assigned_service_id}
              serviceName={service.name}
              isReadOnly={false}
            />
          )}
        </div>
      </Container>
    </DashboardLayout>
  );
}
