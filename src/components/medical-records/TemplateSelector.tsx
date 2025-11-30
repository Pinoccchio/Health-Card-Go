'use client';

import { TemplateType, medicalRecordTemplates } from '@/lib/config/medicalRecordTemplates';

interface TemplateSelectorProps {
  selectedTemplate: TemplateType | null;
  onSelectTemplate: (template: TemplateType) => void;
}

export default function TemplateSelector({ selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  const templates = Object.values(medicalRecordTemplates);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Record Type</h3>
        <p className="text-sm text-gray-600">Choose the type of medical record to create</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <button
            key={template.type}
            onClick={() => onSelectTemplate(template.type)}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${selectedTemplate === template.type
                ? 'border-primary-teal bg-primary-teal/10 shadow-md'
                : 'border-gray-200 hover:border-primary-teal/50 hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {template.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {template.description}
                </p>
              </div>

              {template.requiresEncryption && (
                <div className="ml-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Encrypted
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center text-xs text-gray-500">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100">
                {template.category}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div className="mt-4 p-4 bg-primary-teal/10 border border-primary-teal/20 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-primary-teal mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-primary-teal-dark">
                Selected: {medicalRecordTemplates[selectedTemplate].name}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Fill out the form below to create this medical record
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
