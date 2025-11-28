'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { Calendar, FileText, Heart, Bell } from 'lucide-react';

export default function PatientDashboard() {
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
              <p className="text-sm text-gray-600 mt-1">Patient Dashboard</p>
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
            The patient dashboard is currently being built. Soon you'll be able
            to:
          </p>
          <ul className="mt-3 space-y-2 text-blue-800">
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Book and manage appointments
            </li>
            <li className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              View your digital health card
            </li>
            <li className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Access your medical records
            </li>
            <li className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Receive appointment reminders
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Upcoming Appointments
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Calendar className="w-12 h-12 text-primary-teal" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Medical Records
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <FileText className="w-12 h-12 text-cta-orange" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Health Card Status
                </p>
                <p className="text-sm font-semibold text-success mt-2">
                  Active
                </p>
              </div>
              <Heart className="w-12 h-12 text-success" />
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
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium">Patient</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium capitalize">{user?.status}</p>
            </div>
            {user?.barangay_name && (
              <div>
                <p className="text-sm text-gray-600">Barangay</p>
                <p className="font-medium">{user.barangay_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
