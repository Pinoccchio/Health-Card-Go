'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, MapPin, AlertCircle } from 'lucide-react';

interface Patient {
  id: string;
  patient_number: string;
  user_id: string | null;
  age: number;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    contact_number?: string;
    status: string;
    date_of_birth: string;
    gender: string;
    barangay_id: number;
    barangays: {
      id: number;
      name: string;
    };
  };
}

export interface SelectedPatientInfo {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  barangay_id: number;
  barangay_name: string;
}

interface DiseasePatientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: SelectedPatientInfo) => void;
}

export function DiseasePatientSelectionModal({
  isOpen,
  onClose,
  onSelectPatient
}: DiseasePatientSelectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Handle mounting for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch patients immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      fetchPatients();
    }
  }, [isOpen]);

  // Fetch patients on search term change or page change
  useEffect(() => {
    if (!isOpen) return;

    const delayDebounce = setTimeout(() => {
      fetchPatients();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, page]);

  const fetchPatients = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: 'active',
        page: page.toString(),
        limit: '10',
      });

      const response = await fetch(`/api/patients?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patients');
      }

      setPatients(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    const selectedInfo: SelectedPatientInfo = {
      id: patient.id,
      patient_number: patient.patient_number,
      first_name: patient.profiles.first_name,
      last_name: patient.profiles.last_name,
      age: patient.age,
      gender: patient.profiles.gender,
      barangay_id: patient.profiles.barangay_id,
      barangay_name: patient.profiles.barangays.name,
    };

    onSelectPatient(selectedInfo);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setPage(1);
    setPatients([]);
    setError('');
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
                Select Patient for Disease Surveillance
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Search for a patient to record disease case information
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by patient name or number (e.g., P2025000001)..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Searching patients...</p>
            </div>
          )}

          {/* No Results */}
          {!loading && patients.length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search term or check the patient number'
                  : 'No active patients available in the system'}
              </p>
            </div>
          )}

          {/* Patient List */}
          {!loading && patients.length > 0 && (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-primary-teal/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary-teal" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {patient.profiles.first_name} {patient.profiles.last_name}{' '}
                                  <span className="font-mono text-gray-600">({patient.patient_number})</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {patient.profiles.barangays.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {patient.age} years old • {patient.profiles.gender
                                ? patient.profiles.gender.charAt(0).toUpperCase() + patient.profiles.gender.slice(1)
                                : 'Not specified'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.profiles.date_of_birth
                                ? new Date(patient.profiles.date_of_birth).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Not specified'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                              {patient.profiles.barangays.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleSelectPatient(patient)}
                              className="inline-flex items-center px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors"
                            >
                              Select Patient
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
