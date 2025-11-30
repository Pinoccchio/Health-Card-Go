'use client';

import { useState, useEffect } from 'react';
import { TemplateType, getTemplate, FieldDefinition } from '@/lib/config/medicalRecordTemplates';
import { Button } from '@/components/ui/Button';
import type { Patient } from '@/types';
import { getDefaultFormData } from '@/lib/utils/formHelpers';

// Date helper functions
const getTodayString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getDefaultFollowUpDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

interface MedicalRecordFormProps {
  templateType: TemplateType;
  patientId: string;
  appointmentId?: string | null;
  patient?: Patient | null; // Patient data for prefilling
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}

export default function MedicalRecordForm({
  templateType,
  patientId,
  appointmentId,
  patient,
  onSubmit,
  onCancel,
}: MedicalRecordFormProps) {
  const template = getTemplate(templateType);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill toggle state (persisted to localStorage)
  const [autoFillEnabled, setAutoFillEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('healthcard_autofill') === 'true';
    }
    return false;
  });

  // Handle toggle change
  const handleToggleAutoFill = (enabled: boolean) => {
    setAutoFillEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthcard_autofill', enabled.toString());
    }

    if (enabled) {
      // Fill form with complete sample data
      const sampleData = getDefaultFormData(templateType, patient);
      setFormData(sampleData);
    } else {
      // Clear form (keep only patient data if available)
      if (patient) {
        const calculateAge = (dateOfBirth: string): number => {
          const today = new Date();
          const birthDate = new Date(dateOfBirth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };

        setFormData({
          patient_name: `${patient.profiles.first_name} ${patient.profiles.last_name}`,
          patient_number: patient.patient_number,
          age: calculateAge(patient.profiles.date_of_birth),
          sex: patient.profiles.gender,
          barangay: patient.profiles.barangays?.name || 'Unknown',
        });
      } else {
        setFormData({});
      }
    }
  };

  // Initialize form data when component mounts or template/patient changes
  useEffect(() => {
    if (autoFillEnabled) {
      // If toggle is ON, fill with sample data
      const sampleData = getDefaultFormData(templateType, patient);
      setFormData(sampleData);
    } else if (patient) {
      // If toggle is OFF but patient exists, fill only patient data
      const calculateAge = (dateOfBirth: string): number => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      setFormData({
        patient_name: `${patient.profiles.first_name} ${patient.profiles.last_name}`,
        patient_number: patient.patient_number,
        age: calculateAge(patient.profiles.date_of_birth),
        sex: patient.profiles.gender,
        barangay: patient.profiles.barangays?.name || 'Unknown',
      });
    }
  }, [templateType, patient, autoFillEnabled]);

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    template.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          newErrors[field.name] = `${field.label} is required`;
        }

        // Validate number ranges
        if (field.type === 'number' && formData[field.name]) {
          const value = Number(formData[field.name]);
          if (field.min !== undefined && value < field.min) {
            newErrors[field.name] = `${field.label} must be at least ${field.min}`;
          }
          if (field.max !== undefined && value > field.max) {
            newErrors[field.name] = `${field.label} must be at most ${field.max}`;
          }
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // LAYER 1: Immediate disable to prevent rapid double-clicks
    // Set submitting state BEFORE validation to block the button immediately
    if (isSubmitting) {
      console.warn('Form already submitting, ignoring duplicate submission');
      return;
    }

    setIsSubmitting(true);

    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error]');
      firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsSubmitting(false); // Re-enable if validation fails
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitting(false); // Re-enable if submission fails
    }
    // Note: Don't re-enable on success - let parent component handle navigation
  };

  // Render field based on type
  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name] || '';
    const hasError = !!errors[field.name];

    const baseInputClass = `
      w-full px-3 py-2 border rounded-md shadow-sm
      focus:ring-2 focus:ring-primary-teal focus:border-primary-teal
      ${hasError ? 'border-red-500' : 'border-gray-300'}
    `;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
            data-error={hasError ? 'true' : undefined}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClass}
            data-error={hasError ? 'true' : undefined}
          />
        );

      case 'number':
        return (
          <div className="flex items-center">
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step="any"
              className={baseInputClass}
              data-error={hasError ? 'true' : undefined}
            />
            {field.unit && (
              <span className="ml-2 text-sm text-gray-600 whitespace-nowrap">
                {field.unit}
              </span>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseInputClass}
            data-error={hasError ? 'true' : undefined}
          >
            <option value="">-- Select {field.label} --</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        const minDate = getTodayString();
        const defaultDate = field.name === 'follow_up_date' ? getDefaultFollowUpDate() : '';

        return (
          <input
            type="date"
            value={value || defaultDate}
            min={minDate}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseInputClass}
            data-error={hasError ? 'true' : undefined}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-4 h-4 text-primary-teal border-gray-300 rounded focus:ring-primary-teal"
              data-error={hasError ? 'true' : undefined}
              />
            <label className="ml-2 text-sm text-gray-700">
              {field.placeholder || field.label}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-4 h-4 text-primary-teal border-gray-300 focus:ring-primary-teal"
                      />
                <label className="ml-2 text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleFieldChange(field.name, selected);
            }}
            className={`${baseInputClass} h-32`}
            data-error={hasError ? 'true' : undefined}
          >
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Template header */}
      <div className="bg-primary-teal text-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-2">{template.name}</h2>
        <p className="text-white/90">{template.description}</p>
        {template.requiresEncryption && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-md bg-yellow-500 text-white text-sm font-medium">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            This record will be encrypted
          </div>
        )}
      </div>

      {/* Auto-fill Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Auto-fill Form Data</h4>
            <p className="text-xs text-blue-700">Toggle ON to prefill all fields with sample data for faster debugging</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoFillEnabled}
            onChange={(e) => handleToggleAutoFill(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Form sections */}
      {template.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            {section.title}
          </h3>

          <div className="space-y-4">
            {section.fields.map((field, fieldIndex) => (
              <div key={fieldIndex}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {renderField(field)}

                {/* Help text */}
                {field.helpText && !errors[field.name] && (
                  <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
                )}

                {/* Error message */}
                {errors[field.name] && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors[field.name]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Form actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            'Save Medical Record'
          )}
        </Button>
      </div>
    </form>
  );
}
