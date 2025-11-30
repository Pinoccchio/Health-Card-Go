'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { StatusHistoryModal } from '@/components/appointments/StatusHistoryModal';
import { TimeElapsedBadge } from '@/components/appointments/TimeElapsedBadge';
import { MedicalContextPanel } from '@/components/appointments/MedicalContextPanel';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  Search,
  History,
  RotateCcw,
  User,
  MapPin,
  Phone,
} from 'lucide-react';
import { getPhilippineTime } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';

interface AdminAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  doctor_id?: string;
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
      barangays?: {
        name: string;
      };
    };
  };
  doctors?: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
      specialization?: string;
    };
  };
}

interface Doctor {
  id: string;
  profiles: {
    first_name: string;
    last_name: string;
    specialization?: string;
  };
}

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

// Use centralized status config for consistent colors
const statusConfig = APPOINTMENT_STATUS_CONFIG;

export default function HealthcareAdminAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, scheduled: 0, completed: 0, cancelled: 0, noShow: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningDoctor, setAssigningDoctor] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    appointmentId: string;
    doctorId: string | null;
    doctorName: string | null;
    patientName: string;
  } | null>(null);

  // Status history and reversion states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryAppointmentId, setSelectedHistoryAppointmentId] = useState<string | null>(null);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [pendingRevert, setPendingRevert] = useState<{
    historyId: string;
    targetStatus: string;
    appointmentId: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastHistoryEntries, setLastHistoryEntries] = useState<Record<string, {
    id: string;
    from_status: string | null;
  }>>({});

  // Medical records check for undo validation (keyed by appointment ID)
  const [hasMedicalRecords, setHasMedicalRecords] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [dateFilter]);

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
            const lastEntry = data.data.find((entry: any) =>
              entry.change_type === 'status_change' && entry.from_status !== null
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

  const fetchDoctors = async () => {
    try {
      console.log('🔍 [FETCH DOCTORS] Fetching doctors list...');
      const response = await fetch('/api/doctors');
      const data = await response.json();

      console.log('🔍 [FETCH DOCTORS] Response:', data);

      if (data.success) {
        console.log('✅ [FETCH DOCTORS] Successfully loaded', data.data?.length || 0, 'doctors');
        setDoctors(data.data || []);
      } else {
        console.error('❌ [FETCH DOCTORS] Failed:', data.error);
        setError('Failed to load doctors list');
      }
    } catch (err) {
      console.error('❌ [FETCH DOCTORS] Error:', err);
      setError('Error loading doctors list');
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = '/api/appointments';

      if (dateFilter === 'today') {
        // Get today's date in Philippine timezone
        const nowPHT = getPhilippineTime();
        const year = nowPHT.getFullYear();
        const month = String(nowPHT.getMonth() + 1).padStart(2, '0');
        const day = String(nowPHT.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        url += `?date=${today}`;
      } else if (dateFilter === 'week') {
        // Fetch this week's appointments (implement date range in API if needed)
        const nowPHT = getPhilippineTime();
        const year = nowPHT.getFullYear();
        const month = String(nowPHT.getMonth() + 1).padStart(2, '0');
        const day = String(nowPHT.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        url += `?date=${today}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const allAppointments = data.data || [];
        setAppointments(allAppointments);

        // Calculate stats
        const newStats = {
          total: allAppointments.length,
          scheduled: allAppointments.filter((a: AdminAppointment) => a.status === 'scheduled').length,
          completed: allAppointments.filter((a: AdminAppointment) => a.status === 'completed').length,
          cancelled: allAppointments.filter((a: AdminAppointment) => a.status === 'cancelled').length,
          noShow: allAppointments.filter((a: AdminAppointment) => a.status === 'no_show').length,
        };
        setStats(newStats);
      } else {
        setError(data.error || 'Failed to load appointments');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      apt.patients.profiles.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patients.profiles.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patients.patient_number.includes(searchQuery) ||
      apt.appointment_number.toString().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const StatusBadge = ({ status }: { status: AdminAppointment['status'] }) => {
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleAssignDoctor = async (appointmentId: string, doctorId: string | null) => {
    setAssigningDoctor(appointmentId);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      const data = await response.json();

      if (data.success) {
        // Show success message
        setSuccessMessage(doctorId ? 'Doctor assigned successfully' : 'Doctor unassigned successfully');
        // Refresh appointments list to show updated data
        await fetchAppointments();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to update doctor assignment');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setAssigningDoctor(null);
    }
  };

  const handleAssignConfirm = async () => {
    if (!pendingAssignment) return;

    await handleAssignDoctor(pendingAssignment.appointmentId, pendingAssignment.doctorId);
    setShowAssignDialog(false);
    setPendingAssignment(null);
  };

  const handleAssignCancel = () => {
    setShowAssignDialog(false);
    setPendingAssignment(null);
  };

  // Handler for viewing status history
  const handleViewHistory = (appointmentId: string) => {
    setSelectedHistoryAppointmentId(appointmentId);
    setShowHistoryModal(true);
  };

  // Handler for initiating reversion from history modal
  const handleInitiateRevert = (historyId: string, targetStatus: string) => {
    if (!selectedHistoryAppointmentId) return;

    setPendingRevert({
      historyId,
      targetStatus,
      appointmentId: selectedHistoryAppointmentId,
    });
    setShowHistoryModal(false);
    setShowRevertDialog(true);
  };

  // Handler for quick undo (no modal)
  const handleQuickUndo = (appointmentId: string) => {
    const lastEntry = lastHistoryEntries[appointmentId];
    if (!lastEntry) return;

    setPendingRevert({
      historyId: lastEntry.id,
      targetStatus: lastEntry.from_status || '',
      appointmentId,
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
        setSuccessMessage('Status reverted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to revert status');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Queue #', 'Patient Name', 'Patient #', 'Date', 'Time', 'Status', 'Doctor', 'Reason'];
    const rows = filteredAppointments.map(apt => [
      apt.appointment_number,
      `${apt.patients.profiles.first_name} ${apt.patients.profiles.last_name}`,
      apt.patients.patient_number,
      apt.appointment_date,
      apt.appointment_time,
      apt.status,
      apt.doctors ? `Dr. ${apt.doctors.profiles.first_name} ${apt.doctors.profiles.last_name}` : 'Unassigned',
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Total</p>
              <Calendar className="w-6 h-6 text-primary-teal" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Scheduled</p>
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Completed</p>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Cancelled</p>
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">No Show</p>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.noShow}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Period:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  >
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="checked_in">Checked In</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients or queue #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={filteredAppointments.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Queue #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-primary-teal">
                          #{appointment.appointment_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.patients.profiles.first_name} {appointment.patients.profiles.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{appointment.patients.patient_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{formatDate(appointment.appointment_date)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{formatTime(appointment.appointment_time)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={appointment.status} />
                          {/* Time Tracking Badges - Status-Aware */}
                          {appointment.checked_in_at && appointment.status === 'checked_in' && (
                            <TimeElapsedBadge
                              timestamp={appointment.checked_in_at}
                              label="Waiting"
                              type="waiting"
                            />
                          )}
                          {appointment.started_at && appointment.status === 'in_progress' && (
                            <TimeElapsedBadge
                              timestamp={appointment.started_at}
                              label="Consulting"
                              type="consulting"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {appointment.doctors ? (
                          <span className="text-sm text-gray-700">
                            Dr. {appointment.doctors.profiles.first_name} {appointment.doctors.profiles.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 line-clamp-2">
                          {appointment.reason || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-2">
                          {/* Doctor Assignment Dropdown - Always show for scheduled */}
                          {appointment.status === 'scheduled' && (
                            <div className="w-full">
                              {doctors.length > 0 ? (
                                <select
                                  value={appointment.doctor_id || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const selectedDoctor = doctors.find(d => d.id === value);

                                    // Set pending assignment and show confirmation dialog
                                    setPendingAssignment({
                                      appointmentId: appointment.id,
                                      doctorId: value || null,
                                      doctorName: selectedDoctor
                                        ? `Dr. ${selectedDoctor.profiles.first_name} ${selectedDoctor.profiles.last_name}`
                                        : null,
                                      patientName: `${appointment.patients.profiles.first_name} ${appointment.patients.profiles.last_name}`
                                    });
                                    setShowAssignDialog(true);
                                  }}
                                  disabled={assigningDoctor === appointment.id}
                                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal disabled:opacity-50 disabled:cursor-wait"
                                >
                                  <option value="">
                                    {assigningDoctor === appointment.id ? 'Updating...' : '-- Unassign Doctor --'}
                                  </option>
                                  {doctors.map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                      Dr. {doctor.profiles.first_name} {doctor.profiles.last_name}
                                      {doctor.profiles.specialization && ` - ${doctor.profiles.specialization}`}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-red-600">⚠ No doctors available</span>
                              )}
                            </div>
                          )}

                          {/* Info message when doctor is assigned */}
                          {appointment.status === 'scheduled' && appointment.doctor_id && (
                            <div className="w-full px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                              ✓ Ready for check-in by doctor
                            </div>
                          )}

                          {/* Undo Last Action button with Medical Records Validation */}
                          {lastHistoryEntries[appointment.id] &&
                           lastHistoryEntries[appointment.id].from_status &&
                           appointment.status !== lastHistoryEntries[appointment.id].from_status && (
                            appointment.status === 'completed' ? (
                              // Special handling for completed appointments
                              hasMedicalRecords[appointment.id] === false ? (
                                <button
                                  onClick={() => handleQuickUndo(appointment.id)}
                                  disabled={actionLoading}
                                  className="w-full px-3 py-1.5 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium flex items-center justify-center gap-1 border border-yellow-300 disabled:opacity-50 transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Undo
                                </button>
                              ) : hasMedicalRecords[appointment.id] === true ? (
                                <button
                                  disabled
                                  className="w-full px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-md font-medium flex items-center justify-center gap-1 border border-gray-300 cursor-not-allowed"
                                  title="Cannot undo - medical record has been created"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Undo Blocked
                                </button>
                              ) : (
                                // Loading state while checking medical records
                                <button
                                  disabled
                                  className="w-full px-3 py-1.5 text-xs bg-gray-100 text-gray-500 rounded-md font-medium flex items-center justify-center gap-1 border border-gray-200"
                                >
                                  <RotateCcw className="w-3 h-3 animate-spin" />
                                  Checking...
                                </button>
                              )
                            ) : (
                              // Normal undo button for non-completed statuses
                              <button
                                onClick={() => handleQuickUndo(appointment.id)}
                                disabled={actionLoading}
                                className="w-full px-3 py-1.5 text-xs bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 font-medium flex items-center justify-center gap-1 border border-yellow-300 disabled:opacity-50 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Undo
                              </button>
                            )
                          )}

                          {/* View Status History button */}
                          <button
                            onClick={() => handleViewHistory(appointment.id)}
                            className="w-full px-3 py-1.5 text-xs text-primary-teal hover:text-primary-teal/80 font-medium flex items-center justify-center gap-1 border border-primary-teal/20 rounded-md hover:bg-primary-teal/5 transition-colors"
                          >
                            <History className="w-3 h-3" />
                            View History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">No appointments match your current filters.</p>
            </div>
          )}
        </div>

        {/* Doctor Assignment Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showAssignDialog}
          onClose={handleAssignCancel}
          onConfirm={handleAssignConfirm}
          title={pendingAssignment?.doctorId ? "Assign Doctor" : "Unassign Doctor"}
          message={
            pendingAssignment?.doctorId
              ? `Are you sure you want to assign ${pendingAssignment.doctorName} to ${pendingAssignment?.patientName}'s appointment?`
              : `Are you sure you want to unassign the doctor from ${pendingAssignment?.patientName}'s appointment?`
          }
          confirmText={pendingAssignment?.doctorId ? "Assign Doctor" : "Unassign"}
          cancelText="Cancel"
          variant="info"
          isLoading={assigningDoctor === pendingAssignment?.appointmentId}
        />

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
          message={`Are you sure you want to revert this appointment to "${pendingRevert?.targetStatus?.replace('_', ' ')}"? This action will be logged in the status history.`}
          confirmText="Revert Status"
          cancelText="Cancel"
          variant="warning"
          showReasonInput={true}
          reasonLabel="Reason for reversion (required)"
          reasonPlaceholder="E.g., Accidentally changed status, need to correct error"
          isLoading={actionLoading}
        />
      </Container>
    </DashboardLayout>
  );
}
