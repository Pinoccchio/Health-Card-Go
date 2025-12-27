'use client';

import { useState } from 'react';
import { Search, User, X, MapPin } from 'lucide-react';
import { DiseasePatientSelectionModal, SelectedPatientInfo as DiseasePatientInfo } from './DiseasePatientSelectionModal';

interface SelectedPatientInfo {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  barangay_id: number;
  barangay_name: string;
}

interface PatientSearchFieldProps {
  selectedPatient: SelectedPatientInfo | null;
  onSelectPatient: (patient: SelectedPatientInfo | null) => void;
  disabled?: boolean;
}

export function PatientSearchField({
  selectedPatient,
  onSelectPatient,
  disabled = false
}: PatientSearchFieldProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handlePatientSelect = (patientInfo: DiseasePatientInfo) => {
    // Disease modal passes complete patient info, no fetch needed
    onSelectPatient(patientInfo);
  };

  const handleClearPatient = () => {
    onSelectPatient(null);
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Select Patient <span className="text-red-500">*</span>
        </label>

        {!selectedPatient ? (
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            disabled={disabled}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 text-gray-600">
              <Search className="w-5 h-5" />
              <span className="text-sm">Search for a patient...</span>
            </div>
            <div className="text-xs text-gray-500">Click to search</div>
          </button>
        ) : (
          <div className="border-2 border-primary-teal bg-primary-teal/5 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-teal/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-teal" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </div>
                  <div className="text-sm text-gray-600 font-mono mt-0.5">
                    {selectedPatient.patient_number}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedPatient.age} years old • {selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedPatient.barangay_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearPatient}
                disabled={disabled}
                className="text-gray-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear selection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <DiseasePatientSelectionModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectPatient={handlePatientSelect}
      />
    </>
  );
}
