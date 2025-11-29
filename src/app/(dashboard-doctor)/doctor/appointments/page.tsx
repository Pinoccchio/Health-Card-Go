'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MapPin,
  Phone,
} from 'lucide-react';

interface DetailedAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show';
  reason?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      contact_number?: string;
      barangay_id: number;
      barangays?: {
        name: string;
      };
    };
  };
}

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800', icon: Calendar },
  checked_in: { label: 'Checked In', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<DetailedAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<DetailedAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/appointments?date=${today}`);
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

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchAppointments();
        setSelectedAppointment(null);
      } else {
        setError(data.error || `Failed to update status to ${newStatus}`);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  const filteredAppointments = appointments.filter((apt) =>
    filter === 'all' ? true : apt.status === filter
  );

  const StatusBadge = ({ status }: { status: DetailedAppointment['status'] }) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Appointments"
      pageDescription="Manage today's appointment queue"
    >
      <Container size="full">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {formatDate(new Date().toISOString().split('T')[0])}
            </h2>
            <p className="text-sm text-gray-600">{appointments.length} total appointments</p>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'scheduled', 'checked_in', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-teal text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointments List */}
            <div className="lg:col-span-2">
              {filteredAppointments.length > 0 ? (
                <div className="space-y-3">
                  {filteredAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => setSelectedAppointment(appointment)}
                      className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedAppointment?.id === appointment.id
                          ? 'border-primary-teal shadow-md'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-teal/10 rounded-full flex items-center justify-center">
                            <span className="font-bold text-primary-teal">#{appointment.appointment_number}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {appointment.patients.profiles.first_name} {appointment.patients.profiles.last_name}
                            </h4>
                            <p className="text-xs text-gray-500">Patient #{appointment.patients.patient_number}</p>
                          </div>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(appointment.appointment_time)}
                        </div>
                        {appointment.patients.profiles.barangays && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {appointment.patients.profiles.barangays.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments</h3>
                  <p className="text-gray-600">No appointments match the selected filter.</p>
                </div>
              )}
            </div>

            {/* Appointment Details */}
            <div className="lg:col-span-1">
              {selectedAppointment ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                      <StatusBadge status={selectedAppointment.status} />
                    </div>
                    <p className="text-sm text-gray-600">Queue #{selectedAppointment.appointment_number}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Patient Information
                      </h4>
                      <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                        <p className="font-medium text-gray-900">
                          {selectedAppointment.patients.profiles.first_name}{' '}
                          {selectedAppointment.patients.profiles.last_name}
                        </p>
                        <p className="text-gray-600">Patient #{selectedAppointment.patients.patient_number}</p>
                        {selectedAppointment.patients.profiles.contact_number && (
                          <p className="text-gray-600 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {selectedAppointment.patients.profiles.contact_number}
                          </p>
                        )}
                        {selectedAppointment.patients.profiles.barangays && (
                          <p className="text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {selectedAppointment.patients.profiles.barangays.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Appointment Time
                      </h4>
                      <div className="bg-gray-50 rounded-md p-3 text-sm">
                        <p className="font-medium text-gray-900">{formatTime(selectedAppointment.appointment_time)}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {formatDate(selectedAppointment.appointment_date)}
                        </p>
                      </div>
                    </div>

                    {selectedAppointment.reason && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Reason for Visit
                        </h4>
                        <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                          {selectedAppointment.reason}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-4 space-y-2">
                      {selectedAppointment.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'checked_in')}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Check In Patient'}
                        </button>
                      )}

                      {selectedAppointment.status === 'checked_in' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'in_progress')}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Start Consultation'}
                        </button>
                      )}

                      {selectedAppointment.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : 'Mark as Completed'}
                          </button>
                          <p className="text-xs text-gray-500 text-center">
                            Complete after creating medical record
                          </p>
                        </>
                      )}

                      {selectedAppointment.status === 'scheduled' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedAppointment.id, 'no_show')}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Mark as No Show'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Selection</h3>
                  <p className="text-sm text-gray-600">
                    Select an appointment to view details and manage status
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
