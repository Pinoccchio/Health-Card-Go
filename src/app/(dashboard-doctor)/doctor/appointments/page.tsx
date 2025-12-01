'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { MedicalContextPanel } from '@/components/appointments/MedicalContextPanel';
import { MedicalRecordStatusBadge } from '@/components/medical-records/MedicalRecordStatusBadge';
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
  Mail,
  Heart,
  Droplet,
  History,
  RotateCcw,
  Eye,
  UserCheck,
  Activity,
  ListChecks,
} from 'lucide-react';
import { formatPhilippineDateLong, getPhilippineTime } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';

interface DetailedAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'no_show';
  reason?: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  has_medical_record?: boolean; // Added for medical record status
  patients: {
    id: string;
    patient_number: string;
    medical_history?: any;
    allergies?: any;
    current_medications?: any;
    accessibility_requirements?: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      contact_number?: string;
      date_of_birth?: string;
      gender?: 'male' | 'female' | 'other';
      barangay_id: number;
      emergency_contact?: {
        name: string;
        phone: string;
        email?: string;
      };
      barangays?: {
        name: string;
      };
    };
  };
}

// Use centralized status config for consistent colors
const statusConfig = APPOINTMENT_STATUS_CONFIG;

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<DetailedAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<DetailedAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed'>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Confirmation dialog states
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    appointmentId: string;
    status: string;
    patientName: string;
  } | null>(null);

  // Medical records check for undo validation
  const [hasMedicalRecords, setHasMedicalRecords] = useState<boolean | null>(null);

  // Medical records check for completion warning
  const [completionHasMedicalRecord, setCompletionHasMedicalRecord] = useState<boolean>(true);

  // Status history and reversion states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<{
    historyId: string;
    targetStatus: string;
    appointmentId: string;
  } | null>(null);
  const [lastHistoryEntry, setLastHistoryEntry] = useState<{
    id: string;
    from_status: string | null;
  } | null>(null);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch last history entry when appointment is selected
  useEffect(() => {
    if (selectedAppointment) {
      fetchLastHistoryEntry(selectedAppointment.id);
    } else {
      setLastHistoryEntry(null);
    }
  }, [selectedAppointment?.id]);

  // Check for medical records when completed appointment is selected
  useEffect(() => {
    if (selectedAppointment?.status === 'completed') {
      checkMedicalRecords(selectedAppointment.id);
    } else {
      setHasMedicalRecords(null);
    }
  }, [selectedAppointment?.id, selectedAppointment?.status]);

  const checkMedicalRecords = async (appointmentId: string) => {
    try {
      // First try: Check for medical records linked to this appointment
      const response = await fetch(`/api/medical-records?appointment_id=${appointmentId}`);
      const data = await response.json();

      if (data.success && data.has_records) {
        setHasMedicalRecords(true);
        return;
      }

      // Fallback: Check for unlinked medical records created on the same day
      // This catches records created via patient search that weren't linked to the appointment
      if (selectedAppointment && data.success && !data.has_records) {
        const patientId = selectedAppointment.patients.id;
        const appointmentDate = selectedAppointment.appointment_date;

        const fallbackResponse = await fetch(
          `/api/medical-records?patient_id=${patientId}&date=${appointmentDate}`
        );
        const fallbackData = await fallbackResponse.json();

        if (fallbackData.success) {
          setHasMedicalRecords(fallbackData.has_records);
        } else {
          setHasMedicalRecords(false);
        }
      } else if (data.success) {
        setHasMedicalRecords(false);
      } else {
        console.error('Failed to check medical records:', data.error);
        setHasMedicalRecords(null);
      }
    } catch (err) {
      console.error('Failed to check medical records:', err);
      setHasMedicalRecords(null);
    }
  };

  const fetchLastHistoryEntry = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/history`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        // Get the most recent ORIGINAL status change entry that led TO the current status
        // API returns history in descending order (newest first), so .find() gets the most recent entry
        const currentStatus = selectedAppointment?.status;
        const lastEntry = data.data.find((entry: any) =>
          entry.change_type === 'status_change' &&
          entry.from_status !== null &&
          entry.is_reversion !== true &&  // Skip reversion entries - we want the ORIGINAL status change
          entry.to_status === currentStatus  // Find the entry that changed TO the current status
        );
        if (lastEntry) {
          setLastHistoryEntry({
            id: lastEntry.id,
            from_status: lastEntry.from_status,
          });
        } else {
          setLastHistoryEntry(null);
        }
      } else {
        setLastHistoryEntry(null);
      }
    } catch (err) {
      console.error('Failed to fetch last history entry:', err);
      setLastHistoryEntry(null);
    }
  };

  const fetchAppointments = async () => {
    try {
      // Fetch all appointments with a high limit to get everything (not paginated)
      const response = await fetch(`/api/appointments?limit=1000`);
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

  const handleUpdateStatus = async (appointmentId: string, newStatus: string, reason?: string) => {
    setActionLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
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

  // Handler to check for medical records before completion
  const handleCheckAndComplete = async (appointmentId: string, patientName: string) => {
    try {
      // Check if medical record exists for this appointment
      const response = await fetch(`/api/medical-records?appointment_id=${appointmentId}`);
      const data = await response.json();

      setPendingAction({
        appointmentId: appointmentId,
        status: 'completed',
        patientName: patientName,
      });

      // Store whether medical record exists for dialog variant selection
      if (data.success && data.has_records) {
        // Medical record exists - show normal completion dialog
        setCompletionHasMedicalRecord(true);
        setShowCompleteDialog(true);
      } else {
        // No medical record - show warning variant completion dialog
        setCompletionHasMedicalRecord(false);
        setShowCompleteDialog(true);
      }
    } catch (err) {
      console.error('Failed to check medical records:', err);
      // On error, assume no medical record and show warning
      setPendingAction({
        appointmentId: appointmentId,
        status: 'completed',
        patientName: patientName,
      });
      setCompletionHasMedicalRecord(false);
      setShowCompleteDialog(true);
    }
  };

  // Confirmation handlers
  const handleConfirmAction = async (reason?: string) => {
    if (!pendingAction) return;

    await handleUpdateStatus(pendingAction.appointmentId, pendingAction.status, reason);

    // Close all dialogs
    setShowNoShowDialog(false);
    setShowCompleteDialog(false);
    setShowStartDialog(false);
    setShowCheckInDialog(false);
    setPendingAction(null);
  };

  const handleCancelAction = () => {
    setShowNoShowDialog(false);
    setShowCompleteDialog(false);
    setShowStartDialog(false);
    setShowCheckInDialog(false);
    setPendingAction(null);
  };

  // Handler for viewing history
  const handleViewHistory = () => {
    if (selectedAppointment) {
      setShowHistoryModal(true);
    }
  };

  // Handler for initiating reversion from history modal
  const handleInitiateRevert = (historyId: string, targetStatus: string) => {
    if (!selectedAppointment) return;

    setPendingRevert({
      historyId,
      targetStatus,
      appointmentId: selectedAppointment.id,
    });
    setShowHistoryModal(false);
    setShowRevertDialog(true);
  };

  // Handler for quick undo (no dialog)
  const handleQuickUndo = () => {
    if (!selectedAppointment || !lastHistoryEntry) return;

    setPendingRevert({
      historyId: lastHistoryEntry.id,
      targetStatus: lastHistoryEntry.from_status || '',
      appointmentId: selectedAppointment.id,
    });
    setShowRevertDialog(true);
  };

  // Handler for confirming reversion
  const handleConfirmRevert = async (reason?: string) => {
    if (!pendingRevert) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/appointments/${pendingRevert.appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revert_to_history_id: pendingRevert.historyId,
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchAppointments();
        setShowRevertDialog(false);
        setPendingRevert(null);
        setSelectedAppointment(null);
      } else {
        setError(data.error || 'Failed to revert status');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Use Philippine timezone for date formatting
    return formatPhilippineDateLong(dateString);
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      checked_in: appointments.filter(a => a.status === 'checked_in').length,
      in_progress: appointments.filter(a => a.status === 'in_progress').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      no_show: appointments.filter(a => a.status === 'no_show').length,
    };
  }, [appointments]);

  // Handler for opening appointment details drawer
  const handleViewDetails = (appointment: DetailedAppointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // Keep selectedAppointment for a moment to allow smooth close animation
    setTimeout(() => {
      if (!isDrawerOpen) {
        setSelectedAppointment(null);
      }
    }, 300);
  };

  // Get status badge component
  const getStatusBadge = (status: DetailedAppointment['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  // Table columns definition
  const tableColumns = [
    {
      header: 'Queue #',
      accessor: 'appointment_number',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#20C997]/10 rounded-full flex items-center justify-center">
            <span className="font-bold text-[#20C997] text-sm">#{value}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Patient',
      accessor: 'patients',
      sortable: true,
      render: (_: any, row: DetailedAppointment) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {row.patients?.profiles?.first_name || 'Unknown'} {row.patients?.profiles?.last_name || 'Patient'}
            </div>
            <div className="text-xs text-gray-500">Patient #{row.patients?.patient_number || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Date & Time',
      accessor: 'appointment_date',
      sortable: true,
      render: (_: any, row: DetailedAppointment) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{formatDate(row.appointment_date)}</div>
            <div className="text-xs text-gray-500">{formatTime(row.appointment_time)}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Barangay',
      accessor: 'barangay',
      sortable: true,
      render: (_: any, row: DetailedAppointment) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <MapPin className="w-3 h-3 text-gray-400" />
          {row.patients?.profiles?.barangays?.name || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: DetailedAppointment['status']) => getStatusBadge(value),
    },
    {
      header: 'Medical Record',
      accessor: 'has_medical_record',
      sortable: true,
      render: (_: any, row: DetailedAppointment) => (
        <MedicalRecordStatusBadge
          hasRecord={row.has_medical_record || false}
          size="sm"
        />
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: DetailedAppointment) => (
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

  const filteredAppointments = appointments.filter((apt) =>
    filter === 'all' ? true : apt.status === filter
  );

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

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
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
                    <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.scheduled}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Checked In</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.checked_in}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">In Progress</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.in_progress}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
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

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">No Show</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.no_show}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All Appointments', count: statistics.total, color: 'gray', icon: ListChecks },
                { id: 'pending', label: 'Pending', count: statistics.pending, color: 'orange', icon: Clock },
                { id: 'scheduled', label: 'Scheduled', count: statistics.scheduled, color: 'blue', icon: Calendar },
                { id: 'checked_in', label: 'Checked In', count: statistics.checked_in, color: 'purple', icon: UserCheck },
                { id: 'in_progress', label: 'In Progress', count: statistics.in_progress, color: 'amber', icon: Activity },
                { id: 'completed', label: 'Completed', count: statistics.completed, color: 'green', icon: CheckCircle },
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

            {/* Enhanced Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={tableColumns}
                data={filteredAppointments}
                searchable
                searchPlaceholder="Search by patient name, queue number, or barangay..."
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
            subtitle={`${selectedAppointment.patients?.profiles?.first_name || 'Unknown'} ${selectedAppointment.patients?.profiles?.last_name || 'Patient'}`}
            metadata={{
              createdOn: `${formatDate(selectedAppointment.appointment_date)} at ${formatTime(selectedAppointment.appointment_time)}`,
              doctor: `Patient #${selectedAppointment.patients?.patient_number || 'N/A'}`,
            }}
          >
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedAppointment.status)}
                </div>

                {/* Time Tracking Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.checked_in_at && selectedAppointment.status === 'checked_in' && (
                    <TimeElapsedBadge
                      timestamp={selectedAppointment.checked_in_at}
                      label="Waiting"
                      type="waiting"
                    />
                  )}
                  {selectedAppointment.started_at && selectedAppointment.status === 'in_progress' && (
                    <TimeElapsedBadge
                      timestamp={selectedAppointment.started_at}
                      label="Consulting"
                      type="consulting"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Patient Information
                      </h4>
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-500">Name</p>
                            <p className="font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients?.profiles?.first_name || 'Unknown'}{' '}
                              {selectedAppointment.patients?.profiles?.last_name || 'Patient'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Patient #</p>
                            <p className="font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients?.patient_number || 'N/A'}
                            </p>
                          </div>
                          {selectedAppointment.patients?.profiles?.email && (
                            <div>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </p>
                              <p className="text-gray-900 mt-1">
                                {selectedAppointment.patients.profiles.email}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.patients?.profiles?.contact_number && (
                            <div>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                Contact
                              </p>
                              <p className="text-gray-900 mt-1">
                                {selectedAppointment.patients.profiles.contact_number}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.patients?.profiles?.date_of_birth && (
                            <div>
                              <p className="text-xs text-gray-500">Date of Birth</p>
                              <p className="text-gray-900 mt-1">
                                {new Date(selectedAppointment.patients.profiles.date_of_birth).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.patients?.profiles?.gender && (
                            <div>
                              <p className="text-xs text-gray-500">Gender</p>
                              <p className="text-gray-900 mt-1 capitalize">
                                {selectedAppointment.patients.profiles.gender}
                              </p>
                            </div>
                          )}
                          {selectedAppointment.patients?.profiles?.barangays && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                Barangay
                              </p>
                              <p className="text-gray-900 mt-1">
                                {selectedAppointment.patients.profiles.barangays.name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    {selectedAppointment.patients?.profiles?.emergency_contact && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Emergency Contact
                        </h4>
                        <div className="bg-gray-50 rounded-md p-3">
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Name</p>
                              <p className="text-gray-900 mt-1 font-medium">
                                {selectedAppointment.patients.profiles.emergency_contact.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                Phone
                              </p>
                              <p className="text-gray-900 mt-1">
                                {selectedAppointment.patients.profiles.emergency_contact.phone}
                              </p>
                            </div>
                            {selectedAppointment.patients.profiles.emergency_contact.email && (
                              <div>
                                <p className="text-xs text-gray-500 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  Email
                                </p>
                                <p className="text-gray-900 mt-1">
                                  {selectedAppointment.patients.profiles.emergency_contact.email}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Medical Information */}
                    {(() => {
                      const hasMedicalData = selectedAppointment.patients && (
                        selectedAppointment.patients.medical_history?.blood_type ||
                        (selectedAppointment.patients.allergies && selectedAppointment.patients.allergies.length > 0) ||
                        (selectedAppointment.patients.medical_history?.conditions && selectedAppointment.patients.medical_history.conditions.length > 0) ||
                        (selectedAppointment.patients.current_medications && selectedAppointment.patients.current_medications.length > 0) ||
                        selectedAppointment.patients.accessibility_requirements
                      );

                      return hasMedicalData ? (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Heart className="w-4 h-4 mr-2" />
                            Medical Information
                          </h4>
                          <div className="bg-gray-50 rounded-md p-3 space-y-3 text-sm">
                            {selectedAppointment.patients.medical_history?.blood_type && (
                              <div>
                                <p className="text-xs text-gray-500 flex items-center">
                                  <Droplet className="w-3 h-3 mr-1" />
                                  Blood Type
                                </p>
                                <p className="text-gray-900 font-medium mt-1">
                                  {selectedAppointment.patients.medical_history.blood_type}
                                </p>
                              </div>
                            )}

                            {selectedAppointment.patients.allergies && selectedAppointment.patients.allergies.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Allergies</p>
                                <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                  <div className="flex items-start">
                                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="ml-2 flex-1">
                                      <div className="flex flex-wrap gap-1">
                                        {selectedAppointment.patients.allergies.map((allergy: string, index: number) => (
                                          <span key={index} className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                                            {allergy}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedAppointment.patients.medical_history?.conditions && selectedAppointment.patients.medical_history.conditions.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Medical Conditions</p>
                                <p className="text-gray-900">{selectedAppointment.patients.medical_history.conditions}</p>
                              </div>
                            )}

                            {selectedAppointment.patients.current_medications && selectedAppointment.patients.current_medications.length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Current Medications</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedAppointment.patients.current_medications.map((medication: string, index: number) => (
                                    <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                      {medication}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedAppointment.patients.accessibility_requirements && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1.5">Accessibility Requirements</p>
                                <p className="text-gray-900">{selectedAppointment.patients.accessibility_requirements}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Medical Record Status - Only show for completed appointments */}
                    {selectedAppointment.status === 'completed' && (
                      <div>
                        {hasMedicalRecords === null ? (
                          // Loading state
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-teal mr-3"></div>
                              <p className="text-sm text-gray-600">Checking for medical records...</p>
                            </div>
                          </div>
                        ) : hasMedicalRecords === true ? (
                          // Success state - Medical record exists
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="ml-3 flex-1">
                                <h4 className="text-sm font-semibold text-green-900 mb-1">
                                  Medical Record Created
                                </h4>
                                <p className="text-xs text-green-700 mb-3">
                                  Consultation notes and diagnosis have been recorded for this appointment.
                                </p>
                                <button
                                  onClick={() => {
                                    window.location.href = `/doctor/medical-records?appointment_id=${selectedAppointment.id}`;
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                                >
                                  <FileText className="w-3 h-3 mr-1.5" />
                                  View Full Medical Record
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Warning state - No medical record
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="ml-3 flex-1">
                                <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                                  No Medical Record
                                </h4>
                                <p className="text-xs text-yellow-700 mb-3">
                                  This appointment was completed without creating a medical record.
                                </p>
                                <button
                                  onClick={() => {
                                    window.location.href = `/doctor/medical-records/create?appointment_id=${selectedAppointment.id}`;
                                  }}
                                  className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded-md hover:bg-yellow-700 transition-colors"
                                >
                                  <FileText className="w-3 h-3 mr-1.5" />
                                  Create Medical Record Now
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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

                    {/* Appointment Timeline */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Timeline
                      </h4>
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="space-y-2">
                          {/* Created */}
                          <div className="flex items-start text-xs">
                            <div className="w-20 text-gray-500 flex-shrink-0">Created</div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                                <span className="text-gray-900">
                                  {formatPhilippineDateLong(selectedAppointment.appointment_date)} at{' '}
                                  {selectedAppointment.appointment_time}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Checked In */}
                          {selectedAppointment.checked_in_at && (
                            <div className="flex items-start text-xs">
                              <div className="w-20 text-gray-500 flex-shrink-0">Checked In</div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                  <span className="text-gray-900">
                                    {new Date(selectedAppointment.checked_in_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Started */}
                          {selectedAppointment.started_at && (
                            <div className="flex items-start text-xs">
                              <div className="w-20 text-gray-500 flex-shrink-0">Started</div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-primary-teal mr-2"></div>
                                  <span className="text-gray-900">
                                    {new Date(selectedAppointment.started_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Completed */}
                          {selectedAppointment.completed_at && (
                            <div className="flex items-start text-xs">
                              <div className="w-20 text-gray-500 flex-shrink-0">Completed</div>
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                                  <span className="text-gray-900">
                                    {new Date(selectedAppointment.completed_at).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <button
                        onClick={handleViewHistory}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
                      >
                        <History className="w-4 h-4" />
                        View Status History
                      </button>

                      {/* Visible Undo Button with Medical Records Validation */}
                      {lastHistoryEntry &&
                       lastHistoryEntry.from_status &&
                       lastHistoryEntry.from_status !== 'pending' &&
                       selectedAppointment.status !== lastHistoryEntry.from_status && (
                        selectedAppointment.status === 'completed' ? (
                          // Special handling for completed appointments
                          hasMedicalRecords === false ? (
                            <button
                              onClick={handleQuickUndo}
                              disabled={actionLoading}
                              className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium flex items-center justify-center gap-2 border border-yellow-300 disabled:opacity-50"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Undo Last Action
                            </button>
                          ) : hasMedicalRecords === true ? (
                            <button
                              disabled
                              className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md font-medium flex items-center justify-center gap-2 border border-gray-300 cursor-not-allowed"
                              title="Cannot undo - medical record has been created"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Undo Blocked (Record Exists)
                            </button>
                          ) : (
                            // Loading state while checking medical records
                            <button
                              disabled
                              className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md font-medium flex items-center justify-center gap-2 border border-gray-200"
                            >
                              <RotateCcw className="w-4 h-4 animate-spin" />
                              Checking...
                            </button>
                          )
                        ) : (
                          // Normal undo button for non-completed statuses
                          <button
                            onClick={handleQuickUndo}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium flex items-center justify-center gap-2 border border-yellow-300 disabled:opacity-50"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Undo Last Action
                          </button>
                        )
                      )}

                      {selectedAppointment.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            setPendingAction({
                              appointmentId: selectedAppointment.id,
                              status: 'checked_in',
                              patientName: `${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`
                            });
                            setShowCheckInDialog(true);
                          }}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Check In Patient'}
                        </button>
                      )}

                      {selectedAppointment.status === 'checked_in' && (
                        <button
                          onClick={() => {
                            setPendingAction({
                              appointmentId: selectedAppointment.id,
                              status: 'in_progress',
                              patientName: `${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`
                            });
                            setShowStartDialog(true);
                          }}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 font-medium disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Start Consultation'}
                        </button>
                      )}

                      {selectedAppointment.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => {
                              window.location.href = `/doctor/medical-records/create?appointment_id=${selectedAppointment.id}`;
                            }}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Create Medical Record
                          </button>
                          <button
                            onClick={() => {
                              handleCheckAndComplete(
                                selectedAppointment.id,
                                `${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`
                              );
                            }}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : 'Mark as Completed'}
                          </button>
                          <p className="text-xs text-gray-500 text-center">
                            Create medical record first, then mark as completed
                          </p>
                        </>
                      )}

                      {selectedAppointment.status === 'scheduled' && (() => {
                        // Check if appointment date is today or in the past (can mark no-show)
                        const philippineNow = getPhilippineTime();
                        const appointmentDate = new Date(selectedAppointment.appointment_date);
                        philippineNow.setHours(0, 0, 0, 0);
                        appointmentDate.setHours(0, 0, 0, 0);
                        const isFutureAppointment = appointmentDate.getTime() > philippineNow.getTime();

                        if (isFutureAppointment) {
                          return (
                            <button
                              disabled
                              className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-md font-medium cursor-not-allowed border border-gray-300"
                              title="Cannot mark future appointments as no-show. Please wait until the appointment date."
                            >
                              Mark as No Show
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => {
                              setPendingAction({
                                appointmentId: selectedAppointment.id,
                                status: 'no_show',
                                patientName: `${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`
                              });
                              setShowNoShowDialog(true);
                            }}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : 'Mark as No Show'}
                          </button>
                        );
                      })()}
                    </div>
              </div>
            </div>
          </Drawer>
        )}

        {/* Confirmation Dialogs */}
        <ConfirmDialog
          isOpen={showCheckInDialog}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title="Check In Patient"
          message={`Are you sure you want to check in ${pendingAction?.patientName}?`}
          confirmText="Check In"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
          showReasonInput={true}
          reasonLabel="Reason (optional)"
          reasonPlaceholder="Enter reason for check-in..."
        />

        <ConfirmDialog
          isOpen={showStartDialog}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title="Start Consultation"
          message={`Are you sure you want to start the consultation with ${pendingAction?.patientName}?`}
          confirmText="Start Consultation"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
          showReasonInput={true}
          reasonLabel="Reason (optional)"
          reasonPlaceholder="Enter reason for starting consultation..."
        />

        <ConfirmDialog
          isOpen={showCompleteDialog}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title={completionHasMedicalRecord ? "Mark as Completed" : "⚠️ Complete Without Medical Record?"}
          message={
            completionHasMedicalRecord
              ? `Are you sure you want to mark ${pendingAction?.patientName}'s appointment as completed?`
              : `⚠️ WARNING: No medical record has been created for ${pendingAction?.patientName}'s appointment.\n\nCompleting without proper documentation may:\n• Violate healthcare standards and regulations\n• Create gaps in patient care continuity\n• Affect audit compliance and quality metrics\n• Limit future medical reference\n\nIt is strongly recommended to create the medical record BEFORE marking as completed.\n\nAre you sure you want to proceed without documentation?`
          }
          confirmText={completionHasMedicalRecord ? "Mark as Completed" : "Complete Without Record"}
          cancelText="Cancel"
          variant={completionHasMedicalRecord ? "info" : "warning"}
          isLoading={actionLoading}
          showReasonInput={true}
          reasonLabel={completionHasMedicalRecord ? "Reason (optional)" : "Reason for completing without record"}
          reasonPlaceholder={completionHasMedicalRecord ? "Enter reason for completion..." : "Explain why completing without medical record..."}
          isReasonRequired={!completionHasMedicalRecord}
        />

        <ConfirmDialog
          isOpen={showNoShowDialog}
          onClose={handleCancelAction}
          onConfirm={handleConfirmAction}
          title="Mark as No Show"
          message={`Are you sure you want to mark ${pendingAction?.patientName} as a no-show? This action will update the appointment status.`}
          confirmText="Mark as No Show"
          cancelText="Cancel"
          variant="warning"
          isLoading={actionLoading}
          showReasonInput={true}
          reasonLabel="Reason (optional)"
          reasonPlaceholder="Enter reason for no-show..."
        />

        {/* Status History Modal */}
        <StatusHistoryModal
          appointmentId={selectedAppointment?.id || ''}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />

        {/* Status Reversion Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRevertDialog}
          onClose={() => setShowRevertDialog(false)}
          onConfirm={handleConfirmRevert}
          title="Revert Appointment Status"
          message={`Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"? This action will be logged in the status history.`}
          confirmText="Revert Status"
          cancelText="Cancel"
          variant="warning"
          showReasonInput={true}
          reasonLabel="Reason for reversion (required)"
          reasonPlaceholder="E.g., Accidentally checked in wrong patient, need to reschedule"
          isLoading={actionLoading}
        />
      </Container>
    </DashboardLayout>
  );
}
