'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Users, Calendar, ClipboardList, Stethoscope } from 'lucide-react';

export default function DoctorDashboard() {
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
                Welcome, Dr. {user?.last_name}!
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Doctor Dashboard
                {user?.specialization && ` • ${user.specialization}`}
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
            The doctor dashboard is currently being built. Soon you'll be able
            to:
          </p>
          <ul className="mt-3 space-y-2 text-blue-800">
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              View today's appointment queue
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Access patient records during consultations
            </li>
            <li className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Create and update medical records
            </li>
            <li className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Complete appointments and diagnoses
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Queue
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Calendar className="w-12 h-12 text-primary-teal" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Checked In</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Users className="w-12 h-12 text-cta-orange" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <ClipboardList className="w-12 h-12 text-success" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Stethoscope className="w-12 h-12 text-warning" />
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">
                Dr. {user?.first_name} {user?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium">Doctor</p>
            </div>
            {user?.specialization && (
              <div>
                <p className="text-sm text-gray-600">Specialization</p>
                <p className="font-medium">{user.specialization}</p>
              </div>
            )}
            {user?.license_number && (
              <div>
                <p className="text-sm text-gray-600">License Number</p>
                <p className="font-medium">{user.license_number}</p>
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
