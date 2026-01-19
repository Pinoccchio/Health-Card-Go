'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  UploadFileType,
  UPLOAD_FILE_TYPES,
  validateUploadFile,
  getUploadFileTypeInfo,
  AppointmentUpload,
} from '@/types/appointment';

interface DocumentUploadFormProps {
  /** Required file types to upload */
  requiredUploads: UploadFileType[];

  /** Callback when all required files are uploaded */
  onUploadsComplete: (uploads: AppointmentUpload[]) => void;

  /** Appointment ID (if appointment already created) */
  appointmentId?: string;

  /** Whether to disable uploads */
  disabled?: boolean;
}

interface UploadState {
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  uploadData: AppointmentUpload | null;
  error: string | null;
}

/**
 * DocumentUploadForm Component
 * Handles uploading required documents for health card appointments
 * Shows upload areas for each required document type
 */
export function DocumentUploadForm({
  requiredUploads,
  onUploadsComplete,
  appointmentId,
  disabled = false,
}: DocumentUploadFormProps) {
  // State for each upload type
  const [uploads, setUploads] = useState<Record<UploadFileType, UploadState>>(() => {
    const initialState: any = {};
    requiredUploads.forEach((type) => {
      initialState[type] = {
        file: null,
        uploading: false,
        uploaded: false,
        uploadData: null,
        error: null,
      };
    });
    return initialState;
  });

  const fileInputRefs = useRef<Record<UploadFileType, HTMLInputElement | null>>({} as any);
  const hasNotifiedComplete = useRef(false);

  // Monitor uploads state and trigger callback when all required files are uploaded
  useEffect(() => {
    // Check if all required uploads are complete
    const allComplete = requiredUploads.every((type) => uploads[type]?.uploaded);

    if (allComplete && !hasNotifiedComplete.current) {
      const uploadData = requiredUploads
        .map((type) => uploads[type].uploadData)
        .filter((data): data is AppointmentUpload => data !== null);

      // Only call callback if we have valid data for all required uploads
      if (uploadData.length === requiredUploads.length) {
        hasNotifiedComplete.current = true;
        onUploadsComplete(uploadData);
      }
    } else if (!allComplete) {
      // Reset flag if user removes a file
      hasNotifiedComplete.current = false;
    }
  }, [uploads, requiredUploads]);

  // Handle file selection
  const handleFileSelect = (fileType: UploadFileType, file: File) => {
    // Validate file
    const validation = validateUploadFile(file, fileType);
    if (!validation.valid) {
      setUploads((prev) => ({
        ...prev,
        [fileType]: {
          ...prev[fileType],
          error: validation.error || 'Invalid file',
        },
      }));
      return;
    }

    // Update state with selected file
    setUploads((prev) => ({
      ...prev,
      [fileType]: {
        ...prev[fileType],
        file,
        error: null,
      },
    }));
  };

  // Handle file upload
  const handleUpload = async (fileType: UploadFileType) => {
    const uploadState = uploads[fileType];

    if (!uploadState.file) {
      console.error('❌ [UPLOAD] No file selected for', fileType);
      return;
    }

    if (!appointmentId) {
      console.error('❌ [UPLOAD] No appointmentId - appointment creation likely failed');
      return;
    }

    console.log(`📤 [UPLOAD] Starting upload for ${fileType}:`, uploadState.file.name);

    setUploads((prev) => ({
      ...prev,
      [fileType]: {
        ...prev[fileType],
        uploading: true,
        error: null,
      },
    }));

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', uploadState.file);
      formData.append('file_type', fileType);

      // Upload to API
      const response = await fetch(`/api/appointments/${appointmentId}/uploads`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update state with uploaded data
      console.log(`✅ [UPLOAD] Successfully uploaded ${fileType}:`, data.upload);

      setUploads((prev) => ({
        ...prev,
        [fileType]: {
          ...prev[fileType],
          uploading: false,
          uploaded: true,
          uploadData: data.upload,
          error: null,
        },
      }));
    } catch (error: any) {
      console.error(`❌ [UPLOAD] Failed to upload ${fileType}:`, error);
      setUploads((prev) => ({
        ...prev,
        [fileType]: {
          ...prev[fileType],
          uploading: false,
          error: error.message || 'Upload failed',
        },
      }));
    }
  };
  // Handle file removal
  const handleRemove = (fileType: UploadFileType) => {
    setUploads((prev) => ({
      ...prev,
      [fileType]: {
        file: null,
        uploading: false,
        uploaded: false,
        uploadData: null,
        error: null,
      },
    }));

    // Clear file input
    if (fileInputRefs.current[fileType]) {
      fileInputRefs.current[fileType]!.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Required Documents
        </h3>
        <p className="text-sm text-gray-600">
          Please upload the following documents. All files must be clear and readable.
        </p>
      </div>

      {requiredUploads.map((fileType) => {
        const uploadState = uploads[fileType];
        const fileInfo = getUploadFileTypeInfo(fileType);

        return (
          <div
            key={fileType}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            {/* File Type Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {fileInfo.label}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {fileInfo.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max size: {fileInfo.maxSizeMB}MB | Formats: JPG, PNG, PDF
                </p>
              </div>

              {/* Upload Status Icon */}
              {uploadState.uploaded && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
            </div>

            {/* File Upload Area */}
            {!uploadState.file && !uploadState.uploaded && (
              <div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[fileType] = el;
                  }}
                  type="file"
                  accept={fileInfo.acceptedFormats.join(',')}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(fileType, file);
                  }}
                  disabled={disabled}
                  className="hidden"
                  id={`file-${fileType}`}
                />
                <label
                  htmlFor={`file-${fileType}`}
                  className={`
                    flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg
                    ${disabled
                      ? 'cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer hover:border-primary-teal hover:bg-primary-teal/5'
                    }
                    ${uploadState.error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    Click to select file
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or drag and drop
                  </p>
                </label>
              </div>
            )}

            {/* Selected File Display */}
            {uploadState.file && !uploadState.uploaded && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {uploadState.file.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatFileSize(uploadState.file.size)}
                      </p>
                    </div>
                  </div>

                  {!uploadState.uploading && (
                    <button
                      type="button"
                      onClick={() => handleRemove(fileType)}
                      className="text-gray-400 hover:text-red-600 ml-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Upload Button */}
                {appointmentId && (
                  <Button
                    type="button"
                    onClick={() => handleUpload(fileType)}
                    disabled={uploadState.uploading || disabled}
                    variant="primary"
                    className="w-full mt-3"
                  >
                    {uploadState.uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Uploaded File Display */}
            {uploadState.uploaded && uploadState.uploadData && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">
                      {uploadState.uploadData.file_name}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Uploaded successfully • {formatFileSize(uploadState.uploadData.file_size_bytes)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Status: Pending verification by Healthcare Admin
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {uploadState.error && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{uploadState.error}</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium mb-2">
          📋 Upload Guidelines:
        </p>
        <ul className="text-sm text-blue-800 space-y-1 ml-4">
          <li>• Ensure documents are clear and readable</li>
          <li>• File size should not exceed {UPLOAD_FILE_TYPES.lab_request.maxSizeMB}MB per file</li>
          <li>• Accepted formats: JPG, PNG, PDF</li>
          <li>• Documents will be verified by Healthcare Admin before appointment confirmation</li>
        </ul>
      </div>
    </div>
  );
}
