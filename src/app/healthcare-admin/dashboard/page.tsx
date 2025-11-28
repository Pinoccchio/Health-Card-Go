'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Users, Calendar, CheckCircle, Megaphone } from 'lucide-react';
import { ADMIN_CATEGORY_NAMES } from '@/types/auth';

export default function HealthcareAdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user?.first_name}!
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Healthcare Admin Dashboard
                {user?.admin_category && ` • ${ADMIN_CATEGORY_NAMES[user.admin_category]}`}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🚧 Dashboard Under Development
          </h2>
          <p className="text-blue-800">
            The healthcare admin dashboard is currently being built. Soon you'll
            be able to:
          </p>
          <ul className="mt-3 space-y-2 text-blue-800">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Approve patient registrations
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage patients in your category
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              View and manage appointments
            </li>
            <li className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Create announcements for patients
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Users className="w-12 h-12 text-primary-teal" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Appointments
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Calendar className="w-12 h-12 text-cta-orange" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Approvals
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <CheckCircle className="w-12 h-12 text-warning" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Check-in Count
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Megaphone className="w-12 h-12 text-success" />
            </div>
          </div>
        </div>

        {/* Category Info */}
        {user?.admin_category && (
          <div className="bg-primary-teal/10 border border-primary-teal/30 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-primary-teal-dark mb-2">
              Your Admin Category
            </h3>
            <p className="text-primary-teal-dark">
              <strong>{ADMIN_CATEGORY_NAMES[user.admin_category]}</strong>
            </p>
            <p className="text-sm text-primary-teal-dark mt-2">
              You can only view and manage patients and appointments related to
              your category
              {user.admin_category === 'general_admin' &&
                ', except you can see ALL categories as General Admin'}.
            </p>
          </div>
        )}

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium">Healthcare Admin</p>
            </div>
            {user?.admin_category && (
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium">
                  {ADMIN_CATEGORY_NAMES[user.admin_category]}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{user?.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
