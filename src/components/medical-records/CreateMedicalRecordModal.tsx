'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Loader2, Search, User } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { MedicalRecordForm, MedicalRecordFormData } from './MedicalRecordForm';

interface Patient {
  id: string;
  patient_number: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface CreateMedicalRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Create Medical Record Modal
 *
 * Used on Medical Records page to create standalone medical records
 * for walk-in patients or retroactive documentation.
 *
 * Features:
 * - Patient search/autocomplete
 * - Optional appointment linking
 * - Reuses MedicalRecordForm component
 * - Submits to POST /api/medical-records
 */
export function CreateMedicalRecordModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateMedicalRecordModalProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [medicalRecordData, setMedicalRecordData] = useState<MedicalRecordFormData>({
    category: 'general',
    diagnosis: '',
    prescription: '',
    notes: '',
  });
  const [isMedicalRecordValid, setIsMedicalRecordValid] = useState(false);

  // Fetch patients based on search query
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      fetchPatients(searchQuery);
    } else {
      setPatients([]);
      setShowPatientDropdown(false);
    }
  }, [searchQuery]);

  const fetchPatients = async (query: string) => {
    setIsLoadingPatients(true);
    try {
      const response = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (data.success && data.data) {
        setPatients(data.data);
        setShowPatientDropdown(true);
      } else {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery(`${patient.profiles.first_name} ${patient.profiles.last_name} (${patient.patient_number})`);
    setShowPatientDropdown(false);
  };

  const handleMedicalRecordChange = (data: MedicalRecordFormData, isValid: boolean) => {
    setMedicalRecordData(data);
    setIsMedicalRecordValid(isValid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!medicalRecordData.diagnosis.trim()) {
      toast.error('Diagnosis is required');
      return;
    }

    setIsLoading(true);

    try {
      // Map category to template_type
      const categoryToTemplateMap: Record<string, string> = {
        'general': 'general_checkup',
        'healthcard': 'general_checkup',
        'hiv': 'hiv',
        'pregnancy': 'prenatal',
        'immunization': 'immunization',
        'laboratory': 'laboratory',
      };

      const template_type = categoryToTemplateMap[medicalRecordData.category] || 'general_checkup';

      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          category: medicalRecordData.category,
          template_type,
          record_data: {
            diagnosis: medicalRecordData.diagnosis,
            prescription: medicalRecordData.prescription,
            notes: medicalRecordData.notes,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Medical record created successfully');
        resetForm();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to create medical record');
      }
    } catch (error) {
      console.error('Error creating medical record:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSelectedPatient(null);
    setMedicalRecordData({
      category: 'general',
      diagnosis: '',
      prescription: '',
      notes: '',
    });
    setIsMedicalRecordValid(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-teal" />
                Create Medical Record
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Create a standalone medical record (walk-in or retroactive documentation)
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Patient Search */}
            <div className="mb-6">
              <label htmlFor="patient-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Patient <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {isLoadingPatients ? (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <input
                  id="patient-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => patients.length > 0 && setShowPatientDropdown(true)}
                  placeholder="Search by name or patient number..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                />
              </div>

              {/* Patient Dropdown */}
              {showPatientDropdown && patients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-xl bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-8 h-8 bg-primary-teal/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-teal" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {patient.profiles.first_name} {patient.profiles.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{patient.patient_number}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Patient Display */}
              {selectedPatient && (
                <div className="mt-3 p-3 bg-primary-teal/5 border border-primary-teal/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-teal rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedPatient.profiles.first_name} {selectedPatient.profiles.last_name}
                      </p>
                      <p className="text-xs text-gray-600">{selectedPatient.patient_number}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatient(null);
                        setSearchQuery('');
                      }}
                      className="ml-auto text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Medical Record Form */}
            {selectedPatient && (
              <div className="border-t border-gray-200 pt-6">
                <MedicalRecordForm
                  patientId={selectedPatient.id}
                  appointmentId={undefined} // No appointment for standalone records
                  serviceId={undefined}
                  serviceCategory={undefined}
                  isRequired={true} // Always require diagnosis for manual creation
                  initialData={medicalRecordData}
                  onChange={handleMedicalRecordChange}
                  showLabels={true}
                />
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedPatient || !isMedicalRecordValid}
                className="bg-primary-teal hover:bg-primary-teal/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Create Medical Record
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
