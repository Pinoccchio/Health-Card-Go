'use client';

import { useState } from 'react';
import { CheckCircle, PlayCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { getPhilippineTime } from '@/lib/utils/timezone';

export type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

interface StatusTransitionButtonsProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  appointmentDate: string;
  onStatusUpdate?: () => void;
  variant?: 'full' | 'compact';
  className?: string;
  inProgressCount?: number; // Number of appointments currently in progress
  queueNumber?: number; // Current appointment's queue number
  lowerQueueCheckedIn?: number; // Queue number of lower checked-in appointment (if any)
}

interface ConfirmDialogState {
  isOpen: boolean;
  action: 'check_in' | 'start' | 'no_show' | 'reject' | null;
  title: string;
  message: string;
}

export function StatusTransitionButtons({
  appointmentId,
  currentStatus,
  appointmentDate,
  onStatusUpdate,
  variant = 'full',
  className = '',
  inProgressCount = 0,
  queueNumber,
  lowerQueueCheckedIn,
}: StatusTransitionButtonsProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');

  // Check if appointment is today (using Philippine Time)
  const isToday = () => {
    // Get current date in Philippine Time
    const philippineNow = getPhilippineTime();
    const todayPHT = `${philippineNow.getUTCFullYear()}-${String(philippineNow.getUTCMonth() + 1).padStart(2, '0')}-${String(philippineNow.getUTCDate()).padStart(2, '0')}`;

    // Appointment date is already in YYYY-MM-DD format from database
    const aptDate = appointmentDate.split('T')[0]; // Handle if it comes with time

    return todayPHT === aptDate;
  };

  // Check if check-in is allowed (considers environment setting for testing)
  const canCheckIn = () => {
    // Allow early check-in if environment variable is set to 'true' (for testing)
    const allowEarlyCheckIn = process.env.NEXT_PUBLIC_ALLOW_EARLY_CHECKIN === 'true';

    if (allowEarlyCheckIn) {
      return true; // Testing mode: allow check-in anytime
    }

    // Production mode: strict same-day-only check-in
    return isToday();
  };

  // Update appointment status via API
  const updateStatus = async (newStatus: AppointmentStatus, reason?: string) => {
    setIsLoading(true);
    setLoadingAction(newStatus);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(reason && { reason }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `Appointment status updated to ${newStatus}`);
        onStatusUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
      setConfirmDialog({ isOpen: false, action: null, title: '', message: '' });
    }
  };

  // Handle check-in action
  const handleCheckIn = () => {
    if (!canCheckIn()) {
      toast.error('Patients can only be checked in on the appointment day');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      action: 'check_in',
      title: 'Check In Patient',
      message: 'Confirm that the patient has arrived and is ready for service. The patient will be notified.',
    });
  };

  // Confirm check-in action
  const confirmCheckIn = () => {
    updateStatus('checked_in');
  };

  // Handle start consultation action
  const handleStart = () => {
    setConfirmDialog({
      isOpen: true,
      action: 'start',
      title: 'Start Consultation',
      message: 'Begin the consultation with this patient? The patient will be notified that their consultation has started.',
    });
  };

  // Confirm start consultation action
  const confirmStart = () => {
    updateStatus('in_progress');
  };

  // Handle approve pending appointment with confirmation
  const handleApprove = () => {
    setConfirmDialog({
      isOpen: true,
      action: 'approve',
      title: 'Approve Appointment',
      message: 'Are you sure you want to approve this appointment? The patient will be notified and the appointment will be scheduled.',
    });
  };

  // Confirm approval action
  const confirmApprove = () => {
    updateStatus('scheduled');
  };

  // Handle reject pending appointment with confirmation
  const handleReject = () => {
    setConfirmDialog({
      isOpen: true,
      action: 'reject',
      title: 'Reject Appointment',
      message: 'Are you sure you want to reject this appointment? The patient will be notified with the rejection reason.',
    });
  };

  // Confirm rejection action
  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    updateStatus('cancelled', rejectionReason.trim());
    setRejectionReason(''); // Clear for next use
  };

  // Handle no-show action with confirmation
  const handleNoShow = () => {
    setConfirmDialog({
      isOpen: true,
      action: 'no_show',
      title: 'Mark as No Show',
      message: 'Are you sure the patient did not show up for this appointment? This action will be recorded in the appointment history.',
    });
  };

  // Confirm no-show action
  const confirmNoShow = () => {
    updateStatus('no_show', 'Patient did not show up');
  };

  // Close confirmation dialog
  const closeDialog = () => {
    setConfirmDialog({ isOpen: false, action: null, title: '', message: '' });
    setRejectionReason(''); // Clear rejection reason when closing
  };

  // Determine which buttons to show based on current status
  const getAvailableActions = () => {
    switch (currentStatus) {
      case 'scheduled':
        return (
          <>
            <Button
              onClick={handleCheckIn}
              disabled={isLoading || !canCheckIn()}
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              {isLoading && loadingAction === 'checked_in' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check In Patient
                </>
              )}
            </Button>
            <Button
              onClick={handleNoShow}
              disabled={isLoading || !canCheckIn()}
              variant="outline"
              className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Mark as No Show
            </Button>
          </>
        );

      case 'checked_in':
        // Only show "Start Consultation" button
        // To undo a check-in mistake, use "Undo Last Action" button instead of marking as no-show
        const isDisabledDueToInProgress = inProgressCount > 0;
        const isNotNextInQueue = !!lowerQueueCheckedIn;
        const isStartDisabled = isDisabledDueToInProgress || isNotNextInQueue;

        return (
          <div className="relative group">
            <Button
              onClick={handleStart}
              disabled={isLoading || isStartDisabled}
              variant="outline"
              className={`bg-green-50 text-green-700 border-green-200 hover:bg-green-100 ${isStartDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={
                isDisabledDueToInProgress
                  ? 'Wait for current consultation to complete'
                  : isNotNextInQueue
                  ? `Wait for queue #${lowerQueueCheckedIn} first`
                  : 'Start consultation'
              }
            >
              {isLoading && loadingAction === 'in_progress' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Consultation
                </>
              )}
            </Button>
            {isStartDisabled && (
              <div className="invisible group-hover:visible absolute z-50 min-w-max max-w-xs px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg -top-12 right-0 whitespace-normal">
                {isDisabledDueToInProgress
                  ? 'Wait for current consultation to complete before starting'
                  : isNotNextInQueue
                  ? `Queue #${lowerQueueCheckedIn} must be consulted first (sequential order)`
                  : 'Start consultation'}
              </div>
            )}
          </div>
        );

      case 'in_progress':
        // Completion handled by AppointmentCompletionModal
        return null;

      case 'pending':
        return (
          <>
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 hover:bg-green-600 hover:text-white hover:border-green-600"
            >
              {isLoading && loadingAction === 'scheduled' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Appointment
                </>
              )}
            </Button>
            <Button
              onClick={handleReject}
              disabled={isLoading}
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Appointment
            </Button>
          </>
        );

      case 'completed':
      case 'cancelled':
      case 'no_show':
      default:
        return null;
    }
  };

  const actions = getAvailableActions();

  if (!actions) return null;

  return (
    <>
      {/* Action Buttons */}
      <div className={`flex ${variant === 'compact' ? 'gap-2' : 'gap-3'} ${className}`}>
        {actions}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={closeDialog}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {confirmDialog.message}
                  </p>

                  {/* Rejection Reason Input */}
                  {confirmDialog.action === 'reject' && (
                    <div className="mb-4">
                      <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for rejection <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="rejection-reason"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="E.g., Patient ineligible, Double booking, Incomplete requirements..."
                        maxLength={500}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {rejectionReason.length}/500 characters
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={closeDialog}
                      variant="outline"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirmDialog.action === 'approve') {
                          confirmApprove();
                        } else if (confirmDialog.action === 'check_in') {
                          confirmCheckIn();
                        } else if (confirmDialog.action === 'start') {
                          confirmStart();
                        } else if (confirmDialog.action === 'no_show') {
                          confirmNoShow();
                        } else if (confirmDialog.action === 'reject') {
                          confirmReject();
                        }
                      }}
                      disabled={isLoading}
                      className={
                        confirmDialog.action === 'approve'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
