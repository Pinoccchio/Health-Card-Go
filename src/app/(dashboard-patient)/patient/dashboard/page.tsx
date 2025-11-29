'use client';

import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Calendar,
  Heart,
  FileText,
  Bell,
  Activity,
  ClipboardList,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Home"
      pageDescription="Your Personal Health Portal"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user?.first_name}!
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary-teal" />
            Your health, our priority
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            🚧 Patient Portal Under Development
          </h3>
          <p className="text-purple-800">
            Your patient portal is being built. You'll soon be able to:
          </p>
          <ul className="mt-3 space-y-2 text-purple-800">
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Book and manage appointments online
            </li>
            <li className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Access your digital health card with QR code
            </li>
            <li className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              View your medical records and history
            </li>
            <li className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Receive appointment reminders and notifications
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Upcoming
                </p>
                <Calendar className="w-8 h-8 text-primary-teal" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Appointments</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Medical Records
                </p>
                <FileText className="w-8 h-8 text-cta-orange" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Total records</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Notifications
                </p>
                <Bell className="w-8 h-8 text-warning" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Unread</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Completed
                </p>
                <ClipboardList className="w-8 h-8 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Appointments</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-lg p-8 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md">
              <Calendar className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">Book Appointment</p>
              <p className="text-sm text-gray-600 mt-1">Schedule your visit</p>
            </button>
            <button className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md">
              <Heart className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">My Health Card</p>
              <p className="text-sm text-gray-600 mt-1">View digital card</p>
            </button>
            <button className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md">
              <FileText className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">Medical Records</p>
              <p className="text-sm text-gray-600 mt-1">View your history</p>
            </button>
          </div>
        </div>

        {/* Account Status */}
        {user?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Account Pending Approval
            </h3>
            <p className="text-yellow-800 text-sm">
              Your account is currently pending approval. Once approved by an admin,
              you'll be able to book appointments and access all features.
            </p>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
