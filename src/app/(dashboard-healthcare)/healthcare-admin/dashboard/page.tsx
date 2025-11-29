'use client';

import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Users,
  Calendar,
  Megaphone,
  Shield,
  ClipboardList,
} from 'lucide-react';

export default function HealthcareAdminDashboard() {
  const { user } = useAuth();

  const getCategoryName = (category: string | undefined) => {
    const names: Record<string, string> = {
      healthcard: 'Health Card',
      hiv: 'HIV',
      pregnancy: 'Pregnancy',
      general_admin: 'General Admin',
      laboratory: 'Laboratory',
    };
    return category ? names[category] || category : 'Not specified';
  };

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Dashboard"
      pageDescription="Healthcare Administration Dashboard"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-teal" />
            {getCategoryName(user?.admin_category)} Administrator
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-teal-900 mb-2">
            🚧 Dashboard Under Development
          </h3>
          <p className="text-teal-800">
            Your healthcare admin dashboard is being built. You'll soon be able to:
          </p>
          <ul className="mt-3 space-y-2 text-teal-800">
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Manage appointments for your category
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              View and manage patients in your area
            </li>
            <li className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Post announcements for patients
            </li>
            <li className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Generate category-specific reports
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <Users className="w-8 h-8 text-primary-teal" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">In your category</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Today's Appointments
                </p>
                <Calendar className="w-8 h-8 text-cta-orange" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled today</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Check-ins
                </p>
                <ClipboardList className="w-8 h-8 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Patients added</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Announcements
                </p>
                <Megaphone className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Active posts</p>
            </div>
          </div>
        </div>

        {/* Category Info */}
        <div className="bg-primary-teal/10 border border-primary-teal/30 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-primary-teal-dark mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Role: {getCategoryName(user?.admin_category)} Administrator
          </h3>
          <p className="text-primary-teal-dark text-sm mb-3">
            As a Healthcare Administrator, you can:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>• Approve patient registrations</li>
              <li>• Manage appointments in your category</li>
              <li>• Add walk-in patients (General Admin only)</li>
            </ul>
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>• View and update patient records</li>
              <li>• Post announcements for patients</li>
              <li>• Generate reports for your category</li>
            </ul>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
