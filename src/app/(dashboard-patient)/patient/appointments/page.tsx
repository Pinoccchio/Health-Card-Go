'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { DocumentReviewPanel } from '@/components/healthcare-admin/DocumentReviewPanel';
import DownloadLabRequestButton from '@/components/patient/DownloadLabRequestButton';
import AppointmentStageTracker from '@/components/appointments/AppointmentStageTracker';
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
  UserCheck,
  ListChecks,
  Activity,
  Eye,
  PlayCircle,
  Download,
  Phone,
  Mail,
  Heart,
  Droplet,
} from 'lucide-react';
import { canCancelAppointment as canCancelByTimezone } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';
import { getAdminRoleLabel } from '@/lib/utils/serviceHelpers';
import { calculateAppointmentStatistics } from '@/lib/utils/appointmentStats';
import {
  TimeBlock,
  formatTimeBlock,
  getTimeBlockColor,
  TIME_BLOCKS,
  getHealthCardTypeInfo,
} from '@/types/appointment';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  time_block: TimeBlock;
  appointment_number: number;
  status: 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  appointment_stage?: 'check_in' | 'laboratory' | 'results' | 'checkup' | 'releasing' | null;
  reason?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  service_id?: number;
  lab_location?: 'inside_cho' | 'outside_cho';
  card_type?: 'food_handler' | 'non_food' | 'pink';
  has_medical_record?: boolean;
  services?: {
    id: number;
    name: string;
    category: string;
  } | null;
  completed_by_profile?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  patient?: {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    email: string | null;
    contact_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    barangay: string | null;
    blood_type: string | null;
    allergies: string | null;
    medical_conditions: string | null;
    current_medications: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_email: string | null;
  } | null;
  uploads?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    mime_type: string;
    file_size_bytes: number;
    verification_status: 'pending' | 'approved' | 'rejected';
  }>;
}

// Use centralized status config for consistent colors
const statusConfig = APPOINTMENT_STATUS_CONFIG;

export default function PatientAppointmentsPage() {
  const t = useTranslations('appointments_page');
  const tStatus = useTranslations('enums.appointment_status');
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'>('all');
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

  // Auto-sync selectedAppointment with fresh data when appointments update
  // This prevents stale data in drawer/modals after status changes
  useEffect(() => {
    if (isDrawerOpen && selectedAppointment) {
      const freshAppointment = appointments.find(apt => apt.id === selectedAppointment.id);
      if (freshAppointment && freshAppointment.status !== selectedAppointment.status) {
        console.log(`🔄 [STATE SYNC] Auto-updating selectedAppointment: ${selectedAppointment.status} → ${freshAppointment.status}`);
        setSelectedAppointment(freshAppointment);
      }
    }
  }, [appointments, isDrawerOpen, selectedAppointment?.id, selectedAppointment?.status]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();

      if (data.success) {
        setAppointments(data.data || []);
      } else {
        setError(data.error || t('errors.failed_to_load'));
      }
    } catch (err) {
      setError(t('errors.unexpected_error'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  // Use shared statistics calculation for consistency across all roles
  const statistics = useMemo(
    () => calculateAppointmentStatistics(appointments),
    [appointments]
  );

  const handleCancelClick = (appointmentId: string, appointmentDate: string, appointmentTime: string) => {
    // Check 24-hour policy (using Philippine timezone)
    if (!canCancelByTimezone(appointmentDate, appointmentTime)) {
      setError(t('errors.cancel_24h_minimum'));
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: reason }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment cancelled successfully');
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
        const errorMessage = data.error || t('errors.failed_to_load');
        toast.error(errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = t('errors.unexpected_error');
      toast.error(errorMessage);
      setError(errorMessage);
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
        {tStatus(status)}
      </span>
    );
  };

  // Define table columns (matches healthcare admin order)
  const tableColumns = [
    {
      header: t('table.queue_hash'),
      accessor: 'appointment_number',
      sortable: true,
      render: (value: number) => (
        <span className="font-mono font-semibold text-gray-900">#{value}</span>
      ),
    },
    {
      header: t('table.service'),
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
            <span className="text-gray-400 italic">{t('table.not_specified')}</span>
          )}
        </div>
      ),
    },
    {
      header: t('table.date'),
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
      header: t('table.time_block'),
      accessor: 'time_block',
      sortable: true,
      render: (value: TimeBlock, row: Appointment) => (
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(value)}`}>
            {value}
          </span>
          <span className="text-xs text-gray-600">
            {TIME_BLOCKS[value].timeRange}
          </span>
        </div>
      ),
    },
    {
      header: 'Lab Location',
      accessor: 'lab_location',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-gray-400 text-xs italic">N/A</span>;
        const isInsideCHO = value === 'inside_cho';
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            isInsideCHO
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {isInsideCHO ? 'Inside CHO' : 'Outside CHO'}
          </span>
        );
      },
    },
    {
      header: t('table.status'),
      accessor: 'status',
      sortable: true,
      render: (value: Appointment['status'], row: Appointment) => (
        <div className="flex flex-col gap-1">
          {/* Main Status Badge */}
          {getStatusBadge(value)}

          {/* Time Elapsed Badge - Waiting (checked_in) */}
          {value === 'checked_in' && row.checked_in_at && (
            <TimeElapsedBadge
              timestamp={row.checked_in_at}
              label="Waiting"
              type="waiting"
            />
          )}

          {/* Time Elapsed Badge - Consulting (in_progress) */}
          {value === 'in_progress' && row.started_at && (
            <TimeElapsedBadge
              timestamp={row.started_at}
              label="Consulting"
              type="consulting"
            />
          )}

          {/* Medical Record Created Badge */}
          {value === 'completed' && row.has_medical_record && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Medical Record Created
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      sortable: false,
      render: (value: string) => {
        if (!value) return <span className="text-gray-400 text-xs italic">N/A</span>;
        return (
          <div className="text-sm text-gray-700 line-clamp-2 max-w-xs">
            {value}
          </div>
        );
      },
    },
    {
      header: t('table.actions'),
      accessor: 'actions',
      render: (_: any, row: Appointment) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="inline-flex items-center px-3 py-1.5 bg-[#20C997] text-white text-xs font-medium rounded-md hover:bg-[#1AA179] transition-colors"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          View
        </button>
      ),
    },
  ];

  const filteredAppointments = appointments.filter((apt) => {
    // Always exclude draft appointments (they are only for document upload)
    if (apt.status === 'draft') return false;

    if (filter === 'all') return true;
    if (filter === 'pending') return apt.status === 'pending';
    if (filter === 'scheduled') return apt.status === 'scheduled';
    if (filter === 'checked_in') return apt.status === 'checked_in';
    if (filter === 'in_progress') return apt.status === 'in_progress';
    if (filter === 'completed') return apt.status === 'completed';
    if (filter === 'cancelled') return apt.status === 'cancelled';
    if (filter === 'no_show') return apt.status === 'no_show';
    if (filter === 'rescheduled') return apt.status === 'rescheduled';
    return true;
  });

  return (
    <DashboardLayout
      roleId={4}
      pageTitle={t('page_title')}
      pageDescription={t('page_description')}
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
            <p className="mt-2 text-sm text-gray-500">{t('loading')}</p>
          </div>
        ) : (
          <>
            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', labelKey: 'all', count: statistics.total, color: 'gray', icon: ListChecks },
                { id: 'pending', labelKey: 'pending', count: statistics.pending, color: 'orange', icon: Clock },
                { id: 'scheduled', labelKey: 'scheduled', count: statistics.scheduled, color: 'blue', icon: Calendar },
                { id: 'checked_in', labelKey: 'checked_in', count: statistics.checked_in, color: 'purple', icon: UserCheck },
                { id: 'in_progress', labelKey: 'in_progress', count: statistics.in_progress, color: 'amber', icon: Activity },
                { id: 'completed', labelKey: 'completed', count: statistics.completed, color: 'green', icon: CheckCircle },
                { id: 'cancelled', labelKey: 'cancelled', count: statistics.cancelled, color: 'gray', icon: XCircle },
                { id: 'no_show', labelKey: 'no_show', count: statistics.no_show, color: 'red', icon: AlertCircle },
              ].map((statusFilter) => {
                const Icon = statusFilter.icon;
                const isActive = filter === statusFilter.id;
                const colorClasses = {
                  gray: { bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-700', ring: 'ring-gray-400', activeBg: 'bg-gray-200' },
                  orange: { bg: 'bg-orange-100 hover:bg-orange-200', text: 'text-orange-700', ring: 'ring-orange-500', activeBg: 'bg-orange-200' },
                  blue: { bg: 'bg-blue-100 hover:bg-blue-200', text: 'text-blue-700', ring: 'ring-blue-500', activeBg: 'bg-blue-200' },
                  purple: { bg: 'bg-purple-100 hover:bg-purple-200', text: 'text-purple-700', ring: 'ring-purple-500', activeBg: 'bg-purple-200' },
                  amber: { bg: 'bg-amber-100 hover:bg-amber-200', text: 'text-amber-700', ring: 'ring-amber-500', activeBg: 'bg-amber-200' },
                  green: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-700', ring: 'ring-green-500', activeBg: 'bg-green-200' },
                  red: { bg: 'bg-red-100 hover:bg-red-200', text: 'text-red-700', ring: 'ring-red-500', activeBg: 'bg-red-200' },
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
                    <span>{t(`filters.${statusFilter.labelKey}`)}</span>
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
                {t('book_new_appointment')}
              </a>
            </div>

            {/* Enhanced Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={tableColumns}
                data={filteredAppointments}
                searchable
                searchPlaceholder={t('search_placeholder')}
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
            title={`${t('drawer.title')} #${selectedAppointment.appointment_number}`}
            subtitle={t('drawer.subtitle')}
            metadata={{
              createdOn: `${formatDate(selectedAppointment.appointment_date)} - ${formatTimeBlock(selectedAppointment.time_block)}`,
              status: selectedAppointment.status,
            }}
          >
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedAppointment.status)}

                  {/* Elapsed Time Badges */}
                  {selectedAppointment.status === 'checked_in' && selectedAppointment.checked_in_at && (
                    <TimeElapsedBadge
                      timestamp={selectedAppointment.checked_in_at}
                      label="Waiting"
                      type="waiting"
                    />
                  )}

                  {selectedAppointment.status === 'in_progress' && selectedAppointment.started_at && (
                    <TimeElapsedBadge
                      timestamp={selectedAppointment.started_at}
                      label="Consulting"
                      type="consulting"
                    />
                  )}
                </div>
              </div>

              {/* Appointment Stage Tracker - Only for HealthCard services */}
              <AppointmentStageTracker
                currentStage={selectedAppointment.appointment_stage || null}
                isHealthCardService={selectedAppointment.services?.category === 'healthcard'}
                isCheckedIn={selectedAppointment.status === 'checked_in' || selectedAppointment.status === 'in_progress' || selectedAppointment.status === 'completed'}
                isCompleted={selectedAppointment.status === 'completed'}
              />

              <div className="space-y-4">
                {/* Appointment Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('drawer.appointment_details')}
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('drawer.queue_number')}:</span>
                      <span className="font-mono font-semibold text-gray-900">#{selectedAppointment.appointment_number}</span>
                    </div>
                    {selectedAppointment.services && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('drawer.service')}:</span>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{selectedAppointment.services.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{selectedAppointment.services.category}</div>
                        </div>
                      </div>
                    )}
                    {selectedAppointment.card_type && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Health Card Type:</span>
                        <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${
                          getHealthCardTypeInfo(selectedAppointment.card_type).badgeColor
                        }`}>
                          {getHealthCardTypeInfo(selectedAppointment.card_type).label}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('drawer.date')}:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedAppointment.appointment_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('drawer.time_block')}:</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(selectedAppointment.time_block)}`}>
                          {selectedAppointment.time_block}
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatTimeBlock(selectedAppointment.time_block)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Information */}
                {selectedAppointment.patient && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Patient Information
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="font-medium text-gray-900 mt-1">
                            {selectedAppointment.patient.first_name || 'N/A'} {selectedAppointment.patient.last_name || ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Patient #</p>
                          <p className="font-medium text-gray-900 mt-1">{selectedAppointment.patient.patient_number || 'N/A'}</p>
                        </div>
                        {selectedAppointment.patient.email && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </p>
                            <p className="text-gray-900 mt-1">{selectedAppointment.patient.email}</p>
                          </div>
                        )}
                        {selectedAppointment.patient.contact_number && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              Contact
                            </p>
                            <p className="text-gray-900 mt-1">{selectedAppointment.patient.contact_number}</p>
                          </div>
                        )}
                        {selectedAppointment.patient.date_of_birth && (
                          <div>
                            <p className="text-xs text-gray-500">Date of Birth</p>
                            <p className="text-gray-900 mt-1">
                              {new Date(selectedAppointment.patient.date_of_birth).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patient.gender && (
                          <div>
                            <p className="text-xs text-gray-500">Gender</p>
                            <p className="text-gray-900 mt-1 capitalize">{selectedAppointment.patient.gender}</p>
                          </div>
                        )}
                        {selectedAppointment.patient.barangay && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              Barangay
                            </p>
                            <p className="text-gray-900 mt-1">{selectedAppointment.patient.barangay}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {selectedAppointment.patient && (selectedAppointment.patient.emergency_contact_name || selectedAppointment.patient.emergency_contact_phone || selectedAppointment.patient.emergency_contact_email) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Emergency Contact
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="space-y-2">
                        {selectedAppointment.patient.emergency_contact_name && (
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patient.emergency_contact_name}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patient.emergency_contact_phone && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              Phone
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patient.emergency_contact_phone}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patient.emergency_contact_email && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patient.emergency_contact_email}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Medical Information */}
                {selectedAppointment.patient && (selectedAppointment.patient.blood_type || selectedAppointment.patient.allergies || selectedAppointment.patient.medical_conditions || selectedAppointment.patient.current_medications) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Heart className="w-4 h-4 mr-2" />
                      Medical Information
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3 space-y-3">
                      {selectedAppointment.patient.blood_type && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Droplet className="w-3 h-3 mr-1" />
                            Blood Type
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patient.blood_type}
                          </p>
                        </div>
                      )}
                      {selectedAppointment.patient.allergies && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Allergies
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patient.allergies}
                          </p>
                        </div>
                      )}
                      {selectedAppointment.patient.medical_conditions && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            Medical Conditions
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patient.medical_conditions}
                          </p>
                        </div>
                      )}
                      {selectedAppointment.patient.current_medications && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            Current Medications
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patient.current_medications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Uploaded Documents - Only for HealthCard services */}
                {selectedAppointment.services?.category === 'healthcard' && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {selectedAppointment.status === 'pending' ? 'Document Verification' : 'Uploaded Documents'}
                    </h4>
                    <div className="bg-white rounded-md border border-gray-200 p-4">
                      <DocumentReviewPanel
                        appointmentId={selectedAppointment.id}
                        onVerificationComplete={fetchAppointments}
                      />
                    </div>
                  </div>
                )}

                {/* Lab Location */}
                {selectedAppointment.lab_location && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Lab Location
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${
                        selectedAppointment.lab_location === 'inside_cho'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedAppointment.lab_location === 'inside_cho'
                          ? 'Inside CHO Laboratory'
                          : 'Outside CHO Laboratory'}
                      </span>

                      {/* Download Lab Request Button - Only for Inside CHO */}
                      {selectedAppointment.lab_location === 'inside_cho' && selectedAppointment.card_type && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">
                            Download your laboratory request form:
                          </p>
                          <DownloadLabRequestButton
                            healthCardType={selectedAppointment.card_type}
                            variant="outline"
                            size="sm"
                            fullWidth
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reason for Visit */}
                {selectedAppointment.reason && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('drawer.reason_for_visit')}
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
                      {t('drawer.cancellation_reason')}
                    </h4>
                    <div className="bg-red-50 rounded-md p-3 text-sm text-red-700">
                      {selectedAppointment.cancellation_reason}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {(selectedAppointment.checked_in_at || selectedAppointment.started_at || selectedAppointment.completed_at) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {t('drawer.timeline')}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedAppointment.checked_in_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-gray-500">{t('drawer.checked_in')}:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.checked_in_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.started_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-500">{t('drawer.started')}:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.started_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.completed_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-gray-500">{t('drawer.completed')}:</span>
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
                  {t('drawer.view_status_history')}
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
                        {cancellingId === selectedAppointment.id ? t('drawer.cancelling') : t('drawer.cancel_appointment')}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 text-center">
                        {t('drawer.cannot_cancel_24h')}
                      </p>
                    )}
                  </div>
                )}

                {/* Book New Appointment Button for Rescheduled Appointments */}
                {selectedAppointment.status === 'rescheduled' && (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-medium">Reschedule Required:</span> Your appointment requires additional laboratory testing. Please book a new appointment for follow-up tests in approximately 1 week.
                      </p>
                    </div>
                    <a
                      href="/patient/book-appointment"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 font-medium text-sm transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Book New Appointment
                    </a>
                  </div>
                )}

                {/* Submit Feedback for Completed Appointments */}
                {selectedAppointment.status === 'completed' && (() => {
                  // Check if within 7-day window
                  const completedAt = selectedAppointment.completed_at ? new Date(selectedAppointment.completed_at) : null;
                  const now = new Date();
                  const daysSince = completedAt
                    ? Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const isEligible = daysSince !== null && daysSince <= 7;
                  const hasFeedback = selectedAppointment.has_feedback; // This field needs to be added to the appointment data

                  if (hasFeedback) {
                    return (
                      <div className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-md text-center">
                        <p className="text-sm font-medium text-green-700">{t('drawer.feedback_submitted')}</p>
                        <a
                          href="/patient/feedback"
                          className="text-xs text-green-600 hover:text-green-700 underline mt-1 inline-block"
                        >
                          {t('drawer.view_feedback')}
                        </a>
                      </div>
                    );
                  }

                  if (!isEligible) {
                    return (
                      <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-center">
                        <p className="text-xs text-gray-600">
                          {t('drawer.feedback_expired')}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <a
                      href={`/patient/feedback?appointment_id=${selectedAppointment.id}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 font-medium text-sm"
                    >
                      {t('drawer.submit_feedback')}
                      <span className="text-xs opacity-80">
                        ({t('drawer.days_remaining', { days: 7 - (daysSince || 0) })})
                      </span>
                    </a>
                  );
                })()}
              </div>
            </div>
          </Drawer>
        )}

        {/* Cancellation Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={handleCancelDialogClose}
          onConfirm={handleCancelConfirm}
          title={t('cancel_dialog.title')}
          message={
            appointmentToCancel
              ? t('cancel_dialog.message', {
                  date: formatDate(appointmentToCancel.date),
                  time: formatTime(appointmentToCancel.time)
                })
              : ''
          }
          confirmText={t('cancel_dialog.confirm')}
          cancelText={t('cancel_dialog.keep')}
          variant="danger"
          showReasonInput={true}
          reasonLabel={t('cancel_dialog.reason_label')}
          reasonPlaceholder={t('cancel_dialog.reason_placeholder')}
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
