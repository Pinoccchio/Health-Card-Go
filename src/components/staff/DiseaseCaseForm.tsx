'use client';

import { useState } from 'react';
import { X, Calendar, User, MapPin, Phone, Home, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface DiseaseCaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barangays: Array<{ id: number; name: string }>;
}

const DISEASE_TYPES = [
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'other', label: 'Other (Custom Disease)' },
];

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

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function DiseaseCaseForm({
  isOpen,
  onClose,
  onSuccess,
  barangays,
}: DiseaseCaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Disease information
    disease_type: 'dengue',
    custom_disease_name: '',
    diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
    severity: 'mild',
    status: 'active',
    barangay_id: '',
    notes: '',
    // Anonymous patient information
    patient_name: '',
    patient_age: '',
    patient_gender: 'male',
    patient_contact: '',
    patient_address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/diseases/standalone-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disease_type: formData.disease_type,
          custom_disease_name: formData.disease_type === 'other' ? formData.custom_disease_name : undefined,
          diagnosis_date: formData.diagnosis_date,
          severity: formData.severity,
          status: formData.status,
          barangay_id: parseInt(formData.barangay_id),
          notes: formData.notes || undefined,
          anonymous_patient_data: {
            name: formData.patient_name,
            age: parseInt(formData.patient_age),
            gender: formData.patient_gender,
            contact: formData.patient_contact || undefined,
            address: formData.patient_address || undefined,
            barangay_id: parseInt(formData.barangay_id),
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setFormData({
          disease_type: 'dengue',
          custom_disease_name: '',
          diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
          severity: 'mild',
          status: 'active',
          barangay_id: '',
          notes: '',
          patient_name: '',
          patient_age: '',
          patient_gender: 'male',
          patient_contact: '',
          patient_address: '',
        });
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to record disease case');
      }
    } catch (err) {
      console.error('Error recording disease case:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      disease_type: 'dengue',
      custom_disease_name: '',
      diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
      severity: 'mild',
      status: 'active',
      barangay_id: '',
      notes: '',
      patient_name: '',
      patient_age: '',
      patient_gender: 'male',
      patient_contact: '',
      patient_address: '',
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-all"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-teal" />
                Record Disease Case (No Patient Account)
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Record a disease case for someone without a patient account
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Patient Information Section */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Patient Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Enter patient's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.patient_age}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                    placeholder="e.g., 35"
                    min="0"
                    max="150"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.patient_gender}
                    onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Contact Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.patient_contact}
                    onChange={(e) => setFormData({ ...formData, patient_contact: e.target.value })}
                    placeholder="e.g., 09123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    maxLength={20}
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Home className="w-3 h-3 inline mr-1" />
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.patient_address}
                    onChange={(e) => setFormData({ ...formData, patient_address: e.target.value })}
                    placeholder="Street address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* Disease Information Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-teal" />
                Disease Information
              </h4>

              {/* Disease Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disease Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.disease_type}
                  onChange={(e) => setFormData({ ...formData, disease_type: e.target.value, custom_disease_name: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  required
                >
                  {DISEASE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Disease Name */}
              {formData.disease_type === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Disease Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.custom_disease_name}
                    onChange={(e) => setFormData({ ...formData, custom_disease_name: e.target.value })}
                    placeholder="Enter disease name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required={formData.disease_type === 'other'}
                    maxLength={100}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diagnosis Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Diagnosis Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.diagnosis_date}
                    onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  />
                </div>

                {/* Barangay */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Barangay <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.barangay_id}
                    onChange={(e) => setFormData({ ...formData, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {SEVERITY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about the case..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  maxLength={500}
                />
              </div>
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
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Recording...' : 'Record Disease Case'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
