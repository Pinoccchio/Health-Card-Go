'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  onSuccess: () => void;
}

export function RejectionReasonModal({
  isOpen,
  onClose,
  appointmentId,
  onSuccess,
}: RejectionReasonModalProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen) return null;

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('Rejection reason must be at least 10 characters');
      return;
    }

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: reason.trim(),
          action: 'reject',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment rejected successfully');
        setReason('');
        onClose();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to reject appointment');
      }
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleClose = () => {
    if (!isRejecting) {
      setReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-red-600 p-4 text-white rounded-t-lg flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-bold">Reject Appointment</h2>
            <p className="text-sm text-red-100">Please provide a reason for rejection</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <p className="font-medium">This will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Change appointment status to <strong>CANCELLED</strong></li>
              <li>Notify the patient with your rejection reason</li>
              <li>Allow the patient to rebook a new appointment</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter a clear reason for rejecting this appointment (minimum 10 characters)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
              rows={4}
              disabled={isRejecting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/500 characters {reason.length < 10 && reason.length > 0 && (
                <span className="text-red-600">(minimum 10 required)</span>
              )}
            </p>
          </div>

          {/* Example reasons */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Example reasons:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Incomplete or incorrect documents submitted</li>
              <li>Service not available on requested date</li>
              <li>Patient does not meet eligibility requirements</li>
              <li>Missing required documents or test results</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-lg border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
            disabled={isRejecting}
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isRejecting || !reason.trim() || reason.trim().length < 10}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRejecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject Appointment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
