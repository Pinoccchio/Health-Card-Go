'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, Download, QrCode } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface ReleasingStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  patientName: string;
  cardType: string;
  currentStage: string | null;
  onComplete: () => void;
}

export default function ReleasingStageModal({
  isOpen,
  onClose,
  appointmentId,
  patientName,
  cardType,
  currentStage,
  onComplete,
}: ReleasingStageModalProps) {
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

  const getCardColor = () => {
    switch (cardType.toLowerCase()) {
      case 'food_handler':
        return 'yellow';
      case 'non_food':
        return 'green';
      case 'pink':
        return 'pink';
      default:
        return 'teal';
    }
  };

  const getCardLabel = () => {
    switch (cardType.toLowerCase()) {
      case 'food_handler':
        return 'Food Handler (Yellow Card)';
      case 'non_food':
        return 'Non-Food Handler (Green Card)';
      case 'pink':
        return 'Pink Card';
      default:
        return 'Health Card';
    }
  };

  const handleComplete = async () => {
    if (!isConfirmed) {
      setError('Please confirm that the health card has been issued to the patient');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Complete the appointment
      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Health card issued and released to patient',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete appointment');
      }

      showSuccess('Health card released successfully - Appointment completed');
      onClose();
      onComplete();
    } catch (err) {
      console.error('[ReleasingStageModal] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete appointment';
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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Release Health Card</h2>
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
            The patient has been approved for health card issuance. Complete this step once the
            health card has been physically issued to the patient.
          </p>

          {/* Card Information */}
          <div className="bg-gradient-to-br from-primary-teal/5 to-blue-50 rounded-lg p-4 border border-primary-teal/20">
            <div className="flex items-start gap-3">
              <QrCode className="w-5 h-5 text-primary-teal flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{patientName}</p>
                <p className="text-sm text-gray-600 mt-1">{getCardLabel()}</p>
              </div>
            </div>
          </div>

          {/* Health Card Status */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Health Card Ready</p>
                <p className="text-sm text-gray-600 mt-1">
                  All laboratory results have been reviewed and approved by the doctor.
                  The patient is cleared for health card issuance.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  setIsConfirmed(e.target.checked);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-600 disabled:opacity-50"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Health card issued to patient</p>
                <p className="text-sm text-gray-600 mt-1">
                  I confirm that the physical health card has been issued and given to{' '}
                  <span className="font-medium">{patientName}</span>
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
              <span className="font-medium">Note:</span> Completing this step will mark the entire
              appointment as completed. Please ensure the physical health card has been issued to
              the patient before confirming.
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
            onClick={handleComplete}
            disabled={!isConfirmed || isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Complete Appointment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
