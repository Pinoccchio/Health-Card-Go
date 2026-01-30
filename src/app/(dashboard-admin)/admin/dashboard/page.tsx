'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { AnnouncementsWidget } from '@/components/announcements/AnnouncementsWidget';
import {
  Users,
  Calendar,
  Shield,
  MessageSquare,
  BarChart3,
  MapPin,
  RefreshCw,
  AlertCircle,
  Stethoscope,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface DashboardStats {
  patients: {
    total: number;
    active: number;
    suspended: number;
  };
  healthcareAdmins: {
    total: number;
    assigned: number;
  };
  staff: {
    total: number;
  };
  appointments: {
    total: number;
    today: number;
    scheduled: number;
    completed: number;
  };
  feedback: {
    total: number;
    pending: number;
  };
  barangays: {
    total: number;
  };
  services: {
    total: number;
    active: number;
  };
  diseases: {
    total: number;
    active: number;
  };
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    patients: { total: 0, active: 0, suspended: 0 },
    healthcareAdmins: { total: 0, assigned: 0 },
    staff: { total: 0 },
    appointments: { total: 0, today: 0, scheduled: 0, completed: 0 },
    feedback: { total: 0, pending: 0 },
    barangays: { total: 0 },
    services: { total: 0, active: 0 },
    diseases: { total: 0, active: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const res = await fetch('/api/admin/dashboard/stats');
      const result = await res.json();

      if (result.success) {
        setStats(result.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  if (error) {
    return (
      <DashboardLayout
        roleId={1}
        pageTitle="Dashboard"
        pageDescription="Super Admin Dashboard"
      >
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Dashboard"
      pageDescription="Welcome to the HealthCard Super Admin Dashboard"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.first_name}!
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-teal" />
              Manage the entire HealthCard system
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          // Loading Skeletons
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {/* Total Patients */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      Total Patients
                    </p>
                    <Users className="w-8 h-8 text-primary-teal" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.patients.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.patients.active} active, {stats.patients.suspended} suspended
                  </p>
                </div>
              </div>

              {/* HC Admins */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      HC Admins
                    </p>
                    <Shield className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.healthcareAdmins.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.healthcareAdmins.assigned} assigned to services
                  </p>
                </div>
              </div>

              {/* Healthcare Staff */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Healthcare Staff</p>
                    <Stethoscope className="w-8 h-8 text-cta-orange" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.staff.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Disease surveillance</p>
                </div>
              </div>

              {/* Appointments */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">
                      Appointments
                    </p>
                    <Calendar className="w-8 h-8 text-info" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.appointments.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.appointments.completed} completed
                  </p>
                </div>
              </div>

              {/* Feedback */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                    <MessageSquare className="w-8 h-8 text-warning" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.feedback.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.feedback.pending} pending responses
                  </p>
                </div>
              </div>

              {/* Barangays */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Barangays</p>
                    <MapPin className="w-8 h-8 text-primary-teal-dark" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.barangays.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Covered areas</p>
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Services</p>
                    <Activity className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.services.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.services.active} active
                  </p>
                </div>
              </div>

              {/* Disease Cases */}
              <Link
                href="/admin/disease-surveillance"
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Disease Cases</p>
                    <BarChart3 className="w-8 h-8 text-error" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.diseases.total}</p>
                  <p className="text-xs text-primary-teal mt-1 group-hover:underline flex items-center gap-1">
                    View surveillance
                    <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/users"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Users className="w-8 h-8 text-primary-teal group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Manage Users</p>
                    <p className="text-xs text-gray-500">All user accounts</p>
                  </div>
                </Link>

                <Link
                  href="/admin/appointments"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Calendar className="w-8 h-8 text-info group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">View Appointments</p>
                    <p className="text-xs text-gray-500">All services</p>
                  </div>
                </Link>

                <Link
                  href="/admin/feedback"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <MessageSquare className="w-8 h-8 text-warning group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Patient Feedback</p>
                    <p className="text-xs text-gray-500">
                      {stats.feedback.pending} pending
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/disease-surveillance"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <BarChart3 className="w-8 h-8 text-error group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Disease Surveillance</p>
                    <p className="text-xs text-gray-500">
                      {stats.diseases.active} active cases
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/reports"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <BarChart3 className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Reports</p>
                    <p className="text-xs text-gray-500">Generate insights</p>
                  </div>
                </Link>

                <Link
                  href="/admin/barangays"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <MapPin className="w-8 h-8 text-primary-teal-dark group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Manage Barangays</p>
                    <p className="text-xs text-gray-500">{stats.barangays.total} total</p>
                  </div>
                </Link>

                <Link
                  href="/admin/services"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Activity className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Manage Services</p>
                    <p className="text-xs text-gray-500">{stats.services.total} services</p>
                  </div>
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Shield className="w-8 h-8 text-info group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">Audit Logs</p>
                    <p className="text-xs text-gray-500">System activity</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Announcements */}
            <AnnouncementsWidget
              limit={3}
              targetAudience="super_admin"
              showViewAll={true}
              viewAllLink="/admin/announcements"
            />
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
