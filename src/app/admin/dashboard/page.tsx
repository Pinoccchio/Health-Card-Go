'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui';
import { useRouter } from 'next/link';
import {
  Users,
  Calendar,
  Shield,
  MessageSquare,
  BarChart3,
  MapPin,
} from 'lucide-react';

export default function SuperAdminDashboard() {
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
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-teal" />
                Super Admin Dashboard
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
            The super admin dashboard is currently being built. Soon you'll have
            full access to:
          </p>
          <ul className="mt-3 space-y-2 text-blue-800">
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage all users (Admins, Doctors, Patients)
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              View all appointments across categories
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Disease surveillance dashboard with heatmaps
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              View and respond to patient feedback
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Generate comprehensive reports
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              System configuration and settings
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <Users className="w-8 h-8 text-primary-teal" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Doctors</p>
                <Users className="w-8 h-8 text-cta-orange" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  HC Admins
                </p>
                <Shield className="w-8 h-8 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Appointments
                </p>
                <Calendar className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Feedback</p>
                <MessageSquare className="w-8 h-8 text-warning" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Barangays</p>
                <MapPin className="w-8 h-8 text-primary-teal-dark" />
              </div>
              <p className="text-2xl font-bold text-gray-900">44</p>
            </div>
          </div>
        </div>

        {/* Admin Capabilities */}
        <div className="bg-primary-teal/10 border border-primary-teal/30 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-primary-teal-dark mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Super Admin Capabilities
          </h3>
          <p className="text-primary-teal-dark text-sm">
            As a Super Admin, you have full access to all system features and
            data. You can:
          </p>
          <ul className="mt-3 text-sm text-primary-teal-dark space-y-1">
            <li>• Create and manage Healthcare Admins (all categories)</li>
            <li>• Create and manage Doctors</li>
            <li>• Approve or reject patient registrations</li>
            <li>• View all appointments and medical records</li>
            <li>
              • Access disease surveillance with predictive analytics (SARIMA)
            </li>
            <li>• View and respond to patient feedback (exclusive access)</li>
            <li>• Generate combined reports from all admin categories</li>
            <li>• Manage barangays and system configuration</li>
          </ul>
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
                {user?.first_name} {user?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-medium">Super Admin</p>
            </div>
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
