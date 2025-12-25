'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Calendar, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { formatTimeBlock, TimeBlock, TIME_BLOCKS } from '@/types/appointment';
import { MedicalRecordForm, MedicalRecordFormData } from '@/components/medical-records/MedicalRecordForm';

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
  const [medicalRecordData, setMedicalRecordData] = useState<MedicalRecordFormData>({
    category: 'general',
    diagnosis: '',
    prescription: '',
    notes: '',
  });
  const [isMedicalRecordValid, setIsMedicalRecordValid] = useState(false);

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

  const handleMedicalRecordChange = (data: MedicalRecordFormData, isValid: boolean) => {
    setMedicalRecordData(data);
    setIsMedicalRecordValid(isValid);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate medical record data if required
    if (serviceDetails?.requires_medical_record) {
      if (!isMedicalRecordValid || !medicalRecordData.diagnosis.trim()) {
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
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
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

                {/* Service Info Banner */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Service:</strong> {serviceDetails?.name}
                  </p>
                </div>

                {/* Medical Record Section - Conditional based on service requirements */}
                {serviceDetails?.requires_medical_record ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      Medical Record Information
                      <span className="text-red-500">*</span>
                    </h4>

                    <MedicalRecordForm
                      patientId={appointment.patients.id}
                      appointmentId={appointment.id}
                      serviceId={appointment.service_id}
                      serviceCategory={serviceDetails?.category}
                      isRequired={true}
                      onChange={handleMedicalRecordChange}
                      showLabels={true}
                    />
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Attendance Only</p>
                        <p>
                          This service does not require medical documentation. Completing will record attendance only.
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
