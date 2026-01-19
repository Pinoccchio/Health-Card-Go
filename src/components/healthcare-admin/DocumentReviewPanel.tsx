'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, Eye, Download, AlertCircle } from 'lucide-react';
import {
  AppointmentUpload,
  getUploadFileTypeInfo,
} from '@/types/appointment';

interface DocumentReviewPanelProps {
  /** Appointment ID to fetch uploads for */
  appointmentId: string;

  /** Callback when verification is complete (to refresh parent data) */
  onVerificationComplete?: () => void;
}

/**
 * DocumentReviewPanel Component
 * Allows healthcare admins to view uploaded documents for appointments
 */
export function DocumentReviewPanel({
  appointmentId,
  onVerificationComplete,
}: DocumentReviewPanelProps) {
  const [uploads, setUploads] = useState<AppointmentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch uploads on mount
  useEffect(() => {
    fetchUploads();
  }, [appointmentId]);

  const fetchUploads = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/uploads`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch uploads');
      }

      setUploads(data.uploads || []);
    } catch (err: any) {
      console.error('Error fetching uploads:', err);
      setError(err.message || 'Failed to load uploaded documents');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-teal" />
        <span className="ml-2 text-sm text-gray-600">Loading uploads...</span>
      </div>
    );
  }

  if (error && uploads.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-semibold text-red-800">Error Loading Documents</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No documents uploaded yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Patient must upload required documents before verification
        </p>
      </div>
    );
  }

  // Check if all uploads are pending (can verify)
  const hasPendingUploads = uploads.some(u => u.verification_status === 'pending');
  const allApproved = uploads.every(u => u.verification_status === 'approved');
  const anyRejected = uploads.some(u => u.verification_status === 'rejected');

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 ml-2">{error}</p>
          </div>
        </div>
      )}

      {/* Uploads List */}
      <div className="space-y-3">
        {uploads.map((upload) => {
          const fileTypeInfo = getUploadFileTypeInfo(upload.file_type);

          return (
            <div
              key={upload.id}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {fileTypeInfo.label}
                      </h4>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {upload.file_name}
                    </p>

                    <p className="text-xs text-gray-400 mt-0.5">
                      {(upload.file_size_bytes / 1024).toFixed(1)} KB • {upload.mime_type}
                    </p>

                    {/* Verification Info */}
                    {upload.verified_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Verified {new Date(upload.verified_at).toLocaleString()}
                      </p>
                    )}

                    {upload.verification_notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <span className="font-semibold">Note:</span> {upload.verification_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                  <a
                    href={upload.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-600 hover:text-primary-teal hover:bg-gray-100 rounded-md transition-colors"
                    title="View file"
                  >
                    <Eye className="h-4 w-4" />
                  </a>

                  <a
                    href={upload.file_url}
                    download={upload.file_name}
                    className="p-2 text-gray-600 hover:text-primary-teal hover:bg-gray-100 rounded-md transition-colors"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}
