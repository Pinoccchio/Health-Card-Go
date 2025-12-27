'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, User, MapPin, Calendar, AlertCircle, Clock, Check } from 'lucide-react';

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

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: string;
  has_medical_record?: boolean; // Added to track if record exists
}

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string, appointmentId?: string) => void;
}

export function PatientSearchModal({ isOpen, onClose, onSelectPatient }: PatientSearchModalProps) {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Appointment selection state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [showAppointmentSelector, setShowAppointmentSelector] = useState(false);

  // Handle mounting for SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch patients immediately when modal opens (no debounce)
  useEffect(() => {
    if (isOpen) {
      setPage(1); // Reset to first page when modal opens
      fetchPatients();
    }
  }, [isOpen]);

  // Fetch patients on search term change or page change (with debounce)
  useEffect(() => {
    if (!isOpen) return;

    const delayDebounce = setTimeout(() => {
      fetchPatients();
    }, 300); // Debounce search

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

  const fetchPatientAppointments = async (patientId: string) => {
    setLoadingAppointments(true);
    try {
      // Fetch all relevant appointments including completed ones (for retroactive record creation)
      const response = await fetch(`/api/appointments?patient_id=${patientId}&status=scheduled,checked_in,in_progress,completed`);
      const data = await response.json();

      if (response.ok && data.success) {
        const appointments = data.data || [];

        // For each appointment, check if a medical record exists
        const appointmentsWithRecordStatus = await Promise.all(
          appointments.map(async (appointment: Appointment) => {
            const recordCheck = await fetch(`/api/medical-records?appointment_id=${appointment.id}`);
            const recordData = await recordCheck.json();

            return {
              ...appointment,
              has_medical_record: recordCheck.ok && recordData.success && recordData.count > 0
            };
          })
        );

        return appointmentsWithRecordStatus;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      return [];
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleSelectPatient = async (patient: Patient) => {
    // Fetch patient's active appointments
    const appointments = await fetchPatientAppointments(patient.id);

    if (appointments.length > 0) {
      // Patient has active appointments - show selector
      setSelectedPatient(patient);
      setPatientAppointments(appointments);
      setShowAppointmentSelector(true);
    } else {
      // No active appointments - create as walk-in
      onSelectPatient(patient.id);
      handleClose();
    }
  };

  const handleAppointmentSelection = (appointmentId?: string) => {
    if (selectedPatient) {
      onSelectPatient(selectedPatient.id, appointmentId);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setPage(1);
    setPatients([]);
    setError('');
    setSelectedPatient(null);
    setPatientAppointments([]);
    setShowAppointmentSelector(false);
    onClose();
  };

  const handleBackToPatients = () => {
    setSelectedPatient(null);
    setPatientAppointments([]);
    setShowAppointmentSelector(false);
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showAppointmentSelector) {
          handleBackToPatients();
        } else {
          handleClose();
        }
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
  }, [isOpen, showAppointmentSelector]);

  // Prevent SSR mismatch - only render portal on client
  if (!mounted || !isOpen) return null;

  // Render modal using portal to escape stacking context issues
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
          {!showAppointmentSelector ? (
            // PATIENT SEARCH VIEW
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
                    Select Patient
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Search for a patient to create a medical record
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

              {/* Results */}
              {!loading && patients.length === 0 && (
                <div className="text-center py-12">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm
                      ? 'Try adjusting your search term or check the patient number'
                      : 'No active patients available in the system'
                    }
                  </p>
                </div>
              )}

              {!loading && patients.length > 0 && (
                <>
                  {/* Patient List */}
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
                                      {patient.profiles.first_name} {patient.profiles.last_name}
                                    </div>
                                    <div className="text-sm text-gray-500 font-mono">
                                      {patient.patient_number}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {patient.age} years old • {patient.profiles.gender
                                    ? patient.profiles.gender.charAt(0).toUpperCase() + patient.profiles.gender.slice(1)
                                    : 'Not specified'
                                  }
                                </div>
                                <div className="text-sm text-gray-500">
                                  {patient.profiles.date_of_birth
                                    ? new Date(patient.profiles.date_of_birth).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : 'Not specified'
                                  }
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
                                  disabled={loadingAppointments}
                                >
                                  {loadingAppointments ? 'Loading...' : 'Select Patient'}
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
            </>
          ) : (
            // APPOINTMENT SELECTION VIEW
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <button
                    onClick={handleBackToPatients}
                    className="text-sm text-primary-teal hover:text-primary-teal/80 flex items-center mb-2"
                  >
                    ← Back to patient search
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Select Appointment
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedPatient?.profiles.first_name} {selectedPatient?.profiles.last_name} has {patientAppointments.length} appointment{patientAppointments.length !== 1 ? 's' : ''}
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

              {/* Info Banner */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Which appointment is this medical record for?</strong> Select an appointment to link the record, or choose "Walk-In Visit" if this is not related to a scheduled appointment.
                </p>
              </div>

              {/* Appointment List */}
              <div className="space-y-3 mb-6">
                {patientAppointments.map((appointment) => {
                  const appointmentDate = new Date(appointment.appointment_date);
                  const [hours, minutes] = appointment.appointment_time.split(':');
                  const time = `${hours}:${minutes} ${parseInt(hours) >= 12 ? 'PM' : 'AM'}`;
                  const hasRecord = appointment.has_medical_record;

                  return (
                    <button
                      key={appointment.id}
                      onClick={() => !hasRecord && handleAppointmentSelection(appointment.id)}
                      disabled={hasRecord}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                        hasRecord
                          ? 'border-green-200 bg-green-50/50 cursor-not-allowed opacity-75'
                          : 'border-gray-200 hover:border-primary-teal hover:bg-primary-teal/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                            hasRecord ? 'bg-green-100' : 'bg-primary-teal/10'
                          }`}>
                            {hasRecord ? (
                              <Check className="w-6 h-6 text-green-600" />
                            ) : (
                              <Calendar className="w-6 h-6 text-primary-teal" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {appointmentDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {time} • Queue #{appointment.appointment_number}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                              </span>
                              {hasRecord ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                  <Check className="w-3 h-3 mr-1" />
                                  Record Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800">
                                  No Record Yet
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!hasRecord && <div className="text-primary-teal">→</div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Walk-In Option */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">Or, if this is not related to a scheduled appointment:</p>
                <button
                  onClick={() => handleAppointmentSelection()}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Walk-In Visit</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Create a standalone medical record (not linked to any appointment)
                      </div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
