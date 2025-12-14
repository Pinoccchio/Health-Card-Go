'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { AppointmentCompletionModal } from '@/components/appointments/AppointmentCompletionModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { StatusTransitionButtons } from '@/components/appointments/StatusTransitionButtons';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  History,
  RotateCcw,
  User,
  ListChecks,
  Activity,
  UserCheck,
  Eye,
  Phone,
  Mail,
  MapPin,
  Heart,
  Droplet,
  AlertTriangle,
} from 'lucide-react';
import { getPhilippineTime } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';
import { canAccessAppointments } from '@/lib/utils/serviceAccessGuard';
import { useToast } from '@/lib/contexts/ToastContext';
import { calculateAppointmentStatistics } from '@/lib/utils/appointmentStats';
import {
  TimeBlock,
  formatTimeBlock,
  getTimeBlockColor,
  TIME_BLOCKS,
} from '@/types/appointment';

interface AdminAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  time_block: TimeBlock;
  status: 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'; // Added 'pending'
  reason?: string;
  cancellation_reason?: string | null;
  service_id: number;
  checked_in_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  patients: {
    id: string;
    patient_number: string;
    medical_history?: any;
    allergies?: any;
    current_medications?: any;
    accessibility_requirements?: string | null;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      contact_number?: string;
      date_of_birth?: string;
      gender?: 'male' | 'female' | 'other';
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

export default function HealthcareAdminAppointmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AdminAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Status history and reversion states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryAppointmentId, setSelectedHistoryAppointmentId] = useState<string | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<{
    historyId: string;
    targetStatus: string;
    appointmentId: string;
    currentStatus?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastHistoryEntries, setLastHistoryEntries] = useState<Record<string, {
    id: string;
    from_status: string | null;
  }>>({});

  // Medical records check for undo validation (keyed by appointment ID)
  const [hasMedicalRecords, setHasMedicalRecords] = useState<Record<string, boolean | null>>({});

  // Appointment completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<AdminAppointment | null>(null);

  // Check if user has access to appointments (not walk-in only service)
  useEffect(() => {
    async function checkAccess() {
      if (!user?.assigned_service_id) {
        toast.error('No service assigned to your account');
        router.push('/healthcare-admin/dashboard');
        return;
      }

      const canAccess = await canAccessAppointments(user.assigned_service_id);

      if (!canAccess) {
        toast.error('Your service is walk-in only. Redirecting to Walk-in Queue...');
        router.push('/healthcare-admin/walk-in');
        return;
      }

      setHasAccess(true);
      setIsCheckingAccess(false);
    }

    checkAccess();
  }, [user?.assigned_service_id, router]);

  // Reset to page 1 when filters change
  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, filter, searchQuery]);

  // Debounced search effect
  useEffect(() => {
    // Debounce search by 300ms to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        // If already on page 1, trigger fetch directly
        fetchAppointments();
      }
      // Otherwise, the page change will trigger the fetch via the dependency below
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch appointments when page or filters change
  useEffect(() => {
    fetchAppointments();
  }, [currentPage, dateFilter, filter]);

  // Fetch last history entries when appointments change
  useEffect(() => {
    if (appointments.length > 0) {
      fetchAllLastHistoryEntries();
    }
  }, [appointments.length]);

  const fetchAllLastHistoryEntries = async () => {
    const entries: Record<string, { id: string; from_status: string | null }> = {};

    await Promise.all(
      appointments.map(async (appointment) => {
        try {
          const response = await fetch(`/api/appointments/${appointment.id}/history`);
          const data = await response.json();

          if (data.success && data.data.length > 0) {
            // Find the most recent forward status change that led to the current status
            // Filter out reversions to get the actual last forward status change
            const lastEntry = data.data.find((entry: any) =>
              entry.change_type === 'status_change' &&
              entry.to_status === appointment.status &&  // Must match current status
              !entry.is_reversion &&  // Must not be a previous reversion
              entry.from_status !== null
            );
            if (lastEntry) {
              entries[appointment.id] = {
                id: lastEntry.id,
                from_status: lastEntry.from_status,
              };
            }
          }
        } catch (err) {
          console.error(`Failed to fetch history for appointment ${appointment.id}:`, err);
        }
      })
    );

    setLastHistoryEntries(entries);
  };

  // Check medical records for completed appointments
  useEffect(() => {
    if (appointments.length > 0) {
      checkAllMedicalRecords();
    }
  }, [appointments.length]);

  const checkAllMedicalRecords = async () => {
    const records: Record<string, boolean | null> = {};

    await Promise.all(
      appointments.map(async (appointment) => {
        if (appointment.status === 'completed') {
          try {
            const response = await fetch(`/api/medical-records?appointment_id=${appointment.id}`);
            const data = await response.json();

            if (data.success) {
              records[appointment.id] = data.has_records;
            } else {
              records[appointment.id] = null;
            }
          } catch (err) {
            console.error(`Failed to check medical records for appointment ${appointment.id}:`, err);
            records[appointment.id] = null;
          }
        }
      })
    );

    setHasMedicalRecords(records);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      // Add search query
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add status filter
      if (filter !== 'all') {
        params.append('status', filter);
      }

      // Add date filter
      if (dateFilter === 'today') {
        const nowPHT = getPhilippineTime();
        const year = nowPHT.getFullYear();
        const month = String(nowPHT.getMonth() + 1).padStart(2, '0');
        const day = String(nowPHT.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        params.append('date', today);
      } else if (dateFilter === 'week') {
        const nowPHT = getPhilippineTime();
        const year = nowPHT.getFullYear();
        const month = String(nowPHT.getMonth() + 1).padStart(2, '0');
        const day = String(nowPHT.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        params.append('date', today);
      }

      const response = await fetch(`/api/appointments?${params.toString()}`);
      const data = await response.json();

      console.log('📊 [APPOINTMENTS] API Response:', {
        success: data.success,
        appointmentsCount: data.data?.length || 0,
        pagination: data.pagination,
      });

      if (data.success) {
        setAppointments(data.data || []);

        // Update pagination metadata with fallbacks
        if (data.pagination) {
          const total = data.pagination.total || 0;
          const pages = data.pagination.totalPages || Math.ceil(total / pageSize);

          console.log('📄 [PAGINATION] Setting state:', {
            totalRecords: total,
            totalPages: pages,
            currentPage,
            pageSize,
          });

          setTotalRecords(total);
          setTotalPages(pages);
        } else {
          // Fallback: estimate from data length
          console.warn('⚠️ [PAGINATION] No pagination metadata in response, using fallback');
          const dataLength = data.data?.length || 0;
          setTotalRecords(dataLength);
          setTotalPages(dataLength > pageSize ? Math.ceil(dataLength / pageSize) : 1);
        }
      } else {
        setError(data.error || 'Failed to load appointments');
      }
    } catch (err) {
      console.error('❌ [APPOINTMENTS] Fetch error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  // Note: With pagination, statistics show counts for current page only
  // Calculate statistics from current page appointments using shared utility
  const statistics = useMemo(
    () => calculateAppointmentStatistics(appointments),
    [appointments]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: AdminAppointment['status']) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const handleViewHistory = (appointmentId: string) => {
    setSelectedHistoryAppointmentId(appointmentId);
    setShowHistoryModal(true);
  };

  const handleViewDetails = (appointment: AdminAppointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAppointment(null);
  };

  const handleQuickUndo = (appointmentId: string) => {
    const lastEntry = lastHistoryEntries[appointmentId];
    if (!lastEntry) return;

    // Get current appointment to determine current status
    const currentAppointment = appointments.find(apt => apt.id === appointmentId);

    setPendingRevert({
      historyId: lastEntry.id,
      targetStatus: lastEntry.from_status || '',
      appointmentId,
      currentStatus: currentAppointment?.status,
    });
    setShowRevertDialog(true);
  };

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
        // Close dialog and show success immediately
        setShowRevertDialog(false);
        toast.success('Appointment status reverted successfully');
        setPendingRevert(null);

        // Close drawer immediately (don't wait for data refresh)
        setIsDrawerOpen(false);
        setSelectedAppointment(null);

        // Refresh appointments list in background (not awaited for instant UI response)
        fetchAppointments();
        setActionLoading(false);
      } else {
        toast.error(data.error || 'Failed to revert status');
        setActionLoading(false);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      setActionLoading(false);
    }
  };

  const handleCompleteAppointment = (appointment: AdminAppointment) => {
    setAppointmentToComplete(appointment);
    setShowCompletionModal(true);
  };

  const handleCompletionSuccess = () => {
    setShowCompletionModal(false);
    setAppointmentToComplete(null);
    setIsDrawerOpen(false);
    setSuccessMessage('Appointment completed successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchAppointments();
  };

  const handleCompletionCancel = () => {
    setShowCompletionModal(false);
    setAppointmentToComplete(null);
  };

  const exportToCSV = () => {
    const filteredData = appointments;
    const headers = ['Queue #', 'Patient Name', 'Patient #', 'Date', 'Time', 'Status', 'Reason'];
    const rows = filteredData.map(apt => [
      apt.appointment_number,
      `${apt.patients?.profiles?.first_name || 'N/A'} ${apt.patients?.profiles?.last_name || ''}`,
      apt.patients?.patient_number || 'N/A',
      apt.appointment_date,
      formatTimeBlock(apt.time_block),
      apt.status,
      apt.reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Define table columns
  const tableColumns = [
    {
      header: 'Queue #',
      accessor: 'appointment_number',
      sortable: true,
      render: (value: number) => (
        <span className="font-mono font-semibold text-primary-teal">#{value}</span>
      ),
    },
    {
      header: 'Patient',
      accessor: 'patient',
      sortable: false,
      render: (_: any, row: AdminAppointment) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.patients?.profiles?.first_name || 'N/A'} {row.patients?.profiles?.last_name || ''}
          </p>
          <p className="text-xs text-gray-500">{row.patients?.patient_number || 'N/A'}</p>
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
          {formatDate(value)}
        </div>
      ),
    },
    {
      header: 'Time Block',
      accessor: 'time_block',
      sortable: true,
      render: (value: TimeBlock) => (
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
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: AdminAppointment['status'], row: AdminAppointment) => (
        <div className="flex flex-col gap-1">
          {getStatusBadge(value)}
          {row.checked_in_at && row.status === 'checked_in' && (
            <TimeElapsedBadge
              timestamp={row.checked_in_at}
              label="Waiting"
              type="waiting"
            />
          )}
          {row.started_at && row.status === 'in_progress' && (
            <TimeElapsedBadge
              timestamp={row.started_at}
              label="Consulting"
              type="consulting"
            />
          )}
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      sortable: false,
      render: (value: string) => (
        <span className="text-sm text-gray-700 line-clamp-2">
          {value || '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: AdminAppointment) => {
        const canComplete = row.status === 'in_progress';

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleViewDetails(row)}
              className="inline-flex items-center px-3 py-1.5 bg-[#20C997] text-white text-xs font-medium rounded-md hover:bg-[#1AA179] transition-colors"
            >
              <Eye className="w-3 h-3 mr-1.5" />
              View
            </button>
            {canComplete && (
              <button
                onClick={() => handleCompleteAppointment(row)}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-3 h-3 mr-1.5" />
                Complete
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <DashboardLayout roleId={2} pageTitle="Appointments" pageDescription="Loading...">
        <Container size="full">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  // If no access, show error (will redirect, but show this temporarily)
  if (!hasAccess) {
    return (
      <DashboardLayout roleId={2} pageTitle="Access Denied" pageDescription="Redirecting...">
        <Container size="full">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Walk-in Service Detected</h2>
            <p className="text-gray-600 mb-4">
              Your assigned service is walk-in only and does not use the appointment system.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to Walk-in Queue...
            </p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Appointments"
      pageDescription="Manage and monitor all appointments"
    >
      <Container size="full">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
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
                { id: 'scheduled', label: 'Scheduled', count: statistics.scheduled, color: 'blue', icon: Calendar },
                { id: 'checked_in', label: 'Checked In', count: statistics.checked_in, color: 'purple', icon: UserCheck },
                { id: 'in_progress', label: 'In Progress', count: statistics.in_progress, color: 'amber', icon: Activity },
                { id: 'completed', label: 'Completed', count: statistics.completed, color: 'green', icon: CheckCircle },
                { id: 'cancelled', label: 'Cancelled', count: statistics.cancelled, color: 'gray', icon: XCircle },
                { id: 'no_show', label: 'No Show', count: statistics.no_show, color: 'red', icon: AlertCircle },
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
              <button
                onClick={exportToCSV}
                disabled={appointments.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </button>
            </div>

            {/* Enhanced Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={tableColumns}
                data={appointments}
                searchable
                searchPlaceholder="Search by patient name, queue number..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                paginated={false}
              />
            </div>

            {/* Server-Side Pagination Controls */}
            {(() => {
              console.log('🔍 [PAGINATION RENDER]', {
                totalPages,
                totalRecords,
                currentPage,
                pageSize,
                condition: totalPages > 1,
                appointmentsLength: appointments.length,
              });
              return null;
            })()}

            {/* Show pagination info even if totalPages might not be set correctly */}
            {(totalPages > 1 || (totalRecords > pageSize && appointments.length >= pageSize)) && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords || appointments.length)} of {totalRecords || '?'} results
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 border rounded-md text-sm font-medium ${
                            currentPage === pageNum
                              ? 'bg-primary-teal text-white border-primary-teal'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Drawer for Appointment Details */}
        {selectedAppointment && (
          <Drawer
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
            size="xl"
            title={`Appointment #${selectedAppointment.appointment_number}`}
            subtitle={`${selectedAppointment.patients?.profiles?.first_name || 'N/A'} ${selectedAppointment.patients?.profiles?.last_name || ''}`}
            metadata={{
              createdOn: `${formatDate(selectedAppointment.appointment_date)} - ${formatTimeBlock(selectedAppointment.time_block)}`,
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
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium text-gray-900">{formatDate(selectedAppointment.appointment_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Block:</span>
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
                          {selectedAppointment.patients?.profiles?.first_name || 'N/A'} {selectedAppointment.patients?.profiles?.last_name || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Patient #</p>
                        <p className="font-medium text-gray-900 mt-1">{selectedAppointment.patients?.patient_number || 'N/A'}</p>
                      </div>
                      {selectedAppointment.patients?.profiles?.email && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                          </p>
                          <p className="text-gray-900 mt-1">{selectedAppointment.patients.profiles.email}</p>
                        </div>
                      )}
                      {selectedAppointment.patients?.profiles?.contact_number && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            Contact
                          </p>
                          <p className="text-gray-900 mt-1">{selectedAppointment.patients.profiles.contact_number}</p>
                        </div>
                      )}
                      {selectedAppointment.patients?.profiles?.date_of_birth && (
                        <div>
                          <p className="text-xs text-gray-500">Date of Birth</p>
                          <p className="text-gray-900 mt-1">
                            {new Date(selectedAppointment.patients.profiles.date_of_birth).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      {selectedAppointment.patients?.profiles?.gender && (
                        <div>
                          <p className="text-xs text-gray-500">Gender</p>
                          <p className="text-gray-900 mt-1 capitalize">{selectedAppointment.patients.profiles.gender}</p>
                        </div>
                      )}
                      {selectedAppointment.patients?.profiles?.barangays && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            Barangay
                          </p>
                          <p className="text-gray-900 mt-1">{selectedAppointment.patients.profiles.barangays.name}</p>
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
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patients.profiles.emergency_contact.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            Phone
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedAppointment.patients.profiles.emergency_contact.phone}
                          </p>
                        </div>
                        {selectedAppointment.patients.profiles.emergency_contact.email && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              Email
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
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
                    selectedAppointment.patients.medical_history?.conditions ||
                    (selectedAppointment.patients.current_medications && selectedAppointment.patients.current_medications.length > 0)
                  );

                  return hasMedicalData ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Heart className="w-4 h-4 mr-2" />
                        Medical Information
                      </h4>
                      <div className="bg-gray-50 rounded-md p-3 space-y-3">
                        {selectedAppointment.patients.medical_history?.blood_type && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Droplet className="w-3 h-3 mr-1" />
                              Blood Type
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients.medical_history.blood_type}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patients.allergies && selectedAppointment.patients.allergies.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Allergies
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients.allergies.join(', ')}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patients.medical_history?.conditions && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Heart className="w-3 h-3 mr-1" />
                              Medical Conditions
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients.medical_history.conditions}
                            </p>
                          </div>
                        )}
                        {selectedAppointment.patients.current_medications && selectedAppointment.patients.current_medications.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 flex items-center">
                              <FileText className="w-3 h-3 mr-1" />
                              Current Medications
                            </p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {selectedAppointment.patients.current_medications.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()}

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
                {selectedAppointment.status === 'cancelled' && selectedAppointment.cancellation_reason && (
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
                {/* Status Transition Buttons */}
                <StatusTransitionButtons
                  appointmentId={selectedAppointment.id}
                  currentStatus={selectedAppointment.status as any}
                  appointmentDate={selectedAppointment.appointment_date}
                  onStatusUpdate={() => {
                    fetchAppointments();
                    setSelectedAppointment(null);
                  }}
                  variant="full"
                  className="flex-col"
                />

                {/* Complete Appointment Button */}
                {selectedAppointment.status === 'in_progress' && (
                  <button
                    onClick={() => handleCompleteAppointment(selectedAppointment)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Appointment
                  </button>
                )}

                {/* View Status History */}
                <button
                  onClick={() => handleViewHistory(selectedAppointment.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-primary-teal hover:text-primary-teal/80 font-medium border border-primary-teal/20 rounded-md hover:bg-primary-teal/5 transition-colors"
                >
                  <History className="w-4 h-4" />
                  View Status History
                </button>

                {/* Undo Button - Hidden for pending status (no previous state to undo to) */}
                {lastHistoryEntries[selectedAppointment.id] &&
                 lastHistoryEntries[selectedAppointment.id].from_status &&
                 selectedAppointment.status !== lastHistoryEntries[selectedAppointment.id].from_status &&
                 selectedAppointment.status !== 'pending' &&
                 selectedAppointment.status !== 'cancelled' && (
                  selectedAppointment.status === 'completed' ? (
                    hasMedicalRecords[selectedAppointment.id] === false ? (
                      <button
                        onClick={() => handleQuickUndo(selectedAppointment.id)}
                        disabled={actionLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium text-sm border border-yellow-300 disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Undo Last Action
                      </button>
                    ) : null
                  ) : (
                    <button
                      onClick={() => handleQuickUndo(selectedAppointment.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium text-sm border border-yellow-300 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Undo Last Action
                    </button>
                  )
                )}
              </div>
            </div>
          </Drawer>
        )}

        {/* Status History Modal */}
        <StatusHistoryModal
          appointmentId={selectedHistoryAppointmentId || ''}
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />

        {/* Status Reversion Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRevertDialog}
          onClose={() => setShowRevertDialog(false)}
          onConfirm={handleConfirmRevert}
          title="Revert Appointment Status"
          message={
            pendingRevert?.currentStatus === 'checked_in' || pendingRevert?.currentStatus === 'in_progress'
              ? `Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"?\n\n⚠️ Important: This will erase the ${pendingRevert.currentStatus === 'checked_in' ? 'check-in' : 'start'} timestamp from records, which affects wait time statistics. Only proceed if this was an error or the patient needs to be rescheduled.\n\nThis action will be logged in the status history with your reason.`
              : `Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"? This action will be logged in the status history.`
          }
          confirmText="Revert Status"
          cancelText="Cancel"
          variant="warning"
          showReasonInput={true}
          reasonLabel="Reason for reversion (required)"
          reasonPlaceholder={
            pendingRevert?.currentStatus === 'checked_in' || pendingRevert?.currentStatus === 'in_progress'
              ? "E.g., Patient left before being seen, Wrong patient checked in, Technical error"
              : "E.g., Accidentally changed status, need to correct error"
          }
          isLoading={actionLoading}
        />

        {/* Appointment Completion Modal */}
        {appointmentToComplete && (
          <AppointmentCompletionModal
            isOpen={showCompletionModal}
            onClose={handleCompletionCancel}
            onSuccess={handleCompletionSuccess}
            appointment={appointmentToComplete}
          />
        )}
      </Container>
    </DashboardLayout>
  );
}
