'use client';

import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Users,
  Calendar,
  FileText,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Dashboard"
      pageDescription="Medical Practice Dashboard"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Good day, Dr. {user?.last_name}!
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-teal" />
            Ready to see your patients
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            🚧 Dashboard Under Development
          </h3>
          <p className="text-green-800">
            Your doctor dashboard is being built. You'll soon be able to:
          </p>
          <ul className="mt-3 space-y-2 text-green-800">
            <li className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              View today's appointment queue in real-time
            </li>
            <li className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Access patient records during consultations
            </li>
            <li className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Create and update medical records
            </li>
            <li className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Complete appointments and log diagnoses
            </li>
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Today's Patients
                </p>
                <Users className="w-8 h-8 text-primary-teal" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  In Queue
                </p>
                <Clock className="w-8 h-8 text-warning" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Waiting</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Completed
                </p>
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Today</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Records
                </p>
                <FileText className="w-8 h-8 text-info" />
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Created today</p>
            </div>
          </div>
        </div>

        {/* Doctor Info */}
        <div className="bg-primary-teal/10 border border-primary-teal/30 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-primary-teal-dark mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Doctor Capabilities
          </h3>
          <p className="text-primary-teal-dark text-sm mb-3">
            As a Doctor, you have access to:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>• View today's appointment queue with real-time updates</li>
              <li>• Access all patient records during appointments</li>
              <li>• Create medical records using templates</li>
            </ul>
            <ul className="text-sm text-primary-teal-dark space-y-1">
              <li>• Enter diagnoses and treatment plans</li>
              <li>• Complete appointments and update status</li>
              <li>• Scan patient health card QR codes</li>
            </ul>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
