'use client';

import { useState, useEffect } from 'react';
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
  User,
  MapPin,
  Phone,
  History,
  RotateCcw,
} from 'lucide-react';
import { formatPhilippineDateLong } from '@/lib/utils/timezone';
import { APPOINTMENT_STATUS_CONFIG } from '@/lib/constants/colors';

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
      barangay_id: number;
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
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'checked_in' | 'in_progress' | 'completed'>('all');

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
      const response = await fetch(`/api/medical-records?appointment_id=${appointmentId}`);
      const data = await response.json();

      if (data.success) {
        setHasMedicalRecords(data.has_records);
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
        // Get the most recent status change entry
        const lastEntry = data.data.find((entry: any) =>
          entry.change_type === 'status_change' && entry.from_status !== null
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
      // Fetch all appointments (not just today)
      const response = await fetch(`/api/appointments`);
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
                              {appointment.patients?.profiles?.first_name || 'Unknown'} {appointment.patients?.profiles?.last_name || 'Patient'}
                            </h4>
                            <p className="text-xs text-gray-500">Patient #{appointment.patients?.patient_number || 'N/A'}</p>
                          </div>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(appointment.appointment_time)}
                        </div>
                        {appointment.patients?.profiles?.barangays && (
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
                      <div className="flex items-center gap-2">
                        <StatusBadge status={selectedAppointment.status} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Queue #{selectedAppointment.appointment_number}</p>

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
                      <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
                        <p className="font-medium text-gray-900">
                          {selectedAppointment.patients?.profiles?.first_name || 'Unknown'}{' '}
                          {selectedAppointment.patients?.profiles?.last_name || 'Patient'}
                        </p>
                        <p className="text-gray-600">Patient #{selectedAppointment.patients?.patient_number || 'N/A'}</p>
                        {selectedAppointment.patients?.profiles?.contact_number && (
                          <p className="text-gray-600 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {selectedAppointment.patients.profiles.contact_number}
                          </p>
                        )}
                        {selectedAppointment.patients?.profiles?.barangays && (
                          <p className="text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {selectedAppointment.patients.profiles.barangays.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Medical Context Panel */}
                    <MedicalContextPanel
                      medical_history={selectedAppointment.patients?.medical_history}
                      allergies={selectedAppointment.patients?.allergies}
                      current_medications={selectedAppointment.patients?.current_medications}
                      accessibility_requirements={selectedAppointment.patients?.accessibility_requirements}
                      patientId={selectedAppointment.patients?.id || ''}
                    />

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
                              setPendingAction({
                                appointmentId: selectedAppointment.id,
                                status: 'completed',
                                patientName: `${selectedAppointment.patients.profiles.first_name} ${selectedAppointment.patients.profiles.last_name}`
                              });
                              setShowCompleteDialog(true);
                            }}
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
          title="Mark as Completed"
          message={`Are you sure you want to mark ${pendingAction?.patientName}'s appointment as completed? Make sure you have created the medical record before completing.`}
          confirmText="Mark as Completed"
          cancelText="Cancel"
          variant="info"
          isLoading={actionLoading}
          showReasonInput={true}
          reasonLabel="Reason (optional)"
          reasonPlaceholder="Enter reason for completion..."
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
