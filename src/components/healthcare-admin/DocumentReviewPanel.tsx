'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, Eye, Download, AlertCircle, CheckCircle2, ClipboardCheck } from 'lucide-react';
import {
  AppointmentUpload,
  AppointmentRequirement,
  getUploadFileTypeInfo,
  REQUIREMENT_TYPES,
} from '@/types/appointment';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal';

interface DocumentReviewPanelProps {
  /** Appointment ID to fetch uploads for */
  appointmentId: string;

  /** Callback when verification is complete (to refresh parent data) */
  onVerificationComplete?: () => void;

  /** View mode - determines messaging style (default: 'admin') */
  viewMode?: 'patient' | 'admin';
}

/**
 * DocumentReviewPanel Component
 * Allows healthcare admins to view uploaded documents or confirmed requirements for appointments
 * Supports both legacy file uploads and new checkbox-based requirements
 */
export function DocumentReviewPanel({
  appointmentId,
  onVerificationComplete,
  viewMode = 'admin',
}: DocumentReviewPanelProps) {
  const [uploads, setUploads] = useState<AppointmentUpload[]>([]);
  const [requirements, setRequirements] = useState<AppointmentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);

  // Fetch uploads and requirements on mount
  useEffect(() => {
    fetchData();
  }, [appointmentId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch both uploads (legacy) and requirements (new checkbox system)
      const [uploadsRes, requirementsRes] = await Promise.all([
        fetch(`/api/appointments/${appointmentId}/uploads`),
        fetch(`/api/appointments/${appointmentId}/requirements`),
      ]);

      // Check if responses are JSON before parsing
      const uploadsContentType = uploadsRes.headers.get('content-type');
      const requirementsContentType = requirementsRes.headers.get('content-type');

      let uploadsData = { uploads: [] };
      let requirementsData = { requirements: [] };

      // Parse uploads response if it's JSON
      if (uploadsContentType?.includes('application/json')) {
        try {
          uploadsData = await uploadsRes.json();
        } catch (e) {
          console.error('Error parsing uploads response:', e);
        }
      } else if (!uploadsRes.ok) {
        console.error('Uploads API returned non-JSON response:', uploadsRes.status);
      }

      // Parse requirements response if it's JSON
      if (requirementsContentType?.includes('application/json')) {
        try {
          requirementsData = await requirementsRes.json();
        } catch (e) {
          console.error('Error parsing requirements response:', e);
        }
      } else if (!requirementsRes.ok) {
        console.error('Requirements API returned non-JSON response:', requirementsRes.status);
      }

      // Filter: uploads are file-based (has file_url), requirements are checkbox-based
      const fileUploads = (uploadsData.uploads || []).filter(
        (u: AppointmentUpload) => u.file_url && !u.is_checkbox_verified
      );
      const checkboxRequirements = requirementsData.requirements || [];

      setUploads(fileUploads);
      setRequirements(checkboxRequirements);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (upload: AppointmentUpload) => {
    if (!upload.file_url) return;
    setSelectedDocument({
      url: upload.file_url,
      name: upload.file_name || 'Document',
      type: upload.mime_type || 'application/octet-stream',
    });
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedDocument(null);
  };

  const handleDownloadDocument = async (upload: AppointmentUpload) => {
    if (!upload.file_url) return;
    try {
      const response = await fetch(upload.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = upload.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      window.open(upload.file_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-teal" />
        <span className="ml-2 text-sm text-gray-600">Loading requirements...</span>
      </div>
    );
  }

  if (error && uploads.length === 0 && requirements.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-semibold text-red-800">Error Loading Data</h4>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (uploads.length === 0 && requirements.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No requirements confirmed yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Patient must confirm requirements before proceeding
        </p>
      </div>
    );
  }

  const hasLegacyUploads = uploads.length > 0;
  const hasCheckboxRequirements = requirements.length > 0;

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

      {/* Checkbox Requirements (New System) */}
      {hasCheckboxRequirements && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="h-5 w-5 text-primary-teal" />
            <h4 className="text-sm font-semibold text-gray-900">
              {viewMode === 'patient' ? 'Your Confirmed Requirements' : 'Requirements Confirmed by Patient'}
            </h4>
          </div>

          {requirements.map((req) => {
            const typeInfo = REQUIREMENT_TYPES[req.file_type as keyof typeof REQUIREMENT_TYPES];

            return (
              <div
                key={req.id}
                className="rounded-lg border border-green-200 bg-green-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-green-900">
                      {req.requirement_label || typeInfo?.label || 'Requirement'}
                    </h4>
                    <p className="text-xs text-green-700 mt-1">
                      {viewMode === 'patient' ? 'Confirmed' : 'Confirmed by patient'} • {req.checkbox_verified_at
                        ? new Date(req.checkbox_verified_at).toLocaleString()
                        : 'Date not recorded'}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      {viewMode === 'patient'
                        ? 'Bring this document on your appointment day'
                        : 'Status: Patient will bring this on appointment day'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Verification Note - different messaging for patient vs admin */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-xs text-blue-800">
              {viewMode === 'patient' ? (
                <>
                  <strong>Reminder:</strong> Remember to bring these documents on your appointment day.
                </>
              ) : (
                <>
                  <strong>Note:</strong> Verify these documents in person during verification.
                  Patient has confirmed they will bring the required documents.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Legacy File Uploads (Old System) */}
      {hasLegacyUploads && (
        <div className="space-y-3">
          {hasCheckboxRequirements && (
            <div className="border-t border-gray-200 my-4 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Documents (Legacy)</h4>
            </div>
          )}

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

                      {upload.file_size_bytes && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(upload.file_size_bytes / 1024).toFixed(1)} KB • {upload.mime_type}
                        </p>
                      )}

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

                  {/* Action Buttons (only for file uploads) */}
                  {upload.file_url && (
                    <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                      <button
                        onClick={() => handleViewDocument(upload)}
                        className="p-2 text-gray-600 hover:text-primary-teal hover:bg-gray-100 rounded-md transition-colors"
                        title="View file"
                        aria-label={`View ${fileTypeInfo.label}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadDocument(upload)}
                        className="p-2 text-gray-600 hover:text-primary-teal hover:bg-gray-100 rounded-md transition-colors"
                        title="Download file"
                        aria-label={`Download ${fileTypeInfo.label}`}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
          documentUrl={selectedDocument.url}
          documentName={selectedDocument.name}
          documentType={selectedDocument.type}
        />
      )}
    </div>
  );
}
