'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { ServiceFormData, ServiceCategory } from '@/types/service';

interface ServiceFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ServiceFormData>;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// FINAL SERVICE CATEGORIES (as of 2026-01-18)
// Only 3 core categories remain: Health Card Issuance & Renewal, HIV Testing & Counseling, Prenatal Checkup
// Removed: Laboratory, Immunization, Education, General Services
const SERVICE_CATEGORIES = [
  { value: 'healthcard', label: 'Health Card Issuance & Renewal', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'hiv', label: 'HIV Testing & Counseling', color: 'text-purple-600 bg-purple-50' },
  { value: 'pregnancy', label: 'Prenatal Checkup', color: 'text-pink-600 bg-pink-50' },
];

export function ServiceForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: initialData?.name || '',
    category: initialData?.category || 'healthcard',
    description: initialData?.description || '',
    duration_minutes: initialData?.duration_minutes || 30,
    requires_appointment: initialData?.requires_appointment !== false,
    requires_medical_record: initialData?.requires_medical_record !== false,
    is_active: initialData?.is_active !== false,
    requirements: initialData?.requirements || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormData, string>>>({});

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || 'healthcard',
        description: initialData.description || '',
        duration_minutes: initialData.duration_minutes || 30,
        requires_appointment: initialData.requires_appointment !== false,
        requires_medical_record: initialData.requires_medical_record !== false,
        is_active: initialData.is_active !== false,
        requirements: initialData.requirements || '',
      });
    }
  }, [initialData, mode]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ServiceFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (
      formData.duration_minutes === '' ||
      formData.duration_minutes < 5 ||
      formData.duration_minutes > 240
    ) {
      newErrors.duration_minutes = 'Duration must be between 5 and 240 minutes';
    }

    // Validate requirements (optional, but if provided, check format)
    if (formData.requirements && formData.requirements.length > 500) {
      newErrors.requirements = 'Requirements must be less than 500 characters total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // Convert empty string back to number before submission
      const submissionData = {
        ...formData,
        duration_minutes: typeof formData.duration_minutes === 'string'
          ? 30 // Default fallback if somehow empty (though validation should prevent this)
          : formData.duration_minutes
      };
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (
    field: keyof ServiceFormData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Service Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Dental Checkup, Physical Therapy"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value as ServiceCategory)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.category ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        >
          {SERVICE_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Category determines which Healthcare Admin can manage this service
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Brief description of the service"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          This will be shown to patients when booking appointments
        </p>
      </div>

      {/* Requirements */}
      <div>
        <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
          Requirements
        </label>
        <textarea
          id="requirements"
          value={formData.requirements}
          onChange={(e) => handleChange('requirements', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.requirements ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Fasting for 12 hours, Bring valid ID, Medical clearance letter"
          disabled={isSubmitting}
        />
        {errors.requirements && (
          <p className="mt-1 text-sm text-red-600">{errors.requirements}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Separate multiple requirements with commas. These will be shown to patients before booking.
        </p>
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
          Duration (minutes) <span className="text-red-500">*</span>
        </label>
        <input
          id="duration_minutes"
          type="number"
          min="5"
          max="240"
          step="5"
          value={formData.duration_minutes === '' ? '' : formData.duration_minutes}
          onChange={(e) => {
            const value = e.target.value === '' ? '' : parseInt(e.target.value);
            handleChange('duration_minutes', isNaN(value as number) ? '' : value);
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.duration_minutes ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        {errors.duration_minutes && (
          <p className="mt-1 text-sm text-red-600">{errors.duration_minutes}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Typical duration for this service (5-240 minutes)
        </p>
      </div>

      {/* Requires Appointment */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="requires_appointment"
            type="checkbox"
            checked={formData.requires_appointment}
            onChange={(e) => handleChange('requires_appointment', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>
        <div className="ml-3">
          <label htmlFor="requires_appointment" className="text-sm font-medium text-gray-700">
            Requires Appointment
          </label>
          <p className="text-xs text-gray-500">
            Uncheck for walk-in services that don't need appointments
          </p>
        </div>
      </div>

      {/* Requires Medical Record */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="requires_medical_record"
            type="checkbox"
            checked={formData.requires_medical_record}
            onChange={(e) => handleChange('requires_medical_record', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>
        <div className="ml-3">
          <label htmlFor="requires_medical_record" className="text-sm font-medium text-gray-700">
            Requires Medical Record
          </label>
          <p className="text-xs text-gray-500">
            Uncheck for services that don't need medical documentation (e.g., simple procedures, health card issuance)
          </p>
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => handleChange('is_active', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
        </div>
        <div className="ml-3">
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active
          </label>
          <p className="text-xs text-gray-500">
            Inactive services won't appear in patient booking forms
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          variant="primary"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            mode === 'create' ? 'Create Service' : 'Update Service'
          )}
        </Button>
      </div>
    </form>
  );
}
