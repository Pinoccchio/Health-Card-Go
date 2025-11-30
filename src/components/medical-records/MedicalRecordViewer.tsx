'use client';

import { getTemplate, TemplateType } from '@/lib/config/medicalRecordTemplates';
import { MedicalRecord } from '@/types/medical-records';

interface MedicalRecordViewerProps {
  record: MedicalRecord;
}

export default function MedicalRecordViewer({ record }: MedicalRecordViewerProps) {
  const template = getTemplate(record.template_type as TemplateType);

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
      {record.appointments && (
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
              <p className="text-sm text-gray-700 mt-1">
                Status: <span className="font-medium">{record.appointments.status}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
