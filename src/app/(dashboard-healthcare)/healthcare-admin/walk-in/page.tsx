'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button, Container, ProfessionalCard } from '@/components/ui';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { WalkInRegistrationModal } from '@/components/walk-in/WalkInRegistrationModal';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';
import { formatTimeBlock, getTimeBlockColor, TIME_BLOCKS, TimeBlock } from '@/types/appointment';
import {
  UserPlus,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  Clock,
  ClipboardCheck,
  RotateCcw,
  History,
  Mail,
  Phone,
  MapPin,
  Droplet,
  Heart,
  FileText,
  Calendar,
  User as UserIcon,
  Download,
  Search,
  PlayCircle
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { format } from 'date-fns';

interface WalkInPatient {
  id: string;
  appointment_id: string; // For API calls to update status
  queue_number: number;
  first_name: string;
  last_name: string;
  patient_number: string;
  date_of_birth: string;
  gender: string;
  email: string;
  contact_number: string;
  barangay_id: number;
  barangay_name: string;
  emergency_contact?: {
    name: string;
    phone: string;
    email?: string;
  };
  blood_type?: string;
  allergies?: string[];
  current_medications?: string;
  appointment_time: string;
  checked_in_at?: string;
  started_at?: string;
  completed_at?: string;
  registered_at: string;
  status: 'waiting' | 'in_progress' | 'completed';
}

interface StatusHistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by_profile: {
    first_name: string;
    last_name: string;
    role: string;
  } | null;
  reason?: string | null;
  is_reversion?: boolean;
  reverted_from_history_id?: string | null;
  change_type?: string;
  metadata?: Record<string, any> | null;
}

/**
 * Walk-in Queue Page
 * For Healthcare Admins assigned to walk-in services
 *
 * Features:
 * - Register walk-in patients directly (no appointment needed)
 * - Bypasses 7-day advance booking rule
 * - Shows real-time walk-in queue
 * - Marks patients as in-progress or completed
 *
 * Note: Legacy walk-in services (Emergency Consultation, Health Education Seminar)
 * have been deactivated. This page remains for potential future walk-in services.
 */
export default function WalkInQueuePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [walkInQueue, setWalkInQueue] = useState<WalkInPatient[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [serviceName, setServiceName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [processingAppointmentId, setProcessingAppointmentId] = useState<string | null>(null);

  // Registration modal state
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Drawer and modals state
  const [selectedPatient, setSelectedPatient] = useState<WalkInPatient | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [lastHistoryEntries, setLastHistoryEntries] = useState<Record<string, { id: string; from_status: string | null } | null>>({});
  const [hasMedicalRecords, setHasMedicalRecords] = useState<Record<string, boolean | null>>({});

  // Confirmation dialog state
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<{
    historyId: string;
    targetStatus: string;
    appointmentId: string;
    currentStatus: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    checked_in: 0,
    in_progress: 0,
    completed: 0
  });

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_progress' | 'completed'>('all');
  const [filteredQueue, setFilteredQueue] = useState<WalkInPatient[]>([]);

  // Barangays for modal
  const [barangays, setBarangays] = useState<Array<{ id: number; name: string }>>([]);

  // Fetch last history entries for all appointments (for undo functionality)
  const fetchAllLastHistoryEntries = async () => {
    if (walkInQueue.length === 0) return;

    const entries: Record<string, { id: string; from_status: string | null } | null> = {};

    for (const patient of walkInQueue) {
      try {
        const res = await fetch(`/api/appointments/${patient.appointment_id}/history`);
        const data = await res.json();

        if (res.ok && data.success && data.data) {
          // Find the most recent forward status change (not a reversion)
          const history = data.data as StatusHistoryEntry[];
          const lastForwardChange = history
            .filter((entry: StatusHistoryEntry) => entry.from_status !== null && !entry.is_reversion)
            .sort((a: StatusHistoryEntry, b: StatusHistoryEntry) =>
              new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
            )[0];

          if (lastForwardChange && lastForwardChange.from_status) {
            entries[patient.appointment_id] = {
              id: lastForwardChange.id,
              from_status: lastForwardChange.from_status
            };
          } else {
            entries[patient.appointment_id] = null;
          }
        }
      } catch (error) {
        console.error(`Error fetching history for appointment ${patient.appointment_id}:`, error);
        entries[patient.appointment_id] = null;
      }
    }

    setLastHistoryEntries(entries);
  };

  // Fetch service name
  useEffect(() => {
    async function fetchServiceName() {
      if (!user?.assigned_service_id) return;

      try {
        const res = await fetch(`/api/services/${user.assigned_service_id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setServiceName(data.data.name);
        }
      } catch (error) {
        console.error('Error fetching service name:', error);
      }
    }

    fetchServiceName();
  }, [user?.assigned_service_id]);

  // Fetch barangays for dropdown
  useEffect(() => {
    async function fetchBarangays() {
      try {
        const res = await fetch('/api/barangays');
        const data = await res.json();
        if (data.success && data.data) {
          setBarangays(data.data);
        }
      } catch (error) {
        console.error('Error fetching barangays:', error);
      }
    }

    fetchBarangays();
  }, []);

  // Fetch today's walk-in queue
  useEffect(() => {
    async function fetchWalkInQueue() {
      if (!user?.assigned_service_id) return;

      setIsLoadingQueue(true);
      try {
        const res = await fetch('/api/walk-in/queue');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch walk-in queue');
        }

        if (data.success) {
          const patients = data.data || [];
          setWalkInQueue(patients);

          // Calculate statistics
          const stats = patients.reduce(
            (acc: any, patient: WalkInPatient) => {
              acc.total++;
              if (patient.status === 'waiting') acc.checked_in++;
              if (patient.status === 'in_progress') acc.in_progress++;
              if (patient.status === 'completed') acc.completed++;
              return acc;
            },
            { total: 0, checked_in: 0, in_progress: 0, completed: 0 }
          );
          setStatistics(stats);
        }
      } catch (error) {
        console.error('Error fetching walk-in queue:', error);
        toast.error('Failed to load walk-in queue');
      } finally {
        setIsLoadingQueue(false);
      }
    }

    fetchWalkInQueue();
  }, [user?.assigned_service_id, toast, refreshTrigger]);

  // Call fetchAllLastHistoryEntries when queue changes
  useEffect(() => {
    if (walkInQueue.length > 0) {
      fetchAllLastHistoryEntries();
    }
  }, [walkInQueue]);

  // Check medical records for completed appointments
  useEffect(() => {
    async function checkMedicalRecords() {
      if (walkInQueue.length === 0) return;

      const records: Record<string, boolean | null> = {};

      for (const patient of walkInQueue) {
        if (patient.status === 'completed') {
          try {
            const res = await fetch(`/api/appointments/${patient.appointment_id}/medical-records`);
            const data = await res.json();

            if (res.ok && data.success) {
              records[patient.appointment_id] = data.data && data.data.length > 0;
            } else {
              records[patient.appointment_id] = null;
            }
          } catch (error) {
            console.error(`Error checking medical records for appointment ${patient.appointment_id}:`, error);
            records[patient.appointment_id] = null;
          }
        }
      }

      setHasMedicalRecords(records);
    }

    checkMedicalRecords();
  }, [walkInQueue]);

  // Apply search and filters
  useEffect(() => {
    let filtered = [...walkInQueue];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(patient => patient.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        const queueNumber = patient.queue_number.toString();
        const patientNumber = patient.patient_number.toLowerCase();

        return (
          fullName.includes(query) ||
          queueNumber.includes(query) ||
          patientNumber.includes(query) ||
          patient.contact_number.includes(query)
        );
      });
    }

    setFilteredQueue(filtered);
  }, [walkInQueue, searchQuery, statusFilter]);

  // Handle registration modal success
  const handleRegistrationSuccess = () => {
    setShowRegistrationModal(false);
    setRefreshTrigger(prev => prev + 1); // Refresh queue
  };

  // Handle viewing patient details
  const handleViewDetails = async (patient: WalkInPatient) => {
    setSelectedPatient(patient);
    setShowDrawer(true);
  };

  // Handle starting a consultation with confirmation
  const handleStartConsultation = async (appointmentId: string) => {
    const patient = walkInQueue.find(p => p.appointment_id === appointmentId);
    if (!patient) return;

    setSelectedPatient(patient);
    setShowStartDialog(true);
  };

  const handleConfirmStart = async () => {
    if (!selectedPatient) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${selectedPatient.appointment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start consultation');
      }

      toast.success('Consultation started');
      setShowStartDialog(false);
      setSelectedPatient(null);
      setRefreshTrigger(prev => prev + 1); // Refresh queue
      // Refetch history to update undo button availability
      setTimeout(() => fetchAllLastHistoryEntries(), 500);
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start consultation');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle completing a consultation (direct completion)
  const handleCompleteConsultation = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
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
      setShowDrawer(false);
      setSelectedPatient(null);
      toast.success('Appointment completed successfully');
      setRefreshTrigger(prev => prev + 1);

      // Refetch history to update undo button availability
      setTimeout(() => fetchAllLastHistoryEntries(), 500);
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Failed to complete appointment');
    }
  };

  // Handle undo last action
  const handleQuickUndo = (appointmentId: string) => {
    const lastEntry = lastHistoryEntries[appointmentId];
    if (!lastEntry || !lastEntry.from_status) return;

    const patient = walkInQueue.find(p => p.appointment_id === appointmentId);
    if (!patient) return;

    setPendingRevert({
      historyId: lastEntry.id,
      targetStatus: lastEntry.from_status,
      appointmentId: appointmentId,
      currentStatus: patient.status === 'waiting' ? 'checked_in' : patient.status === 'in_progress' ? 'in_progress' : 'completed'
    });
    setShowRevertDialog(true);
  };

  // Handle confirm revert
  const handleConfirmRevert = async (reason?: string) => {
    if (!pendingRevert) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/appointments/${pendingRevert.appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revert_to_history_id: pendingRevert.historyId,
          reason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revert status');
      }

      toast.success('Status reverted successfully');
      setShowRevertDialog(false);
      setShowDrawer(false); // Close drawer after revert
      setPendingRevert(null);
      setRefreshTrigger(prev => prev + 1);
      // Refetch history to update undo button availability
      setTimeout(() => fetchAllLastHistoryEntries(), 500);
    } catch (error) {
      console.error('Error reverting status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revert status');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'waiting': 'checked_in',
      'in_progress': 'in_progress',
      'completed': 'completed'
    };

    const mappedStatus = statusMap[status] || status;
    const config = APPOINTMENT_STATUS_CONFIG[mappedStatus];
    const Icon = config?.icon || AlertCircle;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status === 'waiting' ? 'Waiting' : config?.label || status}
      </span>
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredQueue.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // CSV Headers
      const headers = [
        'Queue Number',
        'Patient Number',
        'First Name',
        'Last Name',
        'Contact Number',
        'Barangay',
        'Status',
        'Checked In At',
        'Started At',
        'Completed At',
        'Blood Type',
        'Allergies',
        'Current Medications'
      ];

      // CSV Rows
      const rows = filteredQueue.map(patient => [
        patient.queue_number,
        patient.patient_number,
        patient.first_name,
        patient.last_name,
        patient.contact_number,
        patient.barangay_name,
        patient.status === 'waiting' ? 'Waiting' : patient.status === 'in_progress' ? 'In Progress' : 'Completed',
        patient.checked_in_at ? new Date(patient.checked_in_at).toLocaleString() : '',
        patient.started_at ? new Date(patient.started_at).toLocaleString() : '',
        patient.completed_at ? new Date(patient.completed_at).toLocaleString() : '',
        patient.blood_type || '',
        patient.allergies ? patient.allergies.join(', ') : '',
        patient.current_medications || ''
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `walk-in-queue-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Queue exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export queue');
    }
  };

  // Define table columns for EnhancedTable
  const walkInTableColumns = [
    {
      header: 'Queue #',
      accessor: 'queue_number',
      sortable: true,
      render: (value: number) => (
        <span className="font-mono font-semibold text-primary-teal text-xl">
          #{value}
        </span>
      ),
    },
    {
      header: 'Patient',
      accessor: 'first_name', // For sorting purposes
      sortable: true,
      render: (_: any, row: WalkInPatient) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {row.first_name} {row.last_name}
          </p>
          <p className="text-xs text-gray-500 font-mono">{row.patient_number}</p>
        </div>
      ),
    },
    {
      header: 'Date',
      accessor: 'appointment_date',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span className="text-sm text-gray-700">
            {format(new Date(value), 'MMM d, yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Time Block',
      accessor: 'appointment_time',
      sortable: false,
      render: (value: string) => {
        const hour = parseInt(value.split(':')[0]);
        const timeBlock: TimeBlock = hour < 13 ? 'AM' : 'PM';
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(timeBlock)}`}>
              {timeBlock}
            </span>
            <span className="text-xs text-gray-600">
              {TIME_BLOCKS[timeBlock].timeRange}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string, row: WalkInPatient) => {
        const statusMap: Record<string, string> = {
          'waiting': 'checked_in',
          'in_progress': 'in_progress',
          'completed': 'completed'
        };
        const mappedStatus = statusMap[value] || value;
        const config = APPOINTMENT_STATUS_CONFIG[mappedStatus];
        const Icon = config?.icon || AlertCircle;

        return (
          <div className="flex flex-col gap-1">
            {value === 'in_progress' && row.started_at && (
              <TimeElapsedBadge
                timestamp={row.started_at}
                label="Consulting"
                type="consulting"
              />
            )}
            {value === 'waiting' && row.checked_in_at && (
              <TimeElapsedBadge
                timestamp={row.checked_in_at}
                label="Waiting"
                type="waiting"
              />
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
              <Icon className="w-3 h-3 mr-1" />
              {value === 'waiting' ? 'Waiting' : config?.label || value}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Barangay',
      accessor: 'barangay_name',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <MapPin className="w-3 h-3 text-gray-400" />
          {value}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      sortable: false,
      render: (_: any, row: WalkInPatient) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row);
            }}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#20C997] rounded-md hover:bg-[#1AA179] transition-colors flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>

          {row.status === 'waiting' && (() => {
            // Check if there are lower queue numbers still waiting (queue order enforcement)
            const lowerQueueCheckedIn = filteredQueue.find(
              item => item.queue_number < row.queue_number &&
              item.status === 'waiting'
            );

            const isDisabledDueToInProgress = statistics.in_progress > 0;
            const isNotNextInQueue = !!lowerQueueCheckedIn;
            const isDisabled = isDisabledDueToInProgress || isNotNextInQueue;

            // Determine tooltip message
            let tooltipMessage = 'Start consultation';
            if (isDisabledDueToInProgress) {
              tooltipMessage = 'Wait for current consultation to complete';
            } else if (isNotNextInQueue) {
              tooltipMessage = `Wait for Queue #${lowerQueueCheckedIn.appointment_number} first`;
            }

            return (
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartConsultation(row.appointment_id);
                  }}
                  disabled={isDisabled}
                  className={`inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-md hover:bg-blue-100 transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={tooltipMessage}
                >
                  <PlayCircle className="w-3 h-3 mr-1.5" />
                  Start
                </button>
                {isDisabled && (
                  <div className="invisible group-hover:visible absolute z-50 min-w-max max-w-xs px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -top-12 right-0 whitespace-normal">
                    {tooltipMessage}
                  </div>
                )}
              </div>
            );
          })()}

          {row.status === 'in_progress' && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCompleteConsultation(row.appointment_id);
              }}
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout roleId={user?.role_id || 2} pageTitle="Walk-in Queue" pageDescription={`Manage walk-in patients for ${serviceName}`}>
      <Container size="full">
        <div className="space-y-6">
          {/* Header with Register Button */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5 text-primary-teal" />
                  <h2 className="text-xl font-bold text-gray-900">Walk-in Queue Management</h2>
                </div>
                <p className="text-gray-600">
                  Register and manage walk-in patients. No 7-day booking rule applies.
                </p>
              </div>
              <Button
                onClick={() => setShowRegistrationModal(true)}
                className="bg-[#20C997] hover:bg-[#1AA179] flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register Walk-in
              </Button>
            </div>
          </div>


          {/* Search and Filter Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by patient name, queue number, or contact..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    />
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <Button
                  onClick={handleExportCSV}
                  disabled={filteredQueue.length === 0}
                  className="bg-[#20C997] hover:bg-[#1AA179] flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    statusFilter === 'all'
                      ? 'bg-teal-100 text-teal-800 ring-2 ring-teal-500 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    All
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold">
                      {statistics.total}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setStatusFilter('waiting')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    statusFilter === 'waiting'
                      ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-500 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Waiting
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold">
                      {statistics.checked_in}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    statusFilter === 'in_progress'
                      ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    In Progress
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold">
                      {statistics.in_progress}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-green-100 text-green-800 ring-2 ring-green-500 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                    <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold">
                      {statistics.completed}
                    </span>
                  </div>
                </button>
              </div>

              {/* Results count */}
              {(searchQuery || statusFilter !== 'all') && (
                <div className="text-sm text-gray-600">
                  Showing {filteredQueue.length} of {walkInQueue.length} patients
                </div>
              )}
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">Today's Walk-in Queue</h2>
            </div>
            <p className="text-gray-600 mb-6">View and manage patients who have checked in today</p>

            {isLoadingQueue ? (
              <>
                {/* Statistics Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[...Array(4)].map((_, i) => (
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

                {/* Table Skeleton */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
                    {[...Array(5)].map((_, i) => (
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
            ) : (
              <EnhancedTable
                columns={walkInTableColumns}
                data={filteredQueue}
                searchable={false}
                paginated={filteredQueue.length > 10}
                pageSize={10}
              />
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Walk-in Service Information:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Walk-in patients do not need prior appointments</li>
                  <li>The 7-day advance booking rule does not apply</li>
                  <li>Patients are served on a first-come, first-served basis</li>
                  <li>Queue numbers reset daily</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Details Drawer */}
        {selectedPatient && (
          <Drawer
            isOpen={showDrawer}
            onClose={() => {
              setShowDrawer(false);
              setSelectedPatient(null);
            }}
            title={`Queue #${selectedPatient.queue_number}`}
            subtitle={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            metadata={
              <div className="flex items-center gap-4 text-sm text-white">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedPatient.appointment_date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(`2000-01-01T${selectedPatient.appointment_time}`), 'h:mm a')}
                </div>
              </div>
            }
            size="xl"
          >
            <div className="p-6">
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(selectedPatient.status)}

                  {/* Elapsed Time Badges */}
                  {selectedPatient.status === 'waiting' && selectedPatient.checked_in_at && (
                    <TimeElapsedBadge
                      timestamp={selectedPatient.checked_in_at}
                      label="Waiting"
                      type="waiting"
                    />
                  )}

                  {selectedPatient.status === 'in_progress' && selectedPatient.started_at && (
                    <TimeElapsedBadge
                      timestamp={selectedPatient.started_at}
                      label="Consulting"
                      type="consulting"
                    />
                  )}
                </div>

                {/* Appointment Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Appointment Details
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Queue Number:</span>
                      <span className="font-mono font-semibold text-gray-900">#{selectedPatient.queue_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium text-gray-900">{format(new Date(selectedPatient.appointment_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time Block:</span>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const hour = parseInt(selectedPatient.appointment_time.split(':')[0]);
                          const timeBlock: TimeBlock = hour < 13 ? 'AM' : 'PM';
                          return (
                            <>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(timeBlock)}`}>
                                {timeBlock}
                              </span>
                              <span className="text-sm text-gray-600">
                                {formatTimeBlock(timeBlock)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Patient Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Patient Information
                </h4>
                <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Full Name:</span>
                    <span className="font-medium text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Patient Number:</span>
                    <span className="font-mono font-medium text-gray-900">{selectedPatient.patient_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email:
                    </span>
                    <span className="font-medium text-gray-900">{selectedPatient.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Contact:
                    </span>
                    <span className="font-medium text-gray-900">{selectedPatient.contact_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="font-medium text-gray-900">{selectedPatient.date_of_birth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium text-gray-900 capitalize">{selectedPatient.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Barangay:
                    </span>
                    <span className="font-medium text-gray-900">{selectedPatient.barangay_name}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {selectedPatient.emergency_contact && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Emergency Contact
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-gray-900">{selectedPatient.emergency_contact.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium text-gray-900">{selectedPatient.emergency_contact.phone}</span>
                    </div>
                    {selectedPatient.emergency_contact.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{selectedPatient.emergency_contact.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Information */}
              {(selectedPatient.blood_type || selectedPatient.allergies || selectedPatient.current_medications) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-2" />
                    Medical Information
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    {selectedPatient.blood_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Droplet className="w-3 h-3" /> Blood Type:
                        </span>
                        <span className="font-medium text-gray-900">{selectedPatient.blood_type}</span>
                      </div>
                    )}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <div>
                        <p className="text-gray-600 flex items-center gap-1 mb-1">
                          <AlertCircle className="w-3 h-3" /> Allergies:
                        </p>
                        <ul className="list-disc list-inside text-gray-900 ml-2">
                          {selectedPatient.allergies.map((allergy, idx) => (
                            <li key={idx}>{allergy}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedPatient.current_medications && (
                      <div>
                        <p className="text-gray-600 flex items-center gap-1 mb-1">
                          <Heart className="w-3 h-3" /> Current Medications / Medical Conditions:
                        </p>
                        <p className="text-gray-900 font-medium">{selectedPatient.current_medications}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {(selectedPatient.checked_in_at || selectedPatient.started_at || selectedPatient.completed_at) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Timeline
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
                    {selectedPatient.checked_in_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          Checked In:
                        </span>
                        <span className="text-gray-900 font-medium">{new Date(selectedPatient.checked_in_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedPatient.started_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Started:
                        </span>
                        <span className="text-gray-900 font-medium">{new Date(selectedPatient.started_at).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedPatient.completed_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Completed:
                        </span>
                        <span className="text-gray-900 font-medium">{new Date(selectedPatient.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-gray-200">
                {selectedPatient.status === 'in_progress' && (
                  <Button
                    onClick={() => {
                      setShowDrawer(false);
                      handleCompleteConsultation(selectedPatient.appointment_id);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Appointment
                  </Button>
                )}

                <Button
                  onClick={() => setShowStatusHistory(true)}
                  variant="outline"
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  View Status History
                </Button>

                {lastHistoryEntries[selectedPatient.appointment_id]?.from_status &&
                  (selectedPatient.status === 'in_progress' ||
                   (selectedPatient.status === 'completed' && !hasMedicalRecords[selectedPatient.appointment_id])) && (
                  <button
                    onClick={() => handleQuickUndo(selectedPatient.appointment_id)}
                    className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300 rounded-md font-medium transition-colors flex items-center justify-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Undo Last Action
                  </button>
                )}
              </div>
            </div>
          </div>
          </Drawer>
        )}

        {/* Status History Modal */}
        {selectedPatient && (
          <StatusHistoryModal
            isOpen={showStatusHistory}
            onClose={() => setShowStatusHistory(false)}
            appointmentId={selectedPatient.appointment_id}
          />
        )}

        {/* Confirm Start Consultation Dialog */}
        <ConfirmDialog
          isOpen={showStartDialog}
          onClose={() => {
            setShowStartDialog(false);
            setSelectedPatient(null);
          }}
          onConfirm={handleConfirmStart}
          title="Start Consultation"
          message={
            selectedPatient
              ? `Are you ready to start consultation for ${selectedPatient.first_name} ${selectedPatient.last_name}?`
              : 'Are you ready to start this consultation?'
          }
          confirmText="Start Consultation"
          variant="info"
          isLoading={actionLoading}
        />

        {/* Confirm Revert Status Dialog */}
        <ConfirmDialog
          isOpen={showRevertDialog}
          onClose={() => {
            setShowRevertDialog(false);
            setPendingRevert(null);
          }}
          onConfirm={handleConfirmRevert}
          title="Revert Appointment Status"
          message={
            pendingRevert
              ? `Are you sure you want to revert this appointment from "${pendingRevert.currentStatus}" back to "${pendingRevert.targetStatus}"?

${pendingRevert.currentStatus === 'in_progress' || pendingRevert.currentStatus === 'checked_in'
  ? 'Warning: This will erase the timestamp for when the appointment was ' +
    (pendingRevert.currentStatus === 'in_progress' ? 'started' : 'checked in') + '.'
  : ''}`
              : 'Are you sure you want to revert this appointment status?'
          }
          confirmText="Revert Status"
          cancelText="Cancel"
          variant="warning"
          showReasonInput={true}
          reasonLabel="Reason for reversion (required)"
          reasonPlaceholder="E.g., Patient left before being seen, incorrect status update, etc."
          isReasonRequired={true}
          isLoading={actionLoading}
        />

        {/* Walk-in Registration Modal */}
        <WalkInRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
          barangays={barangays}
          assignedServiceId={user?.assigned_service_id}
        />
      </Container>
    </DashboardLayout>
  );
}
