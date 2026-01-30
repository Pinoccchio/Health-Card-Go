'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog, DateCalendarModal } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { DocumentReviewPanel } from '@/components/healthcare-admin/DocumentReviewPanel';
import { RejectionReasonModal } from '@/components/healthcare-admin/RejectionReasonModal';
import AppointmentStageTracker from '@/components/appointments/AppointmentStageTracker';
import LaboratoryStageModal from '@/components/appointments/stages/LaboratoryStageModal';
import CheckupStageModal from '@/components/appointments/stages/CheckupStageModal';
import ReleasingStageModal from '@/components/appointments/stages/ReleasingStageModal';
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
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { getPhilippineTime } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';
import { canAccessAppointments } from '@/lib/utils/serviceAccessGuard';
import { useToast } from '@/lib/contexts/ToastContext';
import type { AppointmentStatistics } from '@/lib/utils/appointmentStats';
import {
  TimeBlock,
  formatTimeBlock,
  getTimeBlockColor,
  TIME_BLOCKS,
  getHealthCardTypeInfo,
} from '@/types/appointment';

interface AdminAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  time_block: TimeBlock;
  status: 'pending' | 'scheduled' | 'verified' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  appointment_stage?: 'verification' | 'laboratory' | 'results' | 'checkup' | 'releasing' | null;
  reason?: string;
  cancellation_reason?: string | null;
  service_id: number;
  verified_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  has_medical_record?: boolean; // Indicates if medical record exists
  // Health Card specific fields
  lab_location?: 'inside_cho' | 'outside_cho';
  card_type?: 'food_handler' | 'non_food' | 'pink';
  verification_status?: 'pending' | 'approved' | 'rejected';
  services?: {
    id: number;
    name: string;
    category: string;
  };
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
  const [allAppointmentsForDates, setAllAppointmentsForDates] = useState<AdminAppointment[]>([]); // For dropdown dates only
  const [selectedAppointment, setSelectedAppointment] = useState<AdminAppointment | null>(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [datesLoading, setDatesLoading] = useState(true);
  const loading = appointmentsLoading || datesLoading; // Combined loading state - waits for BOTH fetches
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'verified' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState('');

  // Date-based queue view state
  // Start with today's date in Philippine timezone (YYYY-MM-DD format)
  const getTodayPHT = () => {
    const nowPHT = getPhilippineTime();
    const year = nowPHT.getUTCFullYear();
    const month = String(nowPHT.getUTCMonth() + 1).padStart(2, '0');
    const day = String(nowPHT.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPHT());

  // Get unique dates that have appointments (sorted chronologically)
  // Use allAppointmentsForDates (not paginated) to show all available dates in dropdown
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    allAppointmentsForDates.forEach(apt => {
      const date = apt.appointment_date.split('T')[0];
      dates.add(date);
    });
    return Array.from(dates).sort();
  }, [allAppointmentsForDates]);

  // Dropdown dates: includes selected date even if it has no appointments
  // This keeps header and dropdown in sync
  const dropdownDates = useMemo(() => {
    const dates = new Set([selectedDate, ...availableDates]);
    return Array.from(dates).sort();
  }, [selectedDate, availableDates]);

  // Create markedDates Map for calendar (date string -> appointment count)
  // Counts ALL appointments (including completed, cancelled, no_show)
  // This allows healthcare admins to see historical data in the calendar
  const markedDates = useMemo(() => {
    const dateMap = new Map<string, number>();
    allAppointmentsForDates.forEach(apt => {
      const dateKey = apt.appointment_date.split('T')[0]; // YYYY-MM-DD
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    return dateMap;
  }, [allAppointmentsForDates]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Server-side statistics for filter badges
  const [statistics, setStatistics] = useState<AppointmentStatistics>({
    total: 0, pending: 0, scheduled: 0, verified: 0, in_progress: 0, completed: 0, cancelled: 0, no_show: 0,
  });

  // Approval/Rejection state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [appointmentToApprove, setAppointmentToApprove] = useState<AdminAppointment | null>(null);

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

  // Start consultation confirmation dialog state
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [appointmentToStart, setAppointmentToStart] = useState<string | null>(null);

  // Check-in confirmation dialog state
  const [showVerifyDialog, setShowCheckInDialog] = useState(false);
  const [appointmentToVerify, setAppointmentToCheckIn] = useState<AdminAppointment | null>(null);

  // No-show confirmation dialog state
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [appointmentToNoShow, setAppointmentToNoShow] = useState<AdminAppointment | null>(null);

  // Schedule appointment confirmation dialog state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [appointmentToSchedule, setAppointmentToSchedule] = useState<string | null>(null);

  // Complete appointment confirmation dialog state
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<AdminAppointment | null>(null);

  // Stage tracking modals state
  const [showLaboratoryModal, setShowLaboratoryModal] = useState(false);
  const [showCheckupModal, setShowCheckupModal] = useState(false);
  const [showReleasingModal, setShowReleasingModal] = useState(false);

  // Cancel pending appointment confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

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

  // Fetch ALL appointments for dropdown dates (only once on mount)
  useEffect(() => {
    if (hasAccess) {
      fetchAllAppointmentsForDates();
    }
  }, [hasAccess]);

  // Auto-select most recent appointment date when data loads
  useEffect(() => {
    if (availableDates.length > 0 && selectedDate === 'all') {
      // Set to most recent date (last in sorted array)
      const mostRecentDate = availableDates[availableDates.length - 1];
      console.log('📅 [AUTO-SELECT] Setting selectedDate to most recent:', mostRecentDate);
      setSelectedDate(mostRecentDate);
    }
  }, [availableDates, selectedDate]);

  // ✅ FIXED: Reset to page 1 when selectedDate changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

  // Fetch appointments when page changes, date changes, or on initial mount
  // ✅ FIXED: Now refetches when selectedDate changes (server-side filtering)
  useEffect(() => {
    if (hasAccess) {
      fetchAppointments();
    }
  }, [currentPage, selectedDate, hasAccess]);

  // Fetch last history entries when appointments data changes
  // Dependencies on full appointments array (not just length) to trigger when status updates
  useEffect(() => {
    if (appointments.length > 0) {
      fetchAllLastHistoryEntries();
    }
  }, [appointments]);

  const fetchAllLastHistoryEntries = async () => {
    const entries: Record<string, { id: string; from_status: string | null }> = {};

    await Promise.all(
      appointments.map(async (appointment) => {
        try {
          // Fetch history for this appointment
          const response = await fetch(`/api/appointments/${appointment.id}/history`);
          const data = await response.json();

          if (data.success && data.data.length > 0) {
            // Get the most recent forward (non-reversion) status change that led to current status
            // The from_status of that entry tells us where to revert back to
            // Use appointment.status from the appointments array (which should be fresh after fetchAppointments)
            const lastEntry = data.data
              .filter((entry: any) =>
                entry.from_status !== null &&
                !entry.is_reversion &&
                entry.to_status === appointment.status
              )
              .sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0];

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

  // Auto-sync selectedAppointment with fresh data when appointments update
  // This prevents stale data in drawer/modals after status changes
  useEffect(() => {
    if (!isDrawerOpen || !selectedAppointment) return;

    const freshAppointment = appointments.find(apt => apt.id === selectedAppointment.id);

    // Only update if appointment exists and status actually changed
    if (freshAppointment && freshAppointment.status !== selectedAppointment.status) {
      console.log(`🔄 [STATE SYNC] Auto-updating selectedAppointment: ${selectedAppointment.status} → ${freshAppointment.status}`);
      setSelectedAppointment(freshAppointment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, isDrawerOpen]);

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

  // Fetch ALL appointments (for dropdown dates only) - no pagination
  const fetchAllAppointmentsForDates = async () => {
    setDatesLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Fetch up to 1000 appointments for date dropdown
        // Fetch ALL appointments including completed, cancelled, no_show
        // This ensures historical dates appear in the dropdown
        // (No status filter - API defaults to excluding only 'draft')
      });

      const response = await fetch(`/api/appointments?${params.toString()}`);
      const data = await response.json();

      console.log('📅 [ALL APPOINTMENTS FOR DATES] API Response:', {
        success: data.success,
        appointmentsCount: data.data?.length || 0,
        message: 'Fetched all appointments for dropdown dates',
      });

      if (!response.ok) {
        console.error('Failed to fetch all appointments for dates');
        return;
      }

      if (data.success) {
        setAllAppointmentsForDates(data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching all appointments for dates:', err);
      // Don't show error to user - this is background fetch for dates only
    } finally {
      setDatesLoading(false);
    }
  };

  const fetchAppointments = async () => {
    setAppointmentsLoading(true);
    setError('');
    try {
      // Hybrid approach: When specific date selected, fetch ALL for that date (no pagination)
      // When viewing all dates, use pagination normally
      const isDateFiltered = selectedDate !== 'all';

      const params = new URLSearchParams({
        page: isDateFiltered ? '1' : currentPage.toString(),
        limit: isDateFiltered ? '1000' : pageSize.toString(), // Fetch all appointments for selected date
      });

      // Add search query
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // ✅ FIXED: Apply date filter server-side when specific date is selected
      if (isDateFiltered) {
        params.append('date', selectedDate);
      }

      // Status filtering is handled client-side (like walk-in page)

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

        // Update server-side statistics for filter badges
        if (data.statistics) {
          const stats = data.statistics;
          setStatistics({
            total: (stats.pending || 0) + (stats.scheduled || 0) + (stats.verified || 0) + (stats.in_progress || 0) + (stats.completed || 0) + (stats.cancelled || 0) + (stats.no_show || 0),
            pending: stats.pending || 0,
            scheduled: stats.scheduled || 0,
            verified: stats.verified || 0,
            in_progress: stats.in_progress || 0,
            completed: stats.completed || 0,
            cancelled: stats.cancelled || 0,
            no_show: stats.no_show || 0,
          });
        }
      } else {
        setError(data.error || 'Failed to load appointments');
      }
    } catch (err) {
      console.error('❌ [APPOINTMENTS] Fetch error:', err);
      setError('An unexpected error occurred');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // ✅ FIXED: No more client-side date filtering needed (done server-side)
  // appointments array already contains only the selected date's appointments
  // We only need to apply status filtering client-side

  // Filter by status ONLY (for table display)
  const dateFilteredAppointments = useMemo(() => {
    let filtered = appointments;

    // Apply status filter client-side (like walk-in page)
    if (filter !== 'all') {
      filtered = filtered.filter(apt => apt.status === filter);
    }

    return filtered;
  }, [appointments, filter]);

  // Statistics are now computed server-side and set via setStatistics in fetchAppointments

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
    // Prevent rapid clicks during data refresh
    if (actionLoading) return;

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
        // Close UI
        setShowRevertDialog(false);
        setIsDrawerOpen(false);
        setSelectedAppointment(null);
        setPendingRevert(null);
        toast.success('Appointment status reverted successfully');

        // Refetch appointments and history to get latest data
        await fetchAppointments();
        await fetchAllLastHistoryEntries();
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

  const handleVerify = (appointment: AdminAppointment) => {
    // Show confirmation dialog before checking in
    setAppointmentToCheckIn(appointment);
    setShowCheckInDialog(true);
  };

  const handleSchedule = (appointmentId: string) => {
    // Show confirmation dialog before scheduling
    setAppointmentToSchedule(appointmentId);
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = async () => {
    if (!appointmentToSchedule) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${appointmentToSchedule}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule appointment');
      }

      // Close UI
      setShowScheduleDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);
      toast.success('Appointment scheduled successfully');

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule appointment');
    } finally {
      setActionLoading(false);
      setAppointmentToSchedule(null);
    }
  };

  const handleApproveAppointment = async () => {
    if (!appointmentToApprove) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${appointmentToApprove.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
          action: 'approve'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve appointment');
      }

      // Close UI
      setShowApproveDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);
      setAppointmentToApprove(null);
      toast.success('Appointment approved successfully');

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    // Show confirmation dialog before cancelling
    setAppointmentToCancel(appointmentId);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async (reason?: string) => {
    if (!appointmentToCancel) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${appointmentToCancel}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: reason || 'Cancelled by healthcare admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      // Close UI
      setShowCancelDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);
      toast.success('Appointment cancelled successfully');

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
      setAppointmentToCancel(null);
    }
  };

  const handleConfirmVerify = async () => {
    if (!appointmentToVerify) return;

    try {
      setActionLoading(true);

      // For HealthCard and Pink Card appointments, also set appointment_stage to 'verification'
      // Use service_id directly (more reliable than services.category which may be undefined)
      // HealthCard service IDs: 1, 2, 3, 12 | Pink Card: 24
      const isCardService = [1, 2, 3, 12, 24].includes(appointmentToVerify.service_id);
      const requestBody: any = { status: 'verified' };

      if (isCardService) {
        requestBody.appointment_stage = 'verification';
      }

      const response = await fetch(`/api/appointments/${appointmentToVerify.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in patient');
      }

      // Close UI
      setShowCheckInDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);
      toast.success('Patient verified successfully');

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error checking in patient:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to check in patient');
    } finally {
      setActionLoading(false);
      setAppointmentToCheckIn(null);
    }
  };

  const handleMarkNoShow = (appointment: AdminAppointment) => {
    // Show confirmation dialog before marking as no-show
    setAppointmentToNoShow(appointment);
    setShowNoShowDialog(true);
  };

  const handleConfirmNoShow = async (reason?: string) => {
    if (!appointmentToNoShow) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${appointmentToNoShow.id}/mark-no-show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Manually marked as no-show by healthcare admin' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark appointment as no-show');
      }

      // Close UI and show success message
      setShowNoShowDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);

      const suspensionWarning = data.data?.suspension_applied
        ? ' Patient account has been suspended due to reaching 2 no-shows.'
        : '';
      toast.success(`Appointment marked as no-show successfully. No-show count: ${data.data?.no_show_count || 'N/A'}.${suspensionWarning}`);

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error marking appointment as no-show:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mark appointment as no-show');
    } finally {
      setActionLoading(false);
      setAppointmentToNoShow(null);
    }
  };

  const handleStartConsultation = (appointmentId: string) => {
    // Show confirmation dialog before starting consultation
    console.log(`🔘 [START BUTTON] Clicked for appointment ID: ${appointmentId}`);

    // Verify appointment exists in current data
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment) {
      console.log(`✅ [START BUTTON] Appointment found:`, {
        id: appointment.id,
        number: appointment.appointment_number,
        status: appointment.status,
        patient: `${appointment.patients.profiles.first_name} ${appointment.patients.profiles.last_name}`,
        time: appointment.appointment_time,
      });
    } else {
      console.warn(`⚠️ [START BUTTON] Appointment ${appointmentId} not found in current data!`);
    }

    setAppointmentToStart(appointmentId);
    setShowStartDialog(true);
  };

  const handleConfirmStart = async () => {
    if (!appointmentToStart) return;

    console.log(`✅ [START CONFIRM] Starting consultation for appointment ID: ${appointmentToStart}`);

    // Verify the appointment still exists and is in correct state
    const appointmentToUpdate = appointments.find(apt => apt.id === appointmentToStart);
    if (!appointmentToUpdate) {
      console.error(`❌ [START CONFIRM] Appointment ${appointmentToStart} not found!`);
      toast.error('Appointment not found. Please refresh the page.');
      setShowStartDialog(false);
      setAppointmentToStart(null);
      return;
    }

    if (appointmentToUpdate.status !== 'verified') {
      console.error(`❌ [START CONFIRM] Invalid status. Expected 'verified', got '${appointmentToUpdate.status}'`);
      toast.error(`Cannot start appointment. Current status: ${appointmentToUpdate.status}`);
      setShowStartDialog(false);
      setAppointmentToStart(null);
      await fetchAppointments();  // Refresh data
      return;
    }

    console.log(`✅ [START CONFIRM] Validation passed. Starting appointment #${appointmentToUpdate.appointment_number}`);

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${appointmentToStart}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start consultation');
      }

      console.log(`✅ [START CONFIRM] API response successful:`, data);

      // Close UI
      setShowStartDialog(false);
      setIsDrawerOpen(false);
      setSelectedAppointment(null);
      toast.success('Consultation started');

      // Refetch appointments and history to get latest data
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('❌ [START CONFIRM] Error starting consultation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start consultation');
    } finally {
      setActionLoading(false);
      setAppointmentToStart(null);
    }
  };

  // Open complete appointment confirmation dialog
  const handleCompleteAppointment = (appointment: AdminAppointment) => {
    setAppointmentToComplete(appointment);
    setShowCompleteDialog(true);
  };

  // Confirm and execute appointment completion
  const handleConfirmComplete = async () => {
    if (!appointmentToComplete) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentToComplete.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete appointment');
      }

      // Close UI and show success
      setIsDrawerOpen(false);
      setSuccessMessage('Appointment completed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refetch appointments and history
      await fetchAppointments();
      await fetchAllLastHistoryEntries();
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast?.error('Failed to complete appointment');
    } finally {
      setActionLoading(false);
      setShowCompleteDialog(false);
      setAppointmentToComplete(null);
    }
  };

  // Date navigation - jumps to previous/next date in dropdown
  const handlePreviousDate = () => {
    const currentIndex = dropdownDates.indexOf(selectedDate);
    if (currentIndex > 0) {
      setSelectedDate(dropdownDates[currentIndex - 1]);
    }
  };

  const handleNextDate = () => {
    const currentIndex = dropdownDates.indexOf(selectedDate);
    if (currentIndex < dropdownDates.length - 1) {
      setSelectedDate(dropdownDates[currentIndex + 1]);
    }
  };

  const handleTodayClick = () => {
    const nowPHT = getPhilippineTime();
    const today = `${nowPHT.getUTCFullYear()}-${String(nowPHT.getUTCMonth() + 1).padStart(2, '0')}-${String(nowPHT.getUTCDate()).padStart(2, '0')}`;

    // Always show today's date, even if there are no appointments
    // This allows users to see the current date with empty state instead of redirecting to another date
    setSelectedDate(today);
  };

  const handleTomorrowClick = () => {
    const nowPHT = getPhilippineTime();
    nowPHT.setUTCDate(nowPHT.getUTCDate() + 1);
    const tomorrow = `${nowPHT.getUTCFullYear()}-${String(nowPHT.getUTCMonth() + 1).padStart(2, '0')}-${String(nowPHT.getUTCDate()).padStart(2, '0')}`;

    // Always show tomorrow's date, even if there are no appointments
    // This allows users to see the next day with empty state instead of jumping to another date
    setSelectedDate(tomorrow);
  };

  const exportToCSV = () => {
    const filteredData = dateFilteredAppointments;
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
    a.download = `appointments_${selectedDate}.csv`;
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
      header: 'Health Card Type',
      accessor: 'card_type',
      sortable: true,
      render: (value: HealthCardType | undefined) => {
        if (!value) return <span className="text-gray-400 text-xs italic">N/A</span>;
        const cardInfo = getHealthCardTypeInfo(value);
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
            cardInfo.badgeColor
          }`}>
            {cardInfo.label}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: AdminAppointment['status'], row: AdminAppointment) => (
        <div className="flex flex-col gap-1">
          {getStatusBadge(value)}
          {row.verified_at && row.status === 'verified' && (
            <TimeElapsedBadge
              timestamp={row.verified_at}
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
          {row.status === 'completed' && row.has_medical_record && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
              <FileText className="w-3 h-3 mr-1" />
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
        return (
          <button
            onClick={() => handleViewDetails(row)}
            className="inline-flex items-center px-3 py-1.5 bg-[#20C997] text-white text-xs font-medium rounded-md hover:bg-[#1AA179] transition-colors"
          >
            <Eye className="w-3 h-3 mr-1.5" />
            View
          </button>
        );
      },
    },
  ];

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <DashboardLayout roleId={user?.role_id || 2} pageTitle="Appointments" pageDescription="Loading...">
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
      <DashboardLayout roleId={user?.role_id || 2} pageTitle="Access Denied" pageDescription="Redirecting...">
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
      roleId={user?.role_id || 2}
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
          <>
            {/* Date Selector Skeleton */}
            <div className="bg-white rounded-lg shadow p-6 mb-6 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-40"></div>
              </div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter Buttons Skeleton */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-full w-36 animate-pulse"></div>
              ))}
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="py-4 border-b border-gray-200 last:border-b-0 animate-pulse">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : availableDates.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Appointments Found</h2>
            <p className="text-gray-600 mb-4">
              There are currently no appointments scheduled for your service.
            </p>
            <p className="text-sm text-gray-500">
              Appointments will appear here once patients book or when you create them.
            </p>
          </div>
        ) : (
          <>
            {/* Date Selector - Compact Button */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Date Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-teal/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary-teal" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} total
                      {filter !== 'all' && dateFilteredAppointments.length !== appointments.length && (
                        <span className="ml-1 text-primary-teal font-medium">
                          • {dateFilteredAppointments.length} filtered
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Change Date Button */}
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-teal/10 hover:bg-primary-teal/20 text-primary-teal rounded-lg transition-colors font-medium text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Change Date</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Calendar Modal */}
            <DateCalendarModal
              isOpen={isCalendarModalOpen}
              onClose={() => setIsCalendarModalOpen(false)}
              selectedDate={new Date(selectedDate + 'T00:00:00')}
              onDateSelect={(date) => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                setSelectedDate(dateStr);
              }}
              markedDates={markedDates}
            />

            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All Appointments', count: statistics.total, color: 'gray', icon: ListChecks },
                { id: 'pending', label: 'Pending', count: statistics.pending, color: 'orange', icon: Clock },
                { id: 'scheduled', label: 'Scheduled', count: statistics.scheduled, color: 'blue', icon: Calendar },
                { id: 'verified', label: 'Verified', count: statistics.verified, color: 'purple', icon: UserCheck },
                { id: 'in_progress', label: 'In Progress', count: statistics.in_progress, color: 'amber', icon: Activity },
                { id: 'completed', label: 'Completed', count: statistics.completed, color: 'green', icon: CheckCircle },
                { id: 'cancelled', label: 'Cancelled', count: statistics.cancelled, color: 'gray', icon: XCircle },
                { id: 'no_show', label: 'No Show', count: statistics.no_show, color: 'red', icon: AlertCircle },
              ]
                .filter((statusFilter) => {
                  // Hide "pending" tab for HIV (16) and Pregnancy (17) services
                  // since their appointments skip pending and go directly to scheduled
                  if (statusFilter.id === 'pending' && (user?.assigned_service_id === 16 || user?.assigned_service_id === 17)) {
                    return false;
                  }
                  return true;
                })
                .map((statusFilter) => {
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
                disabled={dateFilteredAppointments.length === 0}
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
                data={dateFilteredAppointments}
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

                  {/* Elapsed Time Badges */}
                  {selectedAppointment.status === 'verified' && selectedAppointment.verified_at && (
                    <TimeElapsedBadge
                      timestamp={selectedAppointment.verified_at}
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

              {/* Appointment Stage Tracker - Only for HealthCard (Service 12) and Pink Card (Service 24) */}
              {(selectedAppointment.services?.category === 'healthcard' || selectedAppointment.services?.category === 'pink_card') && selectedAppointment.card_type && (
                <AppointmentStageTracker
                  currentStage={selectedAppointment.appointment_stage || null}
                  isHealthCardService={true}
                  isVerified={selectedAppointment.status === 'verified' || selectedAppointment.status === 'in_progress' || selectedAppointment.status === 'completed'}
                  isCompleted={selectedAppointment.status === 'completed'}
                />
              )}

              {/* Stage Actions - Healthcare Admin controls Check-in, Check-up, and Releasing */}
              {/* Patient controls Laboratory stage only */}
              {(selectedAppointment.services?.category === 'healthcard' || selectedAppointment.services?.category === 'pink_card') &&
                selectedAppointment.card_type &&
                (selectedAppointment.status === 'verified' || selectedAppointment.status === 'in_progress') &&
                selectedAppointment.status !== 'completed' && (
                <div className="space-y-2 pt-2 pb-4 border-b border-gray-200">
                  {/* Check-up Stage - Admin advances from Results to Check-up */}
                  {selectedAppointment.appointment_stage === 'results' && (
                    <button
                      onClick={() => setShowCheckupModal(true)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Activity className="w-5 h-5" />
                      Start Doctor Check-up
                    </button>
                  )}

                  {/* Check-up Stage - Admin advances from Check-up to Releasing */}
                  {selectedAppointment.appointment_stage === 'checkup' && (
                    <button
                      onClick={() => setShowCheckupModal(true)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Activity className="w-5 h-5" />
                      Complete Check-up
                    </button>
                  )}

                  {/* Releasing Stage - Admin releases health card */}
                  {selectedAppointment.appointment_stage === 'releasing' && (
                    <button
                      onClick={() => setShowReleasingModal(true)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Release Health Card
                    </button>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    Patient controls Laboratory stage
                  </p>
                </div>
              )}

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

                {/* Document Review Section - For services with card_type (Health Cards) */}
                {(
                  (selectedAppointment.services?.category === 'healthcard' && selectedAppointment.card_type) ||
                  (selectedAppointment.services?.category === 'pink_card' && selectedAppointment.card_type)
                ) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      {selectedAppointment.status === 'pending' ? 'Document Verification' : 'Requirements'}
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
                    </div>
                  </div>
                )}

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

                {/* Timeline */}
                {(selectedAppointment.verified_at || selectedAppointment.started_at || selectedAppointment.completed_at) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Timeline
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedAppointment.verified_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-gray-500">Verified:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.verified_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.started_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-500">Started:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.started_at).toLocaleString()}</span>
                        </div>
                      )}
                      {selectedAppointment.completed_at && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-gray-500">Completed:</span>
                          <span className="text-gray-900">{new Date(selectedAppointment.completed_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col gap-3">
                {/* Approve/Reject Buttons for Pending Appointments */}
                {selectedAppointment.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setAppointmentToApprove(selectedAppointment);
                        setShowApproveDialog(true);
                      }}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve Appointment
                    </button>
                    <button
                      onClick={() => {
                        setAppointmentToApprove(selectedAppointment);
                        setShowRejectModal(true);
                      }}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Appointment
                    </button>
                  </>
                )}

                {/* Verify Button */}
                {selectedAppointment.status === 'scheduled' && (
                  <button
                    onClick={() => handleVerify(selectedAppointment)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    Verify Patient
                  </button>
                )}

                {/* Start Consultation Button - Only for non-card services (HIV Counseling, Prenatal) */}
                {selectedAppointment.status === 'verified' &&
                  !(selectedAppointment.services?.category === 'healthcard' || selectedAppointment.services?.category === 'pink_card') &&
                  !selectedAppointment.card_type && (
                  <button
                    onClick={() => handleStartConsultation(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Start Consultation
                  </button>
                )}

                {/* Stage Advancement Buttons moved above (directly below AppointmentStageTracker) for better UX */}

                {/* Complete Appointment Button - Hidden for card services with stage tracking */}
                {selectedAppointment.status === 'in_progress' &&
                  !((selectedAppointment.services?.category === 'healthcard' || selectedAppointment.services?.category === 'pink_card') && selectedAppointment.appointment_stage) && (
                  <button
                    onClick={() => handleCompleteAppointment(selectedAppointment)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Appointment
                  </button>
                )}

                {/* Mark as No Show Button */}
                {(selectedAppointment.status === 'scheduled' ||
                  selectedAppointment.status === 'verified' ||
                  selectedAppointment.status === 'in_progress') && (
                  <button
                    onClick={() => handleMarkNoShow(selectedAppointment)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Mark as No Show
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

                {/* Undo Button - Simplified conditions matching walk-in pattern */}
                {lastHistoryEntries[selectedAppointment.id]?.from_status &&
                 (selectedAppointment.status === 'verified' ||
                  selectedAppointment.status === 'in_progress' ||
                  (selectedAppointment.status === 'completed' &&
                   hasMedicalRecords[selectedAppointment.id] === false)) && (
                  <button
                    onClick={() => handleQuickUndo(selectedAppointment.id)}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium text-sm border border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {actionLoading ? 'Processing...' : 'Undo Last Action'}
                  </button>
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

        {/* Schedule Appointment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showScheduleDialog}
          onClose={() => {
            setShowScheduleDialog(false);
            setAppointmentToSchedule(null);
          }}
          onConfirm={handleConfirmSchedule}
          title="Schedule Appointment"
          message="Schedule this pending appointment? This will change the status to 'scheduled' and the patient can check in on the appointment date."
          confirmText="Schedule Appointment"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
        />

        {/* Cancel Appointment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={() => {
            setShowCancelDialog(false);
            setAppointmentToCancel(null);
          }}
          onConfirm={handleConfirmCancel}
          title="Cancel Appointment"
          message="Are you sure you want to cancel this pending appointment? This action will notify the patient and free up the appointment slot."
          confirmText="Cancel Appointment"
          cancelText="Keep Appointment"
          variant="danger"
          showReasonInput={true}
          reasonLabel="Reason for cancellation (optional)"
          reasonPlaceholder="E.g., Patient requested cancellation, Documents not verified, Service unavailable"
          isLoading={actionLoading}
        />

        {/* Verify Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showVerifyDialog}
          onClose={() => {
            setShowCheckInDialog(false);
            setAppointmentToCheckIn(null);
          }}
          onConfirm={handleConfirmVerify}
          title="Verify Patient"
          message="Confirm that the patient has arrived and is ready for service. This will mark the appointment as verified and record the arrival time."
          confirmText="Verify Patient"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
        />

        {/* Start Consultation Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showStartDialog}
          onClose={() => {
            setShowStartDialog(false);
            setAppointmentToStart(null);
          }}
          onConfirm={handleConfirmStart}
          title="Start Consultation"
          message="Begin the consultation with this patient? This will mark the appointment as in progress and record the start time."
          confirmText="Start Consultation"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
        />

        {/* No-Show Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showNoShowDialog}
          onClose={() => {
            setShowNoShowDialog(false);
            setAppointmentToNoShow(null);
          }}
          onConfirm={handleConfirmNoShow}
          title="Mark Appointment as No Show"
          message={
            appointmentToNoShow
              ? `Are you sure you want to mark appointment #${appointmentToNoShow.appointment_number} (${appointmentToNoShow.patients.profiles.first_name} ${appointmentToNoShow.patients.profiles.last_name}) as no-show?\n\n⚠️ Important:\n• This will increment the patient's no-show count\n• If the patient reaches 2 no-shows, their account will be automatically suspended for 1 month\n• The patient will receive a notification about this action\n• This action will be logged in the status history\n\nOnly proceed if the patient did not arrive for their scheduled appointment.`
              : 'Are you sure you want to mark this appointment as no-show?'
          }
          confirmText="Mark as No Show"
          cancelText="Cancel"
          variant="danger"
          showReasonInput={true}
          reasonLabel="Reason for marking as no-show (optional)"
          reasonPlaceholder="E.g., Patient did not arrive, No response to calls, Confirmed absence"
          isLoading={actionLoading}
        />

        {/* Complete Appointment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showCompleteDialog}
          onClose={() => {
            setShowCompleteDialog(false);
            setAppointmentToComplete(null);
          }}
          onConfirm={handleConfirmComplete}
          title="Complete Appointment"
          message={
            appointmentToComplete
              ? `Are you sure you want to mark appointment #${appointmentToComplete.appointment_number} (${appointmentToComplete.patients.profiles.first_name} ${appointmentToComplete.patients.profiles.last_name}) as complete?\n\nThis will:\n• Close the appointment\n• Mark it as completed in the system\n• Log the completion in status history\n\nThis action cannot be easily undone.`
              : 'Are you sure you want to complete this appointment?'
          }
          confirmText="Complete Appointment"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
        />

        {/* Status Reversion Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRevertDialog}
          onClose={() => setShowRevertDialog(false)}
          onConfirm={handleConfirmRevert}
          title="Revert Appointment Status"
          message={
            pendingRevert?.currentStatus === 'verified' || pendingRevert?.currentStatus === 'in_progress'
              ? `Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"?\n\n⚠️ Important: This will erase the ${pendingRevert.currentStatus === 'verified' ? 'verification' : 'start'} timestamp from records, which affects wait time statistics. Only proceed if this was an error or the patient needs to be rescheduled.\n\nThis action will be logged in the status history with your reason.`
              : `Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"? This action will be logged in the status history.`
          }
          confirmText="Revert Status"
          cancelText="Cancel"
          variant="warning"
          showReasonInput={true}
          reasonLabel="Reason for reversion (required)"
          reasonPlaceholder={
            pendingRevert?.currentStatus === 'verified' || pendingRevert?.currentStatus === 'in_progress'
              ? "E.g., Patient left before being seen, Wrong patient verified, Technical error"
              : "E.g., Accidentally changed status, need to correct error"
          }
          isLoading={actionLoading}
        />

        {/* Stage Tracking Modals */}
        {selectedAppointment && (
          <>
            {/* Check-up Stage Modal - Healthcare admin advances from Results to Check-up to Releasing */}
            <CheckupStageModal
              isOpen={showCheckupModal}
              onClose={() => setShowCheckupModal(false)}
              appointmentId={selectedAppointment.id}
              currentStage={selectedAppointment.appointment_stage || null}
              onStageUpdate={() => {
                fetchAppointments(currentPage);
                setShowCheckupModal(false);
                setIsDrawerOpen(false);
                setSelectedAppointment(null);
              }}
            />

            {/* Releasing Stage Modal - Admin controls final release */}
            <ReleasingStageModal
              isOpen={showReleasingModal}
              onClose={() => setShowReleasingModal(false)}
              appointmentId={selectedAppointment.id}
              patientName={`${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`}
              cardType={selectedAppointment.card_type || 'food_handler'}
              currentStage={selectedAppointment.appointment_stage}
              onComplete={() => {
                fetchAppointments(currentPage);
                setShowReleasingModal(false);
                setIsDrawerOpen(false);
                setSelectedAppointment(null);
              }}
            />
          </>
        )}

        {/* Approve Appointment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showApproveDialog}
          onClose={() => {
            setShowApproveDialog(false);
            setAppointmentToApprove(null);
          }}
          onConfirm={handleApproveAppointment}
          title="Approve Appointment"
          message={appointmentToApprove ? `Are you sure you want to approve this appointment for ${appointmentToApprove.patients?.profiles ? `${appointmentToApprove.patients.profiles.first_name} ${appointmentToApprove.patients.profiles.last_name}` : 'this patient'}? This will change the status to SCHEDULED and notify the patient.` : ''}
          confirmText="Approve Appointment"
          confirmButtonClass="bg-green-600 hover:bg-green-700 text-white"
          isLoading={actionLoading}
        />

        {/* Rejection Reason Modal */}
        <RejectionReasonModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setAppointmentToApprove(null);
          }}
          appointmentId={appointmentToApprove?.id || ''}
          onSuccess={() => {
            fetchAppointments(currentPage);
            setShowRejectModal(false);
            setAppointmentToApprove(null);
            setIsDrawerOpen(false);
            setSelectedAppointment(null);
          }}
        />
      </Container>
    </DashboardLayout>
  );
}
