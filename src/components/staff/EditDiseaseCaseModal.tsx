'use client';

import { useState, useEffect } from 'react';
import { X, Save, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface DiseaseCase {
  id: string;
  disease_type: string;
  custom_disease_name?: string;
  diagnosis_date: string;
  severity?: string;
  status: string;
  barangay_id: number;
  patient_id?: string;
  notes?: string;
  barangays?: {
    name: string;
    code: string;
  };
  patients?: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
  anonymous_patient_data?: {
    name: string;
    age: number;
    gender: string;
  };
}

interface EditDiseaseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: DiseaseCase | null;
}

const DISEASE_LABELS: Record<string, string> = {
  dengue: 'Dengue',
  hiv_aids: 'HIV/AIDS',
  pregnancy_complications: 'Pregnancy Complications',
  malaria: 'Malaria',
  measles: 'Measles',
  rabies: 'Rabies',
  other: 'Other',
};

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'under_treatment', label: 'Under Treatment' },
];

export function EditDiseaseCaseModal({
  isOpen,
  onClose,
  onSuccess,
  record,
}: EditDiseaseCaseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    severity: 'mild',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (record) {
      setFormData({
        severity: record.severity || 'mild',
        status: record.status || 'active',
        notes: record.notes || '',
      });
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/diseases/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: formData.severity,
          status: formData.status,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to update disease case');
      }
    } catch (err) {
      console.error('Error updating disease case:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      severity: record?.severity || 'mild',
      status: record?.status || 'active',
      notes: record?.notes || '',
    });
    setError('');
    onClose();
  };

  if (!isOpen || !record) return null;

  const patientName = record.patients?.profiles
    ? `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}`
    : record.anonymous_patient_data?.name || 'Unknown Patient';

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-200">
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-teal" />
                Edit Disease Case
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Update the severity, status, and notes for this disease case
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Read-Only Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Case Information (Read-Only)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Diagnosis Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(record.diagnosis_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Patient</p>
                  <p className="text-sm font-medium text-gray-900">{patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Disease Type</p>
                  <p className="text-sm font-medium text-gray-900">
                    {DISEASE_LABELS[record.disease_type] || record.disease_type}
                    {record.custom_disease_name && (
                      <span className="text-xs text-gray-600"> ({record.custom_disease_name})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Barangay</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.barangays?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity Level <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                required
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Current medical severity of the disease case
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                required
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Current treatment or recovery status
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinical Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional clinical observations or treatment notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">
                Clinical notes and observations (max 1000 characters)
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
