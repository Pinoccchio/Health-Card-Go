'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, FileText, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { formatTimeBlock, TimeBlock, TIME_BLOCKS } from '@/types/appointment';

interface AppointmentCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointment: {
    id: string;
    appointment_number: number;
    appointment_date: string;
    appointment_time: string;
    time_block: TimeBlock;
    service_id: number;
    patients: {
      id: string;
      patient_number: string;
      profiles: {
        first_name: string;
        last_name: string;
        email: string;
      };
    };
  };
}

interface ServiceDetails {
  id: number;
  name: string;
  category: string;
  requires_medical_record: boolean;
}

export function AppointmentCompletionModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
}: AppointmentCompletionModalProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [medicalRecordData, setMedicalRecordData] = useState({
    category: 'general',
    diagnosis: '',
    prescription: '',
    notes: '',
  });

  // Fetch service details to check if medical record is required
  useEffect(() => {
    if (isOpen && appointment) {
      fetchServiceDetails();
    }
  }, [isOpen, appointment]);

  const fetchServiceDetails = async () => {
    setIsLoadingService(true);
    try {
      const response = await fetch(`/api/services/${appointment.service_id}`);
      const data = await response.json();

      if (data.success && data.data) {
        setServiceDetails(data.data);
      } else {
        toast.error('Failed to load service details');
      }
    } catch (error) {
      console.error('Error fetching service details:', error);
      toast.error('An error occurred while loading service details');
    } finally {
      setIsLoadingService(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate medical record data if required
    if (serviceDetails?.requires_medical_record) {
      if (!medicalRecordData.diagnosis.trim()) {
        toast.error('Diagnosis is required for this service');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: any = {};

      // Only include medical record if service requires it or if data is provided
      if (serviceDetails?.requires_medical_record || medicalRecordData.diagnosis.trim()) {
        payload.medical_record = {
          category: medicalRecordData.category,
          diagnosis: medicalRecordData.diagnosis.trim() || null,
          prescription: medicalRecordData.prescription.trim() || null,
          notes: medicalRecordData.notes.trim() || null,
        };
      }

      const response = await fetch(`/api/appointments/${appointment.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment completed successfully');
        resetForm();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to complete appointment');
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setMedicalRecordData({
      category: 'general',
      diagnosis: '',
      prescription: '',
      notes: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Complete Appointment
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Appointment #{appointment.appointment_number} - {appointment.patients.profiles.first_name} {appointment.patients.profiles.last_name}
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
            {isLoadingService ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-teal" />
                <span className="ml-3 text-gray-600">Loading service details...</span>
              </div>
            ) : (
              <>
                {/* Appointment Details */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Appointment Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Time Block</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            appointment.time_block === 'AM'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {appointment.time_block}
                          </span>
                          <span className="text-xs text-gray-600">
                            {TIME_BLOCKS[appointment.time_block].timeRange}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-xs text-gray-500">Queue Number</p>
                        <p className="text-sm font-medium text-gray-900">
                          #{appointment.appointment_number}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">
                        Service: {serviceDetails?.name}
                      </p>
                      {serviceDetails?.requires_medical_record ? (
                        <p className="text-blue-800">
                          <strong>Medical record required:</strong> This service requires you to provide medical record information.
                        </p>
                      ) : (
                        <p className="text-blue-800">
                          Medical record is optional for this service. You may complete the appointment without providing medical information.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Record Section */}
                {serviceDetails?.requires_medical_record && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-gray-700" />
                      <h4 className="font-medium text-gray-900">
                        Medical Record Information
                        {serviceDetails?.requires_medical_record && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                    </div>

                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        Category {serviceDetails?.requires_medical_record && <span className="text-red-500">*</span>}
                      </label>
                      <select
                        id="category"
                        value={medicalRecordData.category}
                        onChange={(e) =>
                          setMedicalRecordData((prev) => ({ ...prev, category: e.target.value }))
                        }
                        required={serviceDetails?.requires_medical_record}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      >
                        <option value="general">General</option>
                        <option value="healthcard">Health Card</option>
                        <option value="hiv">HIV (Encrypted)</option>
                        <option value="pregnancy">Pregnancy (Encrypted)</option>
                        <option value="immunization">Immunization</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the category that best matches this medical record
                      </p>
                    </div>

                    {/* Diagnosis */}
                    <div>
                      <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">
                        Diagnosis {serviceDetails?.requires_medical_record && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        id="diagnosis"
                        value={medicalRecordData.diagnosis}
                        onChange={(e) =>
                          setMedicalRecordData((prev) => ({ ...prev, diagnosis: e.target.value }))
                        }
                        required={serviceDetails?.requires_medical_record}
                        rows={3}
                        placeholder="Enter diagnosis, findings, or health status..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      />
                    </div>

                    {/* Prescription */}
                    <div>
                      <label htmlFor="prescription" className="block text-sm font-medium text-gray-700 mb-2">
                        Prescription (Optional)
                      </label>
                      <textarea
                        id="prescription"
                        value={medicalRecordData.prescription}
                        onChange={(e) =>
                          setMedicalRecordData((prev) => ({ ...prev, prescription: e.target.value }))
                        }
                        rows={3}
                        placeholder="Enter prescribed medications, dosage, and instructions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        value={medicalRecordData.notes}
                        onChange={(e) =>
                          setMedicalRecordData((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        rows={3}
                        placeholder="Enter any additional notes, observations, or recommendations..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Warning for sensitive categories */}
                {(medicalRecordData.category === 'hiv' || medicalRecordData.category === 'pregnancy') && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
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
              </>
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
                disabled={isLoading || isLoadingService}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Appointment
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
