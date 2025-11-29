'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar, Clock, MapPin, FileText, AlertCircle, XCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  doctors?: {
    profiles: {
      first_name: string;
      last_name: string;
      specialization?: string;
    };
  };
}

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800',
    icon: Calendar,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-purple-100 text-purple-800',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Loader2,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
};

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();

      if (data.success) {
        setAppointments(data.data || []);
      } else {
        setError(data.error || 'Failed to load appointments');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string, appointmentDate: string, appointmentTime: string) => {
    // Check 24-hour policy
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      setError('Appointments can only be cancelled at least 24 hours in advance');
      return;
    }

    const reason = window.prompt('Please provide a reason for cancellation (optional):');

    setCancellingId(appointmentId);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh appointments list
        await fetchAppointments();
      } else {
        setError(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const canCancelAppointment = (appointment: Appointment) => {
    if (appointment.status !== 'scheduled') return false;

    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursDifference >= 24;
  };

  const isUpcoming = (appointment: Appointment) => {
    if (appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show') {
      return false;
    }
    const appointmentDate = new Date(appointment.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  };

  const filteredAppointments = appointments.filter((apt) =>
    filter === 'upcoming' ? isUpcoming(apt) : !isUpcoming(apt)
  );

  const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Queue #{appointment.appointment_number}
            </h3>
            <StatusBadge status={appointment.status} />
          </div>
          <div className="flex flex-col gap-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              {formatDate(appointment.appointment_date)}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              {formatTime(appointment.appointment_time)}
            </div>
            {appointment.doctors && (
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2 text-gray-400" />
                Dr. {appointment.doctors.profiles.first_name} {appointment.doctors.profiles.last_name}
                {appointment.doctors.profiles.specialization && (
                  <span className="ml-1 text-gray-500">
                    ({appointment.doctors.profiles.specialization})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {appointment.reason && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-xs font-medium text-gray-500 mb-1">Reason for Visit</p>
          <p className="text-sm text-gray-700">{appointment.reason}</p>
        </div>
      )}

      {appointment.cancellation_reason && (
        <div className="mb-4 p-3 bg-red-50 rounded-md">
          <p className="text-xs font-medium text-red-600 mb-1">Cancellation Reason</p>
          <p className="text-sm text-red-700">{appointment.cancellation_reason}</p>
        </div>
      )}

      {appointment.status === 'scheduled' && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          {canCancelAppointment(appointment) ? (
            <button
              onClick={() =>
                handleCancel(
                  appointment.id,
                  appointment.appointment_date,
                  appointment.appointment_time
                )
              }
              disabled={cancellingId === appointment.id}
              className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingId === appointment.id ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          ) : (
            <p className="text-xs text-gray-500">
              Cannot cancel (less than 24 hours before appointment)
            </p>
          )}
        </div>
      )}

      {appointment.status === 'completed' && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Completed on {appointment.completed_at && new Date(appointment.completed_at).toLocaleDateString()}
          </p>
          <a
            href="/patient/feedback"
            className="text-sm text-primary-teal hover:text-primary-teal/80 font-medium"
          >
            Submit Feedback
          </a>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Appointments"
      pageDescription="View and manage your appointments"
    >
      <Container size="full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'upcoming'
                  ? 'bg-primary-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'past'
                  ? 'bg-primary-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past
            </button>
          </div>

          <a
            href="/patient/book-appointment"
            className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium"
          >
            Book New Appointment
          </a>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {filter} appointments
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming'
                ? "You don't have any upcoming appointments scheduled."
                : "You don't have any past appointments."}
            </p>
            {filter === 'upcoming' && (
              <a
                href="/patient/book-appointment"
                className="inline-block px-6 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium"
              >
                Book Your First Appointment
              </a>
            )}
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
