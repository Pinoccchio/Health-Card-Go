'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import {
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  XCircle,
  CheckCircle,
  Loader2,
  History,
  MapPin,
  User,
  ListChecks,
  Activity,
  Eye,
} from 'lucide-react';
import { canCancelAppointment as canCancelByTimezone } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';
import { getAdminRoleLabel } from '@/lib/utils/serviceHelpers';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  service_id?: number;
  services?: {
    id: number;
    name: string;
    category: string;
  } | null;
  doctors?: {
    profiles: {
      first_name: string;
      last_name: string;
      specialization?: string;
    };
  } | null;
}

// Use centralized status config for consistent colors
const statusConfig = APPOINTMENT_STATUS_CONFIG;

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Cancel confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<{
    id: string;
    date: string;
    time: string;
  } | null>(null);

  // Status history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryAppointmentId, setSelectedHistoryAppointmentId] = useState<string | null>(null);

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

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const upcoming = appointments.filter(a =>
      (a.status === 'scheduled' || a.status === 'pending') &&
      new Date(a.appointment_date) >= new Date(new Date().setHours(0, 0, 0, 0))
    ).length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const no_show = appointments.filter(a => a.status === 'no_show').length;

    return { total, pending, upcoming, completed, cancelled, no_show };
  }, [appointments]);

  const handleCancelClick = (appointmentId: string, appointmentDate: string, appointmentTime: string) => {
    // Check 24-hour policy (using Philippine timezone)
    if (!canCancelByTimezone(appointmentDate, appointmentTime)) {
      setError('Appointments can only be cancelled at least 24 hours in advance');
      return;
    }

    // Open confirmation dialog
    setAppointmentToCancel({
      id: appointmentId,
      date: appointmentDate,
      time: appointmentTime,
    });
    setShowCancelDialog(true);
    setError('');
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!appointmentToCancel) return;

    setCancellingId(appointmentToCancel.id);

    try {
      const response = await fetch(`/api/appointments/${appointmentToCancel.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh appointments list
        await fetchAppointments();
        setShowCancelDialog(false);
        setAppointmentToCancel(null);
        // Close drawer if it was the selected appointment
        if (selectedAppointment?.id === appointmentToCancel.id) {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }
      } else {
        setError(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelDialogClose = () => {
    if (cancellingId) return; // Prevent closing while cancelling
    setShowCancelDialog(false);
    setAppointmentToCancel(null);
  };

  const handleViewHistory = (appointmentId: string) => {
    setSelectedHistoryAppointmentId(appointmentId);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAppointment(null);
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
    if (appointment.status !== 'scheduled' && appointment.status !== 'pending') return false;

    // Use Philippine timezone for 24-hour cancellation rule
    return canCancelByTimezone(appointment.appointment_date, appointment.appointment_time);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Define table columns
  const tableColumns = [
    {
      header: 'Queue #',
      accessor: 'appointment_number',
      sortable: true,
      render: (value: number) => (
        <span className="font-mono font-semibold text-gray-900">#{value}</span>
      ),
    },
    {
      header: 'Service',
      accessor: 'service',
      sortable: false,
      render: (_: any, row: Appointment) => (
        <div className="text-sm">
          {row.services ? (
            <>
              <div className="font-medium text-gray-900">{row.services.name}</div>
              <div className="text-xs text-gray-500 capitalize">{row.services.category}</div>
            </>
          ) : (
            <span className="text-gray-400 italic">Not specified</span>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'appointment_date',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Calendar className="w-3 h-3 text-gray-400" />
          {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ),
    },
    {
      header: 'Time',
      accessor: 'appointment_time',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Clock className="w-3 h-3 text-gray-400" />
          {formatTime(value)}
        </div>
      ),
    },
    {
      header: 'Doctor',
      accessor: 'doctor',
      sortable: false,
      render: (_: any, row: Appointment) => (
        <div className="text-sm">
          {row.status === 'cancelled' || row.status === 'no_show' ? (
            <span className="text-gray-400 italic text-xs">N/A</span>
          ) : row.doctors ? (
            <div className="text-gray-900">
              <div className="font-medium">Dr. {row.doctors.profiles.first_name} {row.doctors.profiles.last_name}</div>
              {row.doctors.profiles.specialization && (
                <div className="text-xs text-gray-500">{row.doctors.profiles.specialization}</div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                <Clock className="w-3 h-3 mr-1" />
                Awaiting Assignment
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: Appointment['status']) => getStatusBadge(value),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: Appointment) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="inline-flex items-center px-3 py-1.5 bg-[#20C997] text-white text-xs font-medium rounded-md hover:bg-[#1AA179] transition-colors"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          View Details
        </button>
      ),
    },
  ];

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return apt.status === 'pending';
    if (filter === 'upcoming') {
      return (apt.status === 'scheduled' || apt.status === 'pending') &&
        new Date(apt.appointment_date) >= new Date(new Date().setHours(0, 0, 0, 0));
    }
    if (filter === 'completed') return apt.status === 'completed';
    if (filter === 'cancelled') return apt.status === 'cancelled' || apt.status === 'no_show';
    return true;
  });

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Appointments"
      pageDescription="View and manage your appointments"
    >
      <Container size="full">
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
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <ListChecks className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Upcoming</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.upcoming}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.cancelled}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">No Show</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.no_show}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All Appointments', count: statistics.total, color: 'gray', icon: ListChecks },
                { id: 'pending', label: 'Pending', count: statistics.pending, color: 'orange', icon: Clock },
                { id: 'upcoming', label: 'Upcoming', count: statistics.upcoming, color: 'blue', icon: Calendar },
                { id: 'completed', label: 'Completed', count: statistics.completed, color: 'green', icon: CheckCircle },
                { id: 'cancelled', label: 'Cancelled', count: statistics.cancelled, color: 'gray', icon: XCircle },
              ].map((statusFilter) => {
                const Icon = statusFilter.icon;
                const isActive = filter === statusFilter.id;
                const colorClasses = {
                  gray: { bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-700', ring: 'ring-gray-400', activeBg: 'bg-gray-200' },
                  orange: { bg: 'bg-orange-100 hover:bg-orange-200', text: 'text-orange-700', ring: 'ring-orange-500', activeBg: 'bg-orange-200' },
                  blue: { bg: 'bg-blue-100 hover:bg-blue-200', text: 'text-blue-700', ring: 'ring-blue-500', activeBg: 'bg-blue-200' },
                  green: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-700', ring: 'ring-green-500', activeBg: 'bg-green-200' },
                };
                const colors = colorClasses[statusFilter.color as keyof typeof colorClasses];

                return (
                  <button
                    key={statusFilter.id}
                    onClick={() => setFilter(statusFilter.id as typeof filter)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
                      ${isActive ? `${colors.activeBg} ${colors.text} ring-2 ${colors.ring} shadow-md` : `${colors.bg} ${colors.text}`}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{statusFilter.label}</span>
                    <span className={`
                      ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white/80' : 'bg-white/60'}
                    `}>
                      {statusFilter.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mb-4">
              <a
                href="/patient/book-appointment"
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium"
              >
                Book New Appointment
              </a>
            </div>

            {/* Enhanced Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={tableColumns}
                data={filteredAppointments}
                searchable
                searchPlaceholder="Search by queue number, date, or doctor..."
                paginated
                pageSize={15}
              />
            </div>
          </>
        )}

        {/* Drawer for Appointment Details */}
        {selectedAppointment && (
          <Drawer
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            size="xl"
            title={`Appointment #${selectedAppointment.appointment_number}`}
            subtitle={`My Appointment`}
            metadata={{
              createdOn: `${formatDate(selectedAppointment.appointment_date)} at ${formatTime(selectedAppointment.appointment_time)}`,
              status: selectedAppointment.status,
            }}
          >
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedAppointment.status)}
                </div>
              </div>

              <div className="space-y-4">
                {/* Appointment Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Appointment Details
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Queue Number:</span>
                      <span className="font-mono font-semibold text-gray-900">#{selectedAppointment.appointment_number}</span>
                    </div>
                    {selectedAppointment.services && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{selectedAppointment.services.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{selectedAppointment.services.category}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedAppointment.appointment_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium text-gray-900">{formatTime(selectedAppointment.appointment_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Doctor Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'no_show'
                      ? 'Doctor'
                      : selectedAppointment.doctors ? 'Assigned Doctor' : 'Doctor Assignment'}
                  </h4>
                  {selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'no_show' ? (
                    <div className="bg-gray-50 rounded-md p-3 text-sm">
                      <p className="text-gray-400 italic">N/A</p>
                    </div>
                  ) : selectedAppointment.doctors ? (
                    <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                      <p className="font-medium text-gray-900">
                        Dr. {selectedAppointment.doctors.profiles.first_name} {selectedAppointment.doctors.profiles.last_name}
                      </p>
                      {selectedAppointment.doctors.profiles.specialization && (
                        <p className="text-gray-600">{selectedAppointment.doctors.profiles.specialization}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                              Awaiting Doctor Assignment
                            </span>
                          </div>
                          <p className="text-sm text-orange-800">
                            {selectedAppointment.services && (
                              <>
                                Our <strong>{getAdminRoleLabel(selectedAppointment.services.category)}</strong> is reviewing your appointment and will assign an appropriate doctor based on your needs and availability.
                              </>
                            )}
                            {!selectedAppointment.services && (
                              <>A healthcare administrator is reviewing your appointment and will assign an appropriate doctor.</>
                            )}
                          </p>
                          <p className="text-xs text-orange-700 mt-2">
                            You'll receive a notification once a doctor is assigned (usually within 24 hours).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reason for Visit */}
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

                {/* Cancellation Reason */}
                {selectedAppointment.cancellation_reason && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancellation Reason
                    </h4>
                    <div className="bg-red-50 rounded-md p-3 text-sm text-red-700">
                      {selectedAppointment.cancellation_reason}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                {(selectedAppointment.checked_in_at || selectedAppointment.started_at || selectedAppointment.completed_at) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Timeline
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                      {selectedAppointment.checked_in_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Checked In:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.checked_in_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.started_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Started:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.started_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.completed_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.completed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                {/* View Status History */}
                <button
                  onClick={() => handleViewHistory(selectedAppointment.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary-teal hover:text-primary-teal/80 font-medium border border-primary-teal/20 rounded-md hover:bg-primary-teal/5 transition-colors"
                >
                  <History className="w-4 h-4" />
                  View Status History
                </button>

                {/* Cancel Appointment Button */}
                {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'pending') && (
                  <div>
                    {canCancelAppointment(selectedAppointment) ? (
                      <button
                        onClick={() =>
                          handleCancelClick(
                            selectedAppointment.id,
                            selectedAppointment.appointment_date,
                            selectedAppointment.appointment_time
                          )
                        }
                        disabled={cancellingId === selectedAppointment.id}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === selectedAppointment.id ? 'Cancelling...' : 'Cancel Appointment'}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 text-center">
                        Cannot cancel (less than 24 hours before appointment)
                      </p>
                    )}
                  </div>
                )}

                {/* Submit Feedback for Completed Appointments */}
                {selectedAppointment.status === 'completed' && (
                  <a
                    href="/patient/feedback"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 font-medium text-sm"
                  >
                    Submit Feedback
                  </a>
                )}
              </div>
            </div>
          </Drawer>
        )}

        {/* Cancellation Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={handleCancelDialogClose}
          onConfirm={handleCancelConfirm}
          title="Cancel Appointment"
          message={
            appointmentToCancel
              ? `Are you sure you want to cancel your appointment on ${formatDate(appointmentToCancel.date)} at ${formatTime(appointmentToCancel.time)}?`
              : ''
          }
          confirmText="Cancel Appointment"
          cancelText="Keep Appointment"
          variant="danger"
          showReasonInput={true}
          reasonLabel="Reason for cancellation (optional)"
          reasonPlaceholder="Please let us know why you're cancelling..."
          isLoading={!!cancellingId}
        />

        {/* Status History Modal (Read-only for patients) */}
        <StatusHistoryModal
          appointmentId={selectedHistoryAppointmentId || ''}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          canRevert={false}
        />
      </Container>
    </DashboardLayout>
  );
}
