'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { AnnouncementsWidget } from '@/components/announcements';
import {
  Calendar,
  Heart,
  FileText,
  Bell,
  Activity,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  upcomingCount: number;
  medicalRecordsCount: number;
  completedVisits: number;
  unreadNotifications: number;
}

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: string;
  services: {
    name: string;
  };
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    upcomingCount: 0,
    medicalRecordsCount: 0,
    completedVisits: 0,
    unreadNotifications: 0,
  });
  const [upcomingAppointment, setUpcomingAppointment] = useState<UpcomingAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch appointments
      const appointmentsRes = await fetch('/api/appointments');
      if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments');

      const appointmentsData = await appointmentsRes.json();
      const appointments = appointmentsData.data || [];

      // Calculate stats
      const upcoming = appointments.filter((apt: any) => apt.status === 'scheduled');
      const completed = appointments.filter((apt: any) => apt.status === 'completed');

      // Find next upcoming appointment
      const nextAppointment = upcoming.length > 0
        ? upcoming.sort((a: any, b: any) =>
            new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
          )[0]
        : null;

      setUpcomingAppointment(nextAppointment);

      // Fetch medical records count
      let medicalRecordsCount = 0;
      try {
        const medicalRecordsRes = await fetch('/api/medical-records');
        if (medicalRecordsRes.ok) {
          const medicalRecordsData = await medicalRecordsRes.json();
          medicalRecordsCount = medicalRecordsData.data?.length || 0;
        }
      } catch (err) {
        console.error('Error fetching medical records:', err);
      }

      // Fetch unread notifications count
      let unreadNotifications = 0;
      try {
        const notificationsRes = await fetch('/api/notifications?unread=true');
        if (notificationsRes.ok) {
          const notificationsData = await notificationsRes.json();
          unreadNotifications = notificationsData.data?.length || 0;
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }

      setStats({
        upcomingCount: upcoming.length,
        medicalRecordsCount,
        completedVisits: completed.length,
        unreadNotifications,
      });

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Home"
      pageDescription="Your Personal Health Portal"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.first_name}!
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary-teal" />
              Your health, our priority
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-primary-teal transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error loading dashboard</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Account Status */}
        {user?.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
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

        {/* Upcoming Appointment Card */}
        {!loading && upcomingAppointment && (
          <div className="bg-gradient-to-r from-primary-teal to-teal-600 rounded-lg p-6 mb-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Upcoming Appointment</h3>
                </div>
                <p className="text-teal-50 text-sm mb-4">
                  {formatDate(upcomingAppointment.appointment_date)} at {formatTime(upcomingAppointment.appointment_time)}
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm text-teal-50 mb-1">Service</p>
                  <p className="font-semibold text-lg">{upcomingAppointment.services.name}</p>
                  <p className="text-sm text-teal-100 mt-2">Queue Number: #{upcomingAppointment.appointment_number}</p>
                </div>
              </div>
              <Link
                href="/patient/appointments"
                className="ml-4 bg-white text-primary-teal px-4 py-2 rounded-lg hover:bg-teal-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                View Details
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">
                  Upcoming
                </p>
                <Calendar className="w-8 h-8 text-primary-teal" />
              </div>
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{stats.upcomingCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Appointments</p>
                </>
              )}
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
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{stats.medicalRecordsCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Total records</p>
                </>
              )}
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
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{stats.unreadNotifications}</p>
                  <p className="text-xs text-gray-500 mt-1">Unread</p>
                </>
              )}
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
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedVisits}</p>
                  <p className="text-xs text-gray-500 mt-1">Appointments</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Announcements Widget */}
        <div className="mb-8">
          <AnnouncementsWidget limit={5} showViewAll={false} />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-50 rounded-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/patient/book-appointment"
              className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md block"
            >
              <Calendar className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">Book Appointment</p>
              <p className="text-sm text-gray-600 mt-1">Schedule your visit</p>
            </Link>
            <Link
              href="/patient/health-card"
              className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md block"
            >
              <Heart className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">My Health Card</p>
              <p className="text-sm text-gray-600 mt-1">View digital card</p>
            </Link>
            <Link
              href="/patient/medical-records"
              className="bg-white hover:bg-primary-teal/10 transition-colors rounded-lg p-4 text-left shadow hover:shadow-md block"
            >
              <FileText className="w-6 h-6 mb-2 text-primary-teal" />
              <p className="font-semibold text-gray-900">Medical Records</p>
              <p className="text-sm text-gray-600 mt-1">View your history</p>
            </Link>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
