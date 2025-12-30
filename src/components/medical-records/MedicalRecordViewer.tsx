'use client';

import { getTemplate, TemplateType } from '@/lib/config/medicalRecordTemplates';
import { MedicalRecord } from '@/types/medical-records';

interface MedicalRecordViewerProps {
  record: MedicalRecord;
}

export default function MedicalRecordViewer({ record }: MedicalRecordViewerProps) {
  const template = getTemplate(record.template_type as TemplateType);
  const hasDecryptionError = (record as any).decryption_failed;

  // Handle decryption failure
  if (hasDecryptionError) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">Unable to Decrypt Record</h3>
            <p className="text-sm text-yellow-700">
              This is an encrypted medical record, but we were unable to decrypt it. This may be a temporary issue.
              Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Helper to format field value
  const formatValue = (value: any, fieldType?: string): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (fieldType === 'date' && typeof value === 'string') {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return value;
      }
    }

    return String(value);
  };

  // Handle case where template is not found
  if (!template) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">Unknown Template Type</h3>
            <p className="text-sm text-yellow-700">
              Template type "{record.template_type}" is not recognized. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Record Data Sections */}
      {template.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            {section.title}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {section.fields.map((field, fieldIndex) => {
              const value = record.record_data?.[field.name];
              const displayValue = formatValue(value, field.type);

              return (
                <div key={fieldIndex} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <dt className="text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                    {field.unit && value && <span className="text-gray-400 ml-1">({field.unit})</span>}
                  </dt>
                  <dd className={`text-base text-gray-900 ${field.type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>
                    {displayValue}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Appointment Info (if linked) */}
      {record.appointments?.appointment_date && record.appointments?.appointment_time && (
        <div className="bg-primary-teal/10 border border-primary-teal/20 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-primary-teal mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-primary-teal-dark mb-1">Linked to Appointment</h4>
              <p className="text-sm text-gray-700">
                Date: {new Date(record.appointments.appointment_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} at {record.appointments.appointment_time}
              </p>
              {record.appointments.status && (
                <p className="text-sm text-gray-700 mt-1">
                  Status: <span className="font-medium">{record.appointments.status}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
