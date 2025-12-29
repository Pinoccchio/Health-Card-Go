'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, FileText } from 'lucide-react';

export interface MedicalRecordFormData {
  category: 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';
  template_type: 'general_checkup' | 'immunization' | 'prenatal' | 'hiv' | 'laboratory';
  diagnosis: string;
  prescription: string;
  notes: string;
}

interface MedicalRecordFormProps {
  patientId?: string;
  appointmentId?: string;
  serviceId?: number;
  serviceCategory?: string;
  isRequired?: boolean;
  initialData?: Partial<MedicalRecordFormData>;
  onChange?: (data: MedicalRecordFormData, isValid: boolean) => void;
  showLabels?: boolean;
  className?: string;
}

/**
 * Reusable Medical Record Form Component
 *
 * Used in:
 * - AppointmentCompletionModal (inline appointment completion)
 * - CreateMedicalRecordModal (standalone record creation)
 * - Medical Records page (create/edit)
 *
 * Features:
 * - Auto-derives category from service if provided
 * - Shows encryption warnings for HIV/Pregnancy
 * - Validates based on required/optional mode
 * - Controlled component pattern
 */
export function MedicalRecordForm({
  patientId,
  appointmentId,
  serviceId,
  serviceCategory,
  isRequired = false,
  initialData,
  onChange,
  showLabels = true,
  className = '',
}: MedicalRecordFormProps) {
  const [formData, setFormData] = useState<MedicalRecordFormData>({
    category: initialData?.category || 'general',
    template_type: initialData?.template_type || 'general_checkup',
    diagnosis: initialData?.diagnosis || '',
    prescription: initialData?.prescription || '',
    notes: initialData?.notes || '',
  });

  // Auto-derive category from service category if provided
  useEffect(() => {
    if (serviceCategory && !initialData?.category) {
      const categoryMap: Record<string, MedicalRecordFormData['category']> = {
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
    const templateTypeMap: Record<MedicalRecordFormData['category'], MedicalRecordFormData['template_type']> = {
      'general': 'general_checkup',
      'healthcard': 'general_checkup', // HealthCard uses general checkup template
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

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const isValid = isRequired ? !!formData.diagnosis.trim() : true;
      onChange(formData, isValid);
    }
  }, [formData, isRequired, onChange]);

  const handleFieldChange = (field: keyof MedicalRecordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSensitiveCategory = formData.category === 'hiv' || formData.category === 'pregnancy';

  return (
    <div className={`space-y-4 ${className}`}>
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

      {/* Category */}
      <div>
        {showLabels && (
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category {isRequired && <span className="text-red-500">*</span>}
          </label>
        )}
        <select
          id="category"
          value={formData.category}
          onChange={(e) => handleFieldChange('category', e.target.value)}
          required={isRequired}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
        >
          <option value="general">General</option>
          <option value="healthcard">Health Card</option>
          <option value="hiv">HIV (Encrypted)</option>
          <option value="pregnancy">Pregnancy (Encrypted)</option>
          <option value="immunization">Immunization</option>
          <option value="laboratory">Laboratory</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select the category that best matches this medical record
        </p>
      </div>

      {/* Diagnosis */}
      <div>
        {showLabels && (
          <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">
            Diagnosis {isRequired && <span className="text-red-500">*</span>}
          </label>
        )}
        <textarea
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
          required={isRequired}
          rows={4}
          placeholder="Enter diagnosis, findings, or health status..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
        />
        {isRequired && !formData.diagnosis.trim() && (
          <p className="text-xs text-red-500 mt-1">Diagnosis is required for this service</p>
        )}
      </div>

      {/* Prescription */}
      <div>
        {showLabels && (
          <label htmlFor="prescription" className="block text-sm font-medium text-gray-700 mb-2">
            Prescription (Optional)
          </label>
        )}
        <textarea
          id="prescription"
          value={formData.prescription}
          onChange={(e) => handleFieldChange('prescription', e.target.value)}
          rows={3}
          placeholder="Enter prescribed medications, dosage, and instructions..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        {showLabels && (
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
        )}
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          rows={3}
          placeholder="Enter any additional notes, observations, or recommendations..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
        />
      </div>

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
