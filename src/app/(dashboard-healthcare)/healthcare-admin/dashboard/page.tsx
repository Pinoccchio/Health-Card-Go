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
  Megaphone,
  Shield,
  UserPlus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  patients: {
    total: number;
    active: number;
    suspended: number;
    rejected: number;
  };
  appointments: {
    total: number;
    today: number;
    scheduled: number;
    completed: number;
  };
  announcements: {
    total: number;
    active: number;
  };
}

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function HealthcareAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    patients: { total: 0, active: 0, suspended: 0, rejected: 0 },
    appointments: { total: 0, today: 0, scheduled: 0, completed: 0 },
    announcements: { total: 0, active: 0 },
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [serviceName, setServiceName] = useState<string>('Loading...');
  const [requiresAppointment, setRequiresAppointment] = useState<boolean>(true); // Default to true for Pattern 2

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

      // Fetch user's assigned service name and properties if available
      if (user?.assigned_service_id) {
        try {
          const serviceRes = await fetch(`/api/services/${user.assigned_service_id}`);
          const serviceData = await serviceRes.json();
          if (serviceData.success && serviceData.data) {
            setServiceName(serviceData.data.name);
            setRequiresAppointment(serviceData.data.requires_appointment ?? true);
          } else {
            setServiceName('Service Not Found');
          }
        } catch (err) {
          console.error('Error fetching service name:', err);
          setServiceName('Unknown Service');
        }
      } else {
        setServiceName('No Service Assigned');
      }

      // Fetch patients statistics
      // Use different endpoint based on user role
      // Super Admin: all patients globally
      // Healthcare Admin: only patients from their assigned service
      const patientsEndpoint = user?.role === 'super_admin'
        ? '/api/admin/patients?limit=1000'
        : '/api/healthcare-admin/patients?limit=1000';

      const patientsRes = await fetch(patientsEndpoint);
      const patientsData = await patientsRes.json();

      // Fetch appointments statistics
      const appointmentsRes = await fetch('/api/appointments?limit=1000');
      const appointmentsData = await appointmentsRes.json();

      // Fetch announcements statistics
      const announcementsRes = await fetch('/api/announcements?limit=1000&include_inactive=true');
      const announcementsData = await announcementsRes.json();

      if (patientsData.success && appointmentsData.success && announcementsData.success) {
        const patients = patientsData.data || [];
        const appointments = appointmentsData.data || [];
        const announcements = announcementsData.data || [];

        // Calculate patient stats
        const patientStats = {
          total: patients.length,
          active: patients.filter((p: any) => p.status === 'active').length,
          suspended: patients.filter((p: any) => p.status === 'suspended').length,
          rejected: patients.filter((p: any) => p.status === 'rejected').length,
        };

        // Calculate appointment stats
        const today = format(new Date(), 'yyyy-MM-dd');
        const appointmentStats = {
          total: appointments.length,
          today: appointments.filter((a: any) => a.appointment_date === today).length,
          scheduled: appointments.filter((a: any) => a.status === 'scheduled').length,
          completed: appointments.filter((a: any) => a.status === 'completed').length,
        };

        // Calculate announcement stats
        const announcementStats = {
          total: announcements.length,
          active: announcements.filter((a: any) => a.is_active === true).length,
        };

        setStats({
          patients: patientStats,
          appointments: appointmentStats,
          announcements: announcementStats,
        });

        // Get upcoming appointments
        const upcoming = appointments
          .filter((a: any) => ['scheduled', 'verified'].includes(a.status))
          .sort((a: any, b: any) => {
            const dateA = new Date(`${a.appointment_date} ${a.appointment_time}`);
            const dateB = new Date(`${b.appointment_date} ${b.appointment_time}`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
        setUpcomingAppointments(upcoming);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Dashboard error:', err);
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
        roleId={user?.role_id || 2}
        pageTitle="Dashboard"
        pageDescription="Healthcare Administration Dashboard"
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
      roleId={user?.role_id || 2}
      pageTitle="Dashboard"
      pageDescription="Healthcare Administration Dashboard"
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
              {serviceName} Administrator
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Total Patients */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Patients</p>
                    <Users className="w-8 h-8 text-primary-teal" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.patients.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.patients.active} active, {stats.patients.suspended} suspended, {stats.patients.rejected} rejected
                  </p>
                </div>
              </div>

              {/* Total Appointments */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                    <Calendar className="w-8 h-8 text-info" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.appointments.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.appointments.scheduled} scheduled, {stats.appointments.completed} completed
                  </p>
                </div>
              </div>

              {/* Today's Appointments */}
              <Link
                href="/healthcare-admin/appointments?date=today"
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                    <Clock className="w-8 h-8 text-warning" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.appointments.today}</p>
                  <p className="text-xs text-primary-teal mt-1 group-hover:underline flex items-center gap-1">
                    View today's schedule
                    <ArrowRight className="w-3 h-3" />
                  </p>
                </div>
              </Link>

              {/* Active Announcements */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Active Announcements</p>
                    <Megaphone className="w-8 h-8 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.announcements.active}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {stats.announcements.total} total
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requiresAppointment ? (
                  <Link
                    href="/healthcare-admin/appointments"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                  >
                    <Calendar className="w-8 h-8 text-info group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="font-medium text-gray-900">View Appointments</p>
                      <p className="text-xs text-gray-500">Manage schedule</p>
                    </div>
                  </Link>
                ) : (
                  <Link
                    href="/healthcare-admin/walk-in"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                  >
                    <UserPlus className="w-8 h-8 text-info group-hover:scale-110 transition-transform" />
                    <div>
                      <p className="font-medium text-gray-900">View Walk-in Queue</p>
                      <p className="text-xs text-gray-500">Manage walk-ins</p>
                    </div>
                  </Link>
                )}

                <Link
                  href="/healthcare-admin/announcements"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Megaphone className="w-8 h-8 text-success group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">View Announcements</p>
                    <p className="text-xs text-gray-500">Read updates</p>
                  </div>
                </Link>

                <Link
                  href="/healthcare-admin/patients"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <Users className="w-8 h-8 text-primary-teal group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-gray-900">All Patients</p>
                    <p className="text-xs text-gray-500">View directory</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            {requiresAppointment && (
              <div className="grid grid-cols-1 gap-8 mb-8">
                {/* Upcoming Appointments */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-info" />
                      Upcoming Appointments
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {upcomingAppointments.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p>No upcoming appointments</p>
                      </div>
                    ) : (
                      upcomingAppointments.map((appointment) => (
                        <Link
                          key={appointment.id}
                          href={`/healthcare-admin/appointments`}
                          className="p-4 hover:bg-gray-50 transition-colors block"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                #{appointment.appointment_number} -{' '}
                                {appointment.patients.profiles.first_name}{' '}
                                {appointment.patients.profiles.last_name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {appointment.patients.patient_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {upcomingAppointments.length > 0 && (
                    <div className="p-4 border-t border-gray-200">
                      <Link
                        href="/healthcare-admin/appointments"
                        className="text-sm text-primary-teal hover:underline flex items-center justify-center gap-1"
                      >
                        View all appointments
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Announcements - Full Width */}
            <AnnouncementsWidget
              limit={3}
              targetAudience="healthcare_admin"
              showViewAll={true}
              viewAllLink="/healthcare-admin/announcements"
            />
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
