'use client';

import { useState, useEffect } from 'react';
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
  AlertCircle,
  RefreshCw,
  UserCircle,
} from 'lucide-react';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';

interface QueueAppointment {
  id: string;
  appointment_number: number;
  appointment_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show';
  reason?: string;
  checked_in_at?: string;
  started_at?: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
      contact_number?: string;
      barangays?: {
        name: string;
      };
    };
  };
}

interface Stats {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
}

// Use centralized status config for consistent colors
const statusConfig = APPOINTMENT_STATUS_CONFIG;

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueAppointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, waiting: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTodaysQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodaysQueue = async () => {
    try {
      // Fetch all upcoming appointments (not just today)
      const response = await fetch(`/api/appointments`);
      const data = await response.json();

      if (data.success) {
        const appointments = data.data || [];
        setQueue(appointments);

        // Calculate stats
        const newStats = {
          total: appointments.length,
          waiting: appointments.filter((a: QueueAppointment) =>
            a.status === 'scheduled' || a.status === 'checked_in'
          ).length,
          inProgress: appointments.filter((a: QueueAppointment) =>
            a.status === 'in_progress'
          ).length,
          completed: appointments.filter((a: QueueAppointment) =>
            a.status === 'completed'
          ).length,
        };
        setStats(newStats);
      } else {
        setError(data.error || 'Failed to load queue');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'checked_in' }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTodaysQueue();
      } else {
        setError(data.error || 'Failed to check in patient');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartConsultation = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTodaysQueue();
      } else {
        setError(data.error || 'Failed to start consultation');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const QueueCard = ({ appointment }: { appointment: QueueAppointment }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-teal/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary-teal">
              #{appointment.appointment_number}
            </span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">
              {appointment.patients?.profiles?.first_name || 'Unknown'} {appointment.patients?.profiles?.last_name || 'Patient'}
            </h4>
            <p className="text-xs text-gray-500">
              Patient #{appointment.patients?.patient_number || 'N/A'}
            </p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[appointment.status].color}`}>
          {statusConfig[appointment.status].label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1" />
          {formatTime(appointment.appointment_time)}
        </div>
        {appointment.patients?.profiles?.barangays && (
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {appointment.patients.profiles.barangays.name}
          </div>
        )}
      </div>

      {appointment.reason && (
        <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
          <span className="font-medium">Reason: </span>
          {appointment.reason}
        </div>
      )}

      <div className="flex gap-2">
        {appointment.status === 'scheduled' && (
          <button
            onClick={() => handleCheckIn(appointment.id)}
            disabled={actionLoading === appointment.id}
            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
          >
            {actionLoading === appointment.id ? 'Checking in...' : 'Check In'}
          </button>
        )}
        {appointment.status === 'checked_in' && (
          <button
            onClick={() => handleStartConsultation(appointment.id)}
            disabled={actionLoading === appointment.id}
            className="flex-1 px-3 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium disabled:opacity-50"
          >
            {actionLoading === appointment.id ? 'Starting...' : 'Start Consultation'}
          </button>
        )}
        {appointment.status === 'in_progress' && (
          <a
            href={`/doctor/appointments?appointment_id=${appointment.id}`}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium text-center"
          >
            Continue & Complete
          </a>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Dashboard"
      pageDescription="Medical Practice Dashboard"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Good day, Dr. {user?.last_name}!
            </h2>
            <p className="text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-teal" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <button
            onClick={fetchTodaysQueue}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Today's Patients</p>
              <Users className="w-8 h-8 text-primary-teal" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Scheduled</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">In Queue</p>
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.waiting}</p>
            <p className="text-xs text-gray-500 mt-1">Waiting</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <Activity className="w-8 h-8 text-info" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.inProgress}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </div>
        </div>

        {/* Today's Queue */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-teal" />
              Today's Queue
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Real-time appointment queue (auto-refreshes every 30 seconds)
            </p>
          </div>

          <div className="p-6">
            {loading && queue.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading today's queue...</p>
              </div>
            ) : queue.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queue.map((appointment) => (
                  <QueueCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  No appointments today
                </h4>
                <p className="text-gray-600">
                  There are no scheduled appointments for today.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
