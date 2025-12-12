'use client';

import { AlertTriangle, Pill, FileText, Accessibility } from 'lucide-react';

interface MedicalContextPanelProps {
  medical_history?: any;
  allergies?: any;
  current_medications?: any;
  accessibility_requirements?: string | null;
  patientId: string;
}

export function MedicalContextPanel({
  medical_history,
  allergies,
  current_medications,
  accessibility_requirements,
  patientId,
}: MedicalContextPanelProps) {
  // Parse JSONB fields safely
  const parseJsonbField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof field === 'object' && field.items) {
      return Array.isArray(field.items) ? field.items : [];
    }
    return [];
  };

  const allergyList = parseJsonbField(allergies);
  const historyList = parseJsonbField(medical_history);
  const medicationList = parseJsonbField(current_medications);
  const hasAnyData = allergyList.length > 0 || historyList.length > 0 || medicationList.length > 0 || accessibility_requirements;

  if (!hasAnyData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500 text-center">No pre-existing conditions reported</p>
        <p className="text-xs text-gray-400 text-center mt-1">
          This shows the patient's self-reported medical background.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Patient Medical Background
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Pre-existing conditions and ongoing treatments</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Allergies - Critical Alert */}
        {allergyList.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-xs font-semibold text-red-800 mb-1">ALLERGIES</p>
                <div className="flex flex-wrap gap-1">
                  {allergyList.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical History */}
        {historyList.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Medical History</p>
            <div className="flex flex-wrap gap-1">
              {historyList.map((condition, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs"
                >
                  {condition}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current Medications */}
        {medicationList.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Pill className="w-3 h-3 mr-1" />
              Current Medications
            </p>
            <div className="flex flex-wrap gap-1">
              {medicationList.map((medication, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs"
                >
                  {medication}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Accessibility Requirements */}
        {accessibility_requirements && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2 flex items-center">
              <Accessibility className="w-3 h-3 mr-1" />
              Accessibility
            </p>
            <p className="text-sm text-gray-600">{accessibility_requirements}</p>
          </div>
        )}

        {/* Link to Full Medical Records */}
        <div className="pt-2 border-t border-gray-200">
          <a
            href={`/healthcare-admin/patients/${patientId}/medical-records`}
            className="text-xs text-primary-teal hover:text-primary-teal/80 font-medium flex items-center"
          >
            <FileText className="w-3 h-3 mr-1" />
            View Full Medical Records →
          </a>
        </div>
      </div>
    </div>
  );
}
