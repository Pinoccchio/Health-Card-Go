'use client';

import { useState, useEffect } from 'react';
import { X, FlaskConical, CheckCircle } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface LaboratoryStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  currentStage: string | null;
  onStageUpdate: () => void;
}

export default function LaboratoryStageModal({
  isOpen,
  onClose,
  appointmentId,
  currentStage,
  onStageUpdate,
}: LaboratoryStageModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!isConfirmed) {
      setError('Please confirm that laboratory tests are completed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Determine next stage based on current stage
      // verification -> laboratory (starting lab tests)
      // laboratory -> results (lab tests completed)
      const nextStage = currentStage === 'verification' ? 'laboratory' : 'results';
      const notes =
        nextStage === 'laboratory'
          ? 'Laboratory tests in progress'
          : 'Laboratory tests completed and results ready';

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

      // Show success toast
      const successMessage =
        nextStage === 'laboratory'
          ? 'Laboratory stage started successfully'
          : 'Moved to Results stage successfully';
      showSuccess(successMessage);

      // Reset form and close modal
      setIsConfirmed(false);
      setError(null);
      onClose();

      // Trigger parent refresh
      onStageUpdate();
    } catch (err) {
      console.error('[LaboratoryStageModal] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update stage';
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Laboratory Stage</h2>
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
            {currentStage === 'verification'
              ? 'Start the laboratory testing process for this patient.'
              : 'Confirm that all required laboratory tests have been completed for this patient.'}
          </p>

          {/* Confirmation Checkbox */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-teal focus:ring-primary-teal disabled:opacity-50"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {currentStage === 'verification'
                    ? 'Begin laboratory testing'
                    : 'Laboratory tests completed'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {currentStage === 'verification'
                    ? 'Patient is ready to proceed to the laboratory for required tests'
                    : 'All required laboratory tests have been performed and results are ready for review'}
                </p>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Note */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Next step:</span>{' '}
              {currentStage === 'verification'
                ? 'The appointment will move to the Laboratory stage where tests will be conducted.'
                : 'After confirming, the appointment will move to the Results stage for doctor review.'}
            </p>
          </div>
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
            onClick={handleSubmit}
            disabled={!isConfirmed || isSubmitting}
            className="px-6 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {currentStage === 'verification' ? 'Start Laboratory' : 'Proceed to Results'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
