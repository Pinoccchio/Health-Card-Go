'use client';

import { useState } from 'react';

interface RejectionDialogProps {
  isOpen: boolean;
  patientName: string;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export default function RejectionDialog({
  isOpen,
  patientName,
  onConfirm,
  onCancel,
}: RejectionDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      setReason(''); // Reset on success
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
          onClick={handleCancel}
        />

        {/* Dialog */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  Reject Patient Registration
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to reject <strong>{patientName}</strong>? Please
                    provide a reason for rejection.
                  </p>

                  <div className="mt-4">
                    <label
                      htmlFor="rejection-reason"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Rejection Reason *
                    </label>
                    <textarea
                      id="rejection-reason"
                      rows={4}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Enter the reason for rejection (e.g., incomplete information, duplicate account, etc.)"
                      className={`w-full rounded-md border ${
                        error ? 'border-red-500' : 'border-gray-300'
                      } px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent`}
                      disabled={isSubmitting}
                    />
                    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCancel}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
