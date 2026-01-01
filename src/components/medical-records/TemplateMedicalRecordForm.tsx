'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, FileText, Activity } from 'lucide-react';
import {
  getTemplate,
  TemplateType,
  MedicalRecordCategory,
  FieldDefinition,
  MedicalRecordTemplate
} from '@/lib/config/medicalRecordTemplates';

export interface TemplateMedicalRecordFormData {
  category: MedicalRecordCategory;
  template_type: TemplateType;
  record_data: Record<string, any>; // Template-specific fields
  // Basic fields for backward compatibility
  diagnosis?: string;
  prescription?: string;
  notes?: string;
}

interface TemplateMedicalRecordFormProps {
  patientData?: {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    age: number;
    sex: string;
    barangay: string;
  };
  appointmentId?: string;
  serviceId?: number;
  serviceCategory?: string;
  isRequired?: boolean;
  initialData?: Partial<TemplateMedicalRecordFormData>;
  onChange?: (data: TemplateMedicalRecordFormData, isValid: boolean) => void;
  showLabels?: boolean;
  className?: string;
}

/**
 * Template-Aware Medical Record Form Component
 *
 * Dynamically renders form fields based on selected template type.
 * Supports all 5 template types:
 * - general_checkup: Vital signs, diagnosis, treatment plan
 * - hiv: HIV testing, CD4 count, ART regimen (encrypted)
 * - prenatal: Pregnancy monitoring, gestational age, risk assessment (encrypted)
 * - immunization: Vaccine details, administration, follow-up
 * - laboratory: Lab test results (currently not used in appointment completion)
 */
export function TemplateMedicalRecordForm({
  patientData,
  appointmentId,
  serviceId,
  serviceCategory,
  isRequired = false,
  initialData,
  onChange,
  showLabels = true,
  className = '',
}: TemplateMedicalRecordFormProps) {
  const [formData, setFormData] = useState<TemplateMedicalRecordFormData>({
    category: initialData?.category || 'general',
    template_type: initialData?.template_type || 'general_checkup',
    record_data: initialData?.record_data || {},
    diagnosis: initialData?.diagnosis || '',
    prescription: initialData?.prescription || '',
    notes: initialData?.notes || '',
  });

  const [currentTemplate, setCurrentTemplate] = useState<MedicalRecordTemplate | undefined>(undefined);

  // Auto-derive category from service category if provided
  useEffect(() => {
    if (serviceCategory && !initialData?.category) {
      const categoryMap: Record<string, MedicalRecordCategory> = {
        'healthcard': 'healthcard',
        'hiv': 'hiv',
        'pregnancy': 'pregnancy',
        'laboratory': 'laboratory',
        'immunization': 'immunization',
        'general': 'general',
      };

      const derivedCategory = categoryMap[serviceCategory] || 'general';
      setFormData(prev => ({ ...prev, category: derivedCategory }));
    }
  }, [serviceCategory, initialData]);

  // Auto-derive template_type from category
  useEffect(() => {
    const templateTypeMap: Record<MedicalRecordCategory, TemplateType> = {
      'general': 'general_checkup',
      'healthcard': 'general_checkup',
      'hiv': 'hiv',
      'pregnancy': 'prenatal',
      'immunization': 'immunization',
      'laboratory': 'laboratory',
    };

    const derivedTemplateType = templateTypeMap[formData.category];
    if (derivedTemplateType && formData.template_type !== derivedTemplateType) {
      setFormData(prev => ({ ...prev, template_type: derivedTemplateType }));
    }
  }, [formData.category]);

  // Load template and pre-fill patient data
  useEffect(() => {
    const template = getTemplate(formData.template_type);
    if (!template) return;

    setCurrentTemplate(template);

    // Pre-fill patient information fields if patient data is provided
    if (patientData) {
      setFormData(prev => {
        const updatedRecordData = { ...prev.record_data };

        // Pre-fill common patient fields (readonly)
        updatedRecordData['patient_name'] = `${patientData.first_name} ${patientData.last_name}`;
        updatedRecordData['patient_number'] = patientData.patient_number;
        updatedRecordData['age'] = patientData.age;
        updatedRecordData['sex'] = patientData.sex;
        updatedRecordData['barangay'] = patientData.barangay;

        return { ...prev, record_data: updatedRecordData };
      });
    }
  }, [formData.template_type, patientData]);

  // Notify parent of changes with validation
  useEffect(() => {
    if (onChange) {
      const isValid = validateForm();
      onChange(formData, isValid);
    }
  }, [formData, isRequired, onChange]);

  const validateForm = (): boolean => {
    if (!isRequired) return true;
    if (!currentTemplate) return false;

    // Check all required fields in template
    for (const section of currentTemplate.sections) {
      for (const field of section.fields) {
        if (field.required && field.readonly !== true) {
          const value = formData.record_data[field.name];
          if (!value || (typeof value === 'string' && !value.trim())) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      record_data: {
        ...prev.record_data,
        [fieldName]: value,
      },
    }));

    // Also update basic fields for backward compatibility
    if (fieldName === 'diagnosis') {
      setFormData(prev => ({ ...prev, diagnosis: value }));
    } else if (fieldName === 'prescription') {
      setFormData(prev => ({ ...prev, prescription: value }));
    } else if (fieldName === 'notes' || fieldName === 'clinical_notes' || fieldName === 'counseling_notes') {
      setFormData(prev => ({ ...prev, notes: value }));
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData.record_data[field.name] || '';

    // Read-only fields (pre-filled patient data)
    if (field.readonly) {
      return (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
          </label>
          <input
            type="text"
            value={value}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
          />
        </div>
      );
    }

    // Different input types
    switch (field.type) {
      case 'text':
        return (
          <div key={field.name}>
            {showLabels && (
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
                {field.unit && <span className="text-gray-500 text-xs ml-1">({field.unit})</span>}
              </label>
            )}
            <input
              id={field.name}
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={isRequired && field.required}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name}>
            {showLabels && (
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
                {field.unit && <span className="text-gray-500 text-xs ml-1">({field.unit})</span>}
              </label>
            )}
            <input
              id={field.name}
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={isRequired && field.required}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.name}>
            {showLabels && (
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <input
              id={field.name}
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={isRequired && field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name}>
            {showLabels && (
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <select
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={isRequired && field.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            >
              <option value="">-- Select {field.label} --</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name}>
            {showLabels && (
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            )}
            <textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              required={isRequired && field.required}
              placeholder={field.placeholder}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
            {field.helpText && (
              <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center">
            <input
              id={field.name}
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              required={isRequired && field.required}
              className="w-4 h-4 text-primary-teal border-gray-300 rounded focus:ring-primary-teal"
            />
            {showLabels && (
              <label htmlFor={field.name} className="ml-2 text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isSensitiveCategory = formData.category === 'hiv' || formData.category === 'pregnancy';

  if (!currentTemplate) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Optional/Required Info Banner */}
      {!isRequired && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Medical Record (Optional)</p>
              <p>
                Medical record is optional for this service. You may complete without providing medical information.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{currentTemplate.name}</h4>
        <p className="text-xs text-gray-600">{currentTemplate.description}</p>
      </div>

      {/* Render Template Sections */}
      {currentTemplate.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
            {section.title}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field) => renderField(field))}
          </div>
        </div>
      ))}

      {/* Encryption Warning for Sensitive Categories */}
      {isSensitiveCategory && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Sensitive Data Protection</p>
              <p>
                This medical record will be encrypted for privacy and security. Access will be restricted to authorized personnel only.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
