'use client';

import React from 'react';
import { X, Calendar, User, FileText, Pill, StickyNote, AlertTriangle, ExternalLink } from 'lucide-react';
import { CategoryBadge } from './CategoryBadge';
import { EncryptionBadge } from './EncryptionBadge';

interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  created_by_id: string;
  category: 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';
  template_type?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  record_data?: any;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  patients?: {
    patient_number: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
  created_by?: {
    first_name: string;
    last_name: string;
  };
}

interface MedicalRecordDetailsModalProps {
  record: MedicalRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MedicalRecordDetailsModal({ record, isOpen, onClose }: MedicalRecordDetailsModalProps) {
  console.log('🎭 Modal render - isOpen:', isOpen, 'record:', record);

  if (!isOpen) return null;

  // Handle missing record data with error state
  if (!record) {
    console.log('⚠️ Modal: No record data - showing error state');

    return (
      <div className="fixed inset-0 z-[1002] overflow-y-auto">
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
          onClick={onClose}
        />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white p-8 rounded-lg max-w-2xl w-full max-h-screen overflow-auto shadow-lg border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Record Not Found</h3>
              <p className="mt-2 text-sm text-gray-500">
                The medical record data could not be loaded. Please try refreshing the page.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Modal: Rendering with valid record data');
  console.log('  - Patient data:', record.patients);
  console.log('  - Created by:', record.created_by);
  console.log('  - Category:', record.category);
  console.log('  - Diagnosis:', record.diagnosis);

  const patientName = record.patients?.profiles
    ? `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}`
    : 'Unknown Patient';

  const creatorName = record.created_by
    ? `${record.created_by.first_name} ${record.created_by.last_name}`
    : 'Unknown';

  console.log('  - Computed patientName:', patientName);
  console.log('  - Computed creatorName:', creatorName);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isSensitive = record.category === 'hiv' || record.category === 'pregnancy';

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={onClose}
      />

      {/* Centered Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Container */}
        <div className="relative bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-teal-100">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical Record Details</h2>
                <p className="text-sm text-gray-500 mt-0.5">View detailed medical record information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Sensitive Data Warning */}
          {isSensitive && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800">Sensitive Medical Data</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This record contains sensitive {record.category === 'hiv' ? 'HIV' : 'pregnancy'} information that is encrypted and protected.
                </p>
              </div>
            </div>
          )}

          {/* Badges Row */}
          <div className="mb-6 flex flex-wrap gap-2">
            <CategoryBadge category={record.category} />
            <EncryptionBadge isEncrypted={record.is_encrypted} />
          </div>

          {/* Patient Information Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Patient Name</p>
                <p className="text-sm font-medium text-gray-900">{patientName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Patient Number</p>
                <p className="text-sm font-medium text-gray-900">{record.patients?.patient_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Medical Information Section */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Medical Information
            </h3>

            {/* Diagnosis */}
            {record.diagnosis && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diagnosis</label>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{record.diagnosis}</p>
                </div>
              </div>
            )}

            {/* Prescription */}
            {record.prescription && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-gray-400" />
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prescription</label>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{record.prescription}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {record.notes && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="h-4 w-4 text-gray-400" />
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</label>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{record.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Record Metadata Section */}
          <div className="pb-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              Record Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created By</p>
                <p className="text-sm font-medium text-gray-900">{creatorName}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Created At</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(record.created_at)}</p>
              </div>
              {record.template_type && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Template Type</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{record.template_type.replace(/_/g, ' ')}</p>
                </div>
              )}
              {record.appointment_id && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Linked Appointment</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 font-mono">{record.appointment_id.substring(0, 8)}...</p>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-teal"
          >
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
