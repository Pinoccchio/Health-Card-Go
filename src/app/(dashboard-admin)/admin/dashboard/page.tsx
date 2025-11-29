'use client';

import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Users,
  Calendar,
  Shield,
  MessageSquare,
  BarChart3,
  MapPin,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Dashboard"
      pageDescription="Welcome to the HealthCard Super Admin Dashboard"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-teal" />
            Manage the entire HealthCard system
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚧 Dashboard Under Development
          </h3>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <Users className="w-8 h-8 text-primary-teal" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Doctors</p>
                <Users className="w-8 h-8 text-cta-orange" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Medical staff</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  HC Admins
                </p>
                <Shield className="w-8 h-8 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">5 categories</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Appointments
                </p>
                <Calendar className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Feedback</p>
                <MessageSquare className="w-8 h-8 text-warning" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Patient reviews</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Barangays</p>
                <MapPin className="w-8 h-8 text-primary-teal-dark" />
              </div>
              <p className="text-2xl font-bold text-gray-900">44</p>
              <p className="text-xs text-gray-500 mt-1">Covered areas</p>
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>• Create and manage Healthcare Admins (all categories)</li>
              <li>• Create and manage Doctors</li>
              <li>• Approve or reject patient registrations</li>
              <li>• View all appointments and medical records</li>
            </ul>
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>
                • Access disease surveillance with predictive analytics (SARIMA)
              </li>
              <li>• View and respond to patient feedback (exclusive access)</li>
              <li>• Generate combined reports from all admin categories</li>
              <li>• Manage barangays and system configuration</li>
            </ul>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
