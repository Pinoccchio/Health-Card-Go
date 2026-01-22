'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface ResetDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetDataDialog({ isOpen, onClose, onSuccess }: ResetDataDialogProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');

  const handleReset = async () => {
    if (confirmText !== 'RESET_ALL_DATA') {
      toast.error('Please type the correct confirmation text');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/diseases/reset-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmationToken: confirmText }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('All disease surveillance data has been reset successfully');
        setConfirmText('');
        setStep('warning');
        onClose();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to reset disease data');
      }
    } catch (err) {
      console.error('Error resetting disease data:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setConfirmText('');
      setStep('warning');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        {step === 'warning' ? (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Reset All Data?</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-red-900">This action will permanently delete:</p>
              <ul className="list-disc list-inside text-red-800 space-y-1 ml-2">
                <li>All disease cases (Dengue, Malaria, Measles, etc.)</li>
                <li>All historical disease statistics</li>
                <li>All disease predictions (SARIMA)</li>
                <li>All outbreak alerts</li>
              </ul>
              <p className="font-semibold text-red-900 mt-3">⚠️ This action CANNOT be undone.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium">✓ Will NOT delete:</p>
              <p>Health card data (Yellow, Green, Pink cards) will remain untouched</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">Use this to:</p>
              <p>Clear all disease test data and start fresh with Excel imports</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirmation')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Confirm Reset</h2>
            </div>

            <p className="text-sm text-gray-600">
              To confirm, please type the following text exactly:
            </p>

            <div className="bg-gray-100 rounded-md p-3">
              <code className="text-sm font-mono text-gray-900">RESET_ALL_DATA</code>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type confirmation text..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              disabled={isLoading}
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('warning');
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleReset}
                disabled={isLoading || confirmText !== 'RESET_ALL_DATA'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Resetting...' : 'Reset All Data'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
