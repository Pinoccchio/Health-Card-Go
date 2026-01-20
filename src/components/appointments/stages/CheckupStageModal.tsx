'use client';

import { useState, useEffect } from 'react';
import { X, Stethoscope, CheckCircle, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface CheckupStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  currentStage: string | null;
  onStageUpdate: () => void;
}

type DoctorDecision = 'approve' | 'retest' | null;

export default function CheckupStageModal({
  isOpen,
  onClose,
  appointmentId,
  currentStage,
  onStageUpdate,
}: CheckupStageModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [decision, setDecision] = useState<DoctorDecision>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDecision(null);
      setError(null);
      setShowRescheduleConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Determine next stage based on current stage
      // results -> checkup (doctor starts reviewing)
      // checkup -> releasing (doctor approves)
      const nextStage = currentStage === 'results' ? 'checkup' : 'releasing';
      const notes =
        nextStage === 'checkup'
          ? 'Doctor check-up in progress'
          : 'Doctor approved - patient cleared for health card release';

      const response = await fetch(`/api/appointments/${appointmentId}/stage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: nextStage,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update stage');
      }

      const successMessage =
        nextStage === 'checkup'
          ? 'Doctor check-up started successfully'
          : 'Patient approved for health card release';
      showSuccess(successMessage);
      setDecision(null);
      setError(null);
      onClose();
      onStageUpdate();
    } catch (err) {
      console.error('[CheckupStageModal] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stage';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetest = () => {
    setShowRescheduleConfirm(true);
  };

  const confirmReschedule = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Laboratory results require additional testing. Patient needs to reschedule for follow-up tests in approximately 1 week.',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule appointment');
      }

      showSuccess('Appointment rescheduled successfully - Patient will be notified');
      setShowRescheduleConfirm(false);
      setDecision(null);
      setError(null);
      onClose();
      onStageUpdate();
    } catch (err) {
      console.error('[CheckupStageModal] Error rescheduling:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reschedule appointment';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Reschedule confirmation view
  if (showRescheduleConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Reschedule Required</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-gray-600">
              The patient's laboratory results require additional testing. They will need to
              reschedule for follow-up tests in approximately 1 week.
            </p>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span> The appointment status will be changed
                to "Rescheduled" and the patient will be notified to book a new appointment for
                additional laboratory testing.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={() => setShowRescheduleConfirm(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go Back
            </button>
            <button
              onClick={confirmReschedule}
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Confirm Reschedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main decision view
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Doctor Check-up</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Review the patient's laboratory results and determine the next steps.
          </p>

          {/* Decision Options */}
          <div className="space-y-3">
            {/* Approve Option */}
            <button
              onClick={() => setDecision('approve')}
              disabled={isSubmitting}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                decision === 'approve'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    decision === 'approve'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}
                >
                  {decision === 'approve' && (
                    <CheckCircle className="w-full h-full text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Approve for Releasing</p>
                  <p className="text-sm text-gray-600 mt-1">
                    All results are satisfactory. Patient is cleared for health card release.
                  </p>
                </div>
              </div>
            </button>

            {/* Retest Option */}
            <button
              onClick={() => setDecision('retest')}
              disabled={isSubmitting}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                decision === 'retest'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    decision === 'retest'
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-gray-300'
                  }`}
                >
                  {decision === 'retest' && <CheckCircle className="w-full h-full text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Require Additional Testing</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Results require follow-up. Patient needs to reschedule for additional laboratory
                    tests in approximately 1 week.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Note */}
          {decision && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-600">
                {decision === 'approve' ? (
                  <>
                    <span className="font-medium">Next step:</span> The appointment will move to the
                    Releasing stage where the health card will be issued.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Next step:</span> The appointment will be marked
                    for rescheduling and the patient will be notified.
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={decision === 'approve' ? handleApprove : handleRetest}
            disabled={!decision || isSubmitting}
            className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              decision === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : decision === 'retest'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-gray-400'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : decision === 'approve' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Proceed to Releasing
              </>
            ) : decision === 'retest' ? (
              <>
                <Calendar className="w-4 h-4" />
                Reschedule Patient
              </>
            ) : (
              'Select Decision'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
