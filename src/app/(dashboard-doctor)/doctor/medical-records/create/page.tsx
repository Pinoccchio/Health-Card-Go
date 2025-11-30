'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui';
import TemplateSelector from '@/components/medical-records/TemplateSelector';
import MedicalRecordForm from '@/components/medical-records/MedicalRecordForm';
import { TemplateType, getTemplate } from '@/lib/config/medicalRecordTemplates';
import { useToast } from '@/lib/contexts/ToastContext';
import { getTestPatientData, getTestAppointmentData } from '@/lib/utils/formHelpers';

interface Patient {
  id: string;
  patient_number: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient_id: string;
  patients: {
    id: string;
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export default function CreateMedicalRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const patientIdParam = searchParams.get('patient_id');
  const testMode = searchParams.get('testMode') === 'true'; // Enable test mode with ?testMode=true
  const toast = useToast();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch appointment and patient data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Test mode: use dummy data
        if (testMode) {
          const testPatient = getTestPatientData();
          const testAppointment = getTestAppointmentData();

          setPatient(testPatient as any);
          setAppointment(testAppointment as any);
          setLoading(false);

          toast.info('Test mode enabled - using dummy data', { duration: 5000 });
          return;
        }

        // Normal mode: fetch from API
        if (appointmentId) {
          // Fetch appointment details
          const response = await fetch(`/api/appointments/${appointmentId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch appointment');
          }

          setAppointment(data.data);
          // Extract patient from appointment
          const patientData: Patient = {
            id: data.data.patients.id,
            patient_number: data.data.patients.patient_number,
            user_id: data.data.patients.user_id,
            profiles: data.data.patients.profiles,
          };
          setPatient(patientData);

        } else if (patientIdParam) {
          // Fetch patient details directly
          const response = await fetch(`/api/patients/${patientIdParam}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch patient');
          }

          setPatient(data.data);
        } else {
          throw new Error('Either appointment_id or patient_id is required');
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appointmentId, patientIdParam, testMode]);

  // Handle template selection
  const handleSelectTemplate = (template: TemplateType) => {
    setSelectedTemplate(template);
  };

  // Handle form submission
  const handleSubmit = async (formData: Record<string, any>) => {
    if (!patient) {
      toast.error('Patient information is missing');
      return;
    }

    if (!selectedTemplate) {
      toast.warning('Please select a template');
      return;
    }

    const template = getTemplate(selectedTemplate);

    // Test mode: simulate success without API call
    if (testMode) {
      console.log('TEST MODE - Form Data:', formData);
      toast.success('Test mode: Form data logged to console (not saved to database)');
      return;
    }

    // Normal mode: submit to API
    try {
      const payload = {
        patient_id: patient.id,
        appointment_id: appointmentId || null,
        template_type: selectedTemplate,
        category: template.category,
        record_data: formData,
      };

      const response = await fetch('/api/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create medical record');
      }

      toast.success('Medical record created successfully!');
      router.push('/doctor/appointments');
    } catch (err: any) {
      console.error('Error creating medical record:', err);
      toast.error(err.message || 'An error occurred while creating the medical record');
    }
  };

  // Handle cancel - show confirmation dialog
  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  // Handle confirmed cancel
  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    router.back();
  };

  if (loading) {
    return (
      <DashboardLayout roleId={3} pageTitle="Create Medical Record">
        <Container size="full">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading patient information...</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout roleId={3} pageTitle="Create Medical Record">
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Data</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Button variant="danger" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout roleId={3} pageTitle="Create Medical Record">
        <Container size="full">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">Patient information not found.</p>
            <Button variant="warning" onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Create Medical Record"
      pageDescription="Document patient consultation and diagnosis"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Test Mode Banner */}
          {testMode && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800">Test Mode Active</h3>
                <p className="text-xs text-yellow-700 mt-1">
                  Using dummy data for testing. Form submissions will not be saved to the database.
                </p>
              </div>
            </div>
          )}

          {/* Header with Back Button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Medical Record</h1>
              <p className="text-gray-600 mt-1">
                Document patient consultation and diagnosis
              </p>
            </div>
            <Button variant="ghost" onClick={() => router.back()}>
              ← Back
            </Button>
          </div>

          {/* Patient Information Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Patient Number</p>
                <p className="text-lg font-semibold text-gray-900">{patient.patient_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Patient Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.profiles.first_name} {patient.profiles.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sex / Age</p>
                <p className="text-lg font-semibold text-gray-900">
                  {patient.profiles.gender || 'Unknown'} / {calculateAge(patient.profiles.date_of_birth)} years
                </p>
              </div>
            </div>

            {appointment && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">Appointment</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} at {formatAppointmentTime(appointment.appointment_time)}
                </p>
              </div>
            )}
          </div>

          {/* Template Selection */}
          {!selectedTemplate && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleSelectTemplate}
              />
            </div>
          )}

          {/* Medical Record Form */}
          {selectedTemplate && (
            <MedicalRecordForm
              templateType={selectedTemplate}
              patientId={patient.id}
              appointmentId={appointmentId}
              patient={patient}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </div>
      </Container>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleConfirmCancel}
        title="Discard Changes?"
        message="Are you sure you want to cancel? All entered data will be lost."
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="warning"
      />
    </DashboardLayout>
  );
}

// Helper function to format time from HH:MM:SS to 12-hour format with AM/PM
function formatAppointmentTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight
  return `${hour12}:${minutes} ${ampm}`;
}

// Helper function to calculate age
function calculateAge(dateOfBirth: string | null | undefined): number {
  // Handle null/undefined/empty values
  if (!dateOfBirth) {
    return 0;
  }

  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  // Check for Invalid Date
  if (isNaN(birthDate.getTime())) {
    return 0;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
