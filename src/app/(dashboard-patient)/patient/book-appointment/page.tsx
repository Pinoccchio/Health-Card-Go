'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar, Clock, AlertCircle, CheckCircle2, Lock, Sparkles, Info, User } from 'lucide-react';
import { getReasonTemplates } from '@/lib/config/appointmentTemplates';
import { getMinBookingDateString } from '@/lib/utils/timezone';
import { ProcessingTimeline } from '@/components/appointments/ProcessingTimeline';
import { ServiceRequirements } from '@/components/patient/ServiceRequirements';
import {
  getCategoryLabel,
  getAdminRoleLabel,
  isConfidentialCategory,
  isFreeService,
  getCategoryColors,
  getExpectedProcessingTime,
} from '@/lib/utils/serviceHelpers';
import {
  TimeBlock,
  TimeBlockInfo,
  formatTimeBlock,
  getTimeBlockColor,
  HealthCardType,
  LabLocationType,
  AppointmentUpload,
  isHealthCardService,
  requiresDocumentUpload,
  getRequiredUploads,
} from '@/types/appointment';
import { DocumentUploadForm } from '@/components/patient/DocumentUploadForm';

interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  requires_appointment: boolean;
  requirements?: string[]; // JSONB array of requirement strings
  admin_count?: number;
  assigned_admins?: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
}

export default function PatientBookAppointmentPage() {
  const t = useTranslations('book_appointment');
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | ''>('');
  const [reasonTemplate, setReasonTemplate] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [reason, setReason] = useState('');
  const [availableBlocks, setAvailableBlocks] = useState<TimeBlockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Health Card specific state
  const [selectedCardType, setSelectedCardType] = useState<HealthCardType | null>(null);
  const [selectedLabLocation, setSelectedLabLocation] = useState<LabLocationType | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<AppointmentUpload[]>([]);
  const [labResultsConfirmed, setLabResultsConfirmed] = useState(false);

  // Draft appointment state (for upload flow)
  const [draftAppointmentId, setDraftAppointmentId] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const draftIdRef = useRef<string | null>(null); // Track draft ID for cleanup

  // Suspension state
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [noShowCount, setNoShowCount] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Service availability state
  const [serviceAvailableDays, setServiceAvailableDays] = useState<string[]>([]);

  // Load services and check suspension status on mount
  useEffect(() => {
    fetchServices();
    checkSuspensionStatus();
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    draftIdRef.current = draftAppointmentId;
  }, [draftAppointmentId]);

  // Cleanup draft appointment when component unmounts
  useEffect(() => {
    return () => {
      // Use ref to get current draft ID at unmount time
      if (draftIdRef.current) {
        console.log('🧹 [CLEANUP] Component unmounting with active draft, cleaning up...');
        deleteDraftAppointment(draftIdRef.current);
      }
    };
  }, []); // Empty deps - only runs on mount/unmount, not on step changes

  const checkSuspensionStatus = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (data.success && data.data) {
        const profile = data.data.profile;
        const patient = data.data.patient;

        if (profile?.status === 'suspended' && patient?.suspended_until) {
          setIsSuspended(true);
          setSuspendedUntil(patient.suspended_until);
          setNoShowCount(patient.no_show_count || 0);

          // Calculate days remaining
          const suspendedDate = new Date(patient.suspended_until);
          const now = new Date();
          const days = Math.ceil((suspendedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysRemaining(days);
        }
      }
    } catch (err) {
      console.error('Error checking suspension status:', err);
    }
  };

  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const response = await fetch('/api/services?requires_appointment=true');
      const data = await response.json();
      if (data.success) {
        setServices(data.data || []);
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setServices([]); // Set empty array on error
    } finally {
      setServicesLoading(false);
    }
  };

  // Load available blocks when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableBlocks();
    }
  }, [selectedDate]);

  // Fetch service availability when service changes
  useEffect(() => {
    const fetchServiceAvailability = async () => {
      if (!selectedService) {
        setServiceAvailableDays([]);
        return;
      }

      try {
        const response = await fetch(`/api/services/${selectedService}`);
        const data = await response.json();
        if (data.success && data.data?.available_days) {
          setServiceAvailableDays(data.data.available_days);
        } else {
          // Default to all weekdays if not configured
          setServiceAvailableDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
        }
      } catch (error) {
        console.error('Error fetching service availability:', error);
        // Default to all weekdays on error
        setServiceAvailableDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      }
    };

    fetchServiceAvailability();
  }, [selectedService]);

  const fetchAvailableBlocks = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/appointments/available-slots?date=${selectedDate}&only_available=true`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableBlocks(data.blocks || []);
      } else {
        setError(data.reason || t('errors.loading_blocks_failed'));
        setAvailableBlocks([]);
      }
    } catch (err) {
      setError(t('errors.loading_blocks_failed'));
      setAvailableBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
    // Stay on Step 1 to show card type/lab location selectors (HealthCard)
    // Or allow user to click Continue button to proceed
  };

  /**
   * Creates a draft appointment for upload flow (HealthCard services only)
   * This draft appointment provides an ID for DocumentUploadForm to upload files
   */
  const createDraftAppointment = async () => {
    if (!selectedService || !selectedCardType || !selectedLabLocation) {
      console.error('❌ [DRAFT] Missing required data for draft creation');
      return null;
    }

    setCreatingDraft(true);
    setError('');

    try {
      const requestBody = {
        service_id: selectedService,
        appointment_date: new Date().toISOString().split('T')[0], // Temp date (will be updated at Step 5)
        time_block: 'AM', // Temp time block (will be updated at Step 5)
        status: 'draft', // Draft status
        card_type: selectedCardType,
        lab_location: selectedLabLocation,
        reason: 'Draft appointment for document upload', // Placeholder reason
      };

      console.log('📝 [DRAFT] Creating draft appointment:', requestBody);

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success && data.appointment) {
        console.log('✅ [DRAFT] Draft appointment created:', data.appointment.id);
        setDraftAppointmentId(data.appointment.id);
        return data.appointment.id;
      } else {
        console.error('❌ [DRAFT] Failed to create draft:', data.error);
        setError(data.error || 'Failed to create draft appointment');
        return null;
      }
    } catch (err) {
      console.error('❌ [DRAFT] Error creating draft:', err);
      setError('An unexpected error occurred');
      return null;
    } finally {
      setCreatingDraft(false);
    }
  };

  /**
   * Deletes draft appointment (cleanup when user navigates away)
   */
  const deleteDraftAppointment = async (draftId: string) => {
    if (!draftId) return;

    try {
      console.log('🗑️ [DRAFT CLEANUP] Deleting draft appointment:', draftId);

      const response = await fetch(`/api/appointments/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        console.log('✅ [DRAFT CLEANUP] Draft appointment deleted successfully');
      } else {
        const errorData = await response.json();
        console.error('❌ [DRAFT CLEANUP] Failed to delete draft:', errorData);
      }
    } catch (err) {
      console.error('❌ [DRAFT CLEANUP] Error deleting draft:', err);
    }
  };

  const handleStep1Continue = async () => {
    if (!selectedService) return;

    // HealthCard: Create draft appointment & go to Step 2 (Upload)
    // HIV/Prenatal: Skip to Step 3 (Date) since no upload needed
    if (isHealthCardService(selectedService)) {
      // Create draft appointment before showing upload step
      const draftId = await createDraftAppointment();
      if (draftId) {
        setStep(2); // Go to Upload Documents
      }
      // If draft creation failed, stay on Step 1 (error message shown)
    } else {
      setStep(3); // Skip upload, go directly to Choose Date
    }
  };

  const handleUploadsComplete = (uploads: AppointmentUpload[]) => {
    setUploadedDocuments(uploads);
  };

  const handleStep2Continue = () => {
    // Determine required uploads based on lab location
    const requiredUploadsCount = selectedLabLocation === 'inside_cho' ? 3 : 1;

    // Check if all required files are uploaded
    if (uploadedDocuments.length < requiredUploadsCount) {
      if (selectedLabLocation === 'inside_cho') {
        setError('Please upload all 3 required documents (Lab Request, Payment Receipt, Valid ID) before continuing');
      } else {
        setError('Please upload your Valid ID before continuing');
      }
      return;
    }

    // Validate checkbox for Outside CHO
    if (selectedLabLocation === 'outside_cho' && !labResultsConfirmed) {
      setError('Please confirm that you have obtained laboratory results from an outside facility');
      return;
    }

    // Clear error and proceed to Step 3 (Choose Date)
    setError('');
    setStep(3);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedBlock('');
    setStep(4); // Go to Step 4 (Pick Time)
  };

  const handleBlockSelect = (block: TimeBlock) => {
    setSelectedBlock(block);
    setStep(5); // Go to Step 5 (Confirm)
  };

  // Removed createAppointmentForUploads - appointments now created only at final step (Step 5)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Block submission if account is suspended
    if (isSuspended) {
      setError(t('errors.cannot_book_suspended'));
      setLoading(false);
      return;
    }

    // Validate if "Other" is selected but no custom reason provided
    if (reasonTemplate === 'Other (please specify)' && !customReason.trim()) {
      setError(t('errors.reason_required'));
      setLoading(false);
      return;
    }

    // Combine template and custom reason
    const finalReason = reasonTemplate === 'Other (please specify)' ? customReason : reasonTemplate;

    try {
      // Build request body with conditional health card fields
      const requestBody: any = {
        service_id: selectedService,
        appointment_date: selectedDate,
        time_block: selectedBlock,
        reason: finalReason,
      };

      // Add health card specific fields if applicable
      if (selectedService && isHealthCardService(selectedService)) {
        requestBody.card_type = selectedCardType;
        requestBody.lab_location = selectedLabLocation;
      }

      let response;
      let data;

      // If we have a draft appointment (HealthCard flow), convert it to pending
      if (draftAppointmentId) {
        console.log('📝 [SUBMIT] Converting draft to pending:', draftAppointmentId, requestBody);

        // Update the draft appointment with final data and change status to 'pending'
        response = await fetch(`/api/appointments/${draftAppointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...requestBody,
            status: 'pending', // Convert from 'draft' to 'pending'
          }),
        });

        data = await response.json();
      } else {
        // No draft (HIV/Prenatal flow) - create new appointment directly
        console.log('📝 [SUBMIT] Creating new appointment:', requestBody);

        response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        data = await response.json();
      }

      if (response.ok && data.success) {
        setSuccess(true);
        setDraftAppointmentId(null); // Clear draft ID to prevent cleanup
        setTimeout(() => {
          window.location.href = '/patient/appointments';
        }, 3000);
      } else {
        setError(data.error || t('errors.booking_failed'));
      }
    } catch (err) {
      setError(t('errors.unexpected_error'));
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    // Use reliable Philippine timezone utility for minimum booking date
    return getMinBookingDateString();
  };

  // Get selected service details
  const selectedServiceDetails = services.find(s => s.id === selectedService);

  if (success && selectedServiceDetails) {
    return (
      <DashboardLayout roleId={4} pageTitle={t('success.page_title')} pageDescription="">
        <Container size="full">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('success.heading')}
              </h2>
              <p className="text-gray-600">
                {t('success.message')}
              </p>
            </div>

            {/* Processing Timeline */}
            <div className="max-w-2xl mx-auto mb-8">
              <ProcessingTimeline
                currentStep="booking"
                serviceCategory={selectedServiceDetails.category}
              />
            </div>

            {/* Important Information */}
            <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <h4 className="font-semibold mb-1">{t('success.what_next_heading')}</h4>
                  <p>
                    {t('success.what_next_message', {
                      role: t('success.healthcare_staff'),
                      time: t('success.shortly')
                    })}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center">{t('success.redirecting')}</p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={4}
      pageTitle={t('title')}
      pageDescription={t('description')}
    >
      <Container size="full">
        {/* Suspension Warning Banner */}
        {isSuspended && suspendedUntil && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg shadow-md">
            <div className="flex items-start">
              <Lock className="w-6 h-6 text-red-600 mt-1 mr-4 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  {t('suspension.title')}
                </h3>
                <div className="text-sm text-red-800 space-y-2">
                  <p className="font-medium">
                    {t('suspension.message', { count: noShowCount })}
                  </p>
                  <p>
                    <strong>{t('suspension.suspension_period')}:</strong> {daysRemaining > 0 ? t('suspension.days_remaining', { days: daysRemaining }) : t('suspension.expires_today')}
                  </p>
                  <p>
                    <strong>{t('suspension.reinstatement_date')}:</strong>{' '}
                    {new Date(suspendedUntil).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="font-medium">{t('suspension.what_this_means')}:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                      <li>{t('suspension.bullet1')}</li>
                      <li>{t('suspension.bullet2')}</li>
                      <li>{t('suspension.bullet3')}</li>
                    </ul>
                  </div>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <p className="text-xs">
                      {t('suspension.contact_message')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Progress Steps - Horizontal numbered indicators */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-6">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              {(() => {
                const isHealthCard = selectedService && isHealthCardService(selectedService);

                // Define steps based on service type
                const steps = isHealthCard
                  ? [
                      { num: 1, label: 'Select Service', sublabel: 'Choose service & option' },
                      { num: 2, label: 'Upload', sublabel: 'Upload documents' },
                      { num: 3, label: 'Choose Date', sublabel: 'Pick a schedule' },
                      { num: 4, label: 'Pick Time', sublabel: 'Select a slot' },
                      { num: 5, label: 'Booking Confirm', sublabel: 'Review & submit' },
                    ]
                  : [
                      { num: 1, label: 'Select Service', sublabel: 'Choose service' },
                      { num: 2, label: 'Choose Date', sublabel: 'Pick a schedule', actualStep: 3 },
                      { num: 3, label: 'Pick Time', sublabel: 'Select a slot', actualStep: 4 },
                      { num: 4, label: 'Booking Confirm', sublabel: 'Review & submit', actualStep: 5 },
                    ];

                return steps.map((s, i) => {
                  // For HIV/Prenatal, use actualStep for comparison (they skip step 2)
                  const stepToCompare = 'actualStep' in s ? s.actualStep : s.num;
                  const isStepActive = step >= (stepToCompare || s.num);

                  return (
                    <div key={s.num} className="flex flex-col items-center flex-1">
                      <div className="flex items-center w-full">
                        {i > 0 && (
                          <div className={`flex-1 h-0.5 transition-all ${isStepActive ? 'bg-primary-teal' : 'bg-gray-300'}`}></div>
                        )}
                        <div className="relative flex-shrink-0 mx-2">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                              isStepActive
                                ? 'bg-primary-teal border-primary-teal text-white' // Active/Completed: teal
                                : 'bg-white border-gray-300 text-gray-600' // Pending: white
                            }`}
                          >
                            {s.num}
                          </div>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`flex-1 h-0.5 transition-all ${step > (stepToCompare || s.num) ? 'bg-primary-teal' : 'bg-gray-300'}`}></div>
                        )}
                      </div>
                      <div className="text-center mt-2">
                        <p className={`text-xs font-semibold transition-colors ${
                          isStepActive
                            ? 'text-primary-teal' // Active: teal text
                            : 'text-gray-600' // Pending: gray text
                        }`}>
                          {s.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                          {s.sublabel}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Step 1: Select Service */}
            {step === 1 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Select a Service
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose a main service. If it has options (HealthCard), select the card type and lab location.
                </p>

                {/* Loading State */}
                {servicesLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading services...</p>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No services available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Form */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Main Service Dropdown */}
                      <div>
                        <label htmlFor="main-service" className="block text-sm font-semibold text-gray-900 mb-2">
                          Main Service
                        </label>
                        <select
                          id="main-service"
                          value={selectedService || ''}
                          onChange={(e) => {
                            const serviceId = Number(e.target.value);
                            if (serviceId) {
                              setSelectedService(serviceId);
                              setSelectedCardType(null);
                              setSelectedLabLocation(null);
                            } else {
                              setSelectedService(null);
                              setSelectedCardType(null);
                              setSelectedLabLocation(null);
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal text-gray-900 bg-white"
                        >
                          <option value="">Select a service...</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Card Type Dropdown - Only for HealthCard */}
                      {selectedService && isHealthCardService(selectedService) && (
                        <div>
                          <label htmlFor="card-type" className="block text-sm font-semibold text-gray-900 mb-2">
                            Card Type
                          </label>
                          <select
                            id="card-type"
                            value={selectedCardType || ''}
                            onChange={(e) => {
                              const value = e.target.value as HealthCardType;
                              if (value) {
                                setSelectedCardType(value);
                              } else {
                                setSelectedCardType(null);
                              }
                            }}
                            className="w-full px-4 py-3 border-2 border-primary-teal rounded-md focus:outline-none focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/20 text-gray-900 bg-white font-medium"
                          >
                            <option value="" className="text-gray-500">Select a card type</option>
                            <option value="food_handler">Food (Yellow)</option>
                            <option value="non_food">Nonfood (Green)</option>
                            <option value="pink">Pink Card</option>
                          </select>
                        </div>
                      )}

                      {/* Lab Location Dropdown - Only when card type selected */}
                      {selectedService && isHealthCardService(selectedService) && selectedCardType && (
                        <div>
                          <label htmlFor="lab-location" className="block text-sm font-semibold text-gray-900 mb-2">
                            Laboratory Location
                          </label>
                          <select
                            id="lab-location"
                            value={selectedLabLocation || ''}
                            onChange={(e) => {
                              const value = e.target.value as LabLocationType;
                              if (value) {
                                setSelectedLabLocation(value);
                              } else {
                                setSelectedLabLocation(null);
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal text-gray-900 bg-white"
                          >
                            <option value="">Select lab location...</option>
                            <option value="inside_cho">Inside CHO Laboratory</option>
                            <option value="outside_cho">Outside CHO Laboratory</option>
                          </select>
                        </div>
                      )}

                      {/* Continue Button */}
                      <div className="flex justify-end pt-4">
                        {selectedService && !isHealthCardService(selectedService) && (
                          <button
                            onClick={handleStep1Continue}
                            className="px-8 py-3 bg-primary-teal text-white font-semibold rounded-md hover:bg-primary-teal/90 transition-colors shadow-md hover:shadow-lg"
                          >
                            Continue
                          </button>
                        )}
                        {selectedService && isHealthCardService(selectedService) && selectedCardType && selectedLabLocation && (
                          <button
                            onClick={handleStep1Continue}
                            className="px-8 py-3 bg-primary-teal text-white font-semibold rounded-md hover:bg-primary-teal/90 transition-colors shadow-md hover:shadow-lg"
                          >
                            Continue
                          </button>
                        )}
                      </div>

                      {/* Footer Note */}
                      <p className="text-xs text-gray-500 italic pt-4 border-t border-gray-200">
                        No personal info fields are required on this page. (Name and contact removed.)
                      </p>
                    </div>

                    {/* Right: Service Descriptions & Requirements */}
                    <div className="lg:col-span-1">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 sticky top-6">
                        <h4 className="text-base font-bold text-gray-900 mb-3">
                          Service Descriptions & Requirements
                        </h4>

                        {!selectedService ? (
                          <p className="text-sm text-gray-600">
                            Select a service to view its description and requirements.
                          </p>
                        ) : (() => {
                          const service = services.find(s => s.id === selectedService);
                          if (!service) return null;

                          return (
                            <div className="space-y-4">
                              {/* Service Description */}
                              <div>
                                <h5 className="text-sm font-semibold text-primary-teal mb-2">
                                  {service.name}
                                </h5>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {service.description}
                                </p>
                              </div>

                              {/* Health Card Requirements */}
                              {isHealthCardService(service.id) && (
                                <div className="space-y-3">
                                  <h5 className="text-sm font-semibold text-gray-900 mb-2">
                                    Requirements for Health Card:
                                  </h5>

                                  {/* Food (Yellow) Card */}
                                  <div>
                                    <p className="text-xs font-semibold text-yellow-700 mb-1">
                                      • Food (Yellow Card):
                                    </p>
                                    <p className="text-xs text-gray-600 ml-4">
                                      For food handlers and workers in the food industry. Tests required: Urinalysis, Stool Test, CBC (Complete Blood Count), Chest X-ray.
                                    </p>
                                  </div>

                                  {/* Non-Food (Green) Card */}
                                  <div>
                                    <p className="text-xs font-semibold text-green-700 mb-1">
                                      • Non-Food (Green Card):
                                    </p>
                                    <p className="text-xs text-gray-600 ml-4">
                                      For non-food handlers or general employees in other industries. Tests required: Urinalysis, Stool Test, CBC (Complete Blood Count), Chest X-ray.
                                    </p>
                                  </div>

                                  {/* Pink Card */}
                                  <div>
                                    <p className="text-xs font-semibold text-pink-700 mb-1">
                                      • Pink Card:
                                    </p>
                                    <p className="text-xs text-gray-600 ml-4">
                                      For occupations involving skin-to-skin contact (e.g., massage therapists, health workers). Tests required: Gram Stain, Hepatitis B Test, Syphilis Test, HIV Test.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Service Requirements */}
                              {service.requirements && service.requirements.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-2">
                                    General Requirements:
                                  </h5>
                                  <ul className="text-xs text-gray-600 space-y-1">
                                    {service.requirements.map((req, idx) => (
                                      <li key={idx} className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>{req}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Choose Date */}
            {step === 3 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Choose Date
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Pick a schedule for your appointment (at least 7 days in advance).
                </p>

                <div className="max-w-xl">
                  <label htmlFor="appointment-date" className="block text-sm font-semibold text-gray-900 mb-2">
                    Appointment Date
                  </label>
                  <input
                    id="appointment-date"
                    type="date"
                    min={getMinDate()}
                    value={selectedDate}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {serviceAvailableDays.length > 0 && serviceAvailableDays.length < 5 ? (
                      <>
                        This service is available on: <span className="font-semibold text-primary-teal">{serviceAvailableDays.join(', ')}</span>.
                        {' '}Appointments must be booked at least 7 days in advance.
                      </>
                    ) : (
                      'Appointments must be booked at least 7 days in advance. Only weekdays are available (Monday-Friday).'
                    )}
                  </p>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setStep(selectedService && isHealthCardService(selectedService) ? 2 : 1)}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      ← Back to {selectedService && isHealthCardService(selectedService) ? 'Document Upload' : 'Service Selection'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pick Time Block */}
            {step === 4 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Pick Time
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select a time slot for {selectedDate}
                </p>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                    <p className="mt-2 text-sm text-gray-500">{t('step3.loading')}</p>
                  </div>
                ) : availableBlocks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableBlocks.map((block) => (
                      <button
                        key={block.block}
                        onClick={() => handleBlockSelect(block.block)}
                        disabled={!block.available}
                        className={`
                          p-6 rounded-lg border-2 transition-all text-left
                          ${block.available
                            ? 'border-gray-300 hover:border-primary-teal hover:bg-primary-teal/5 hover:shadow-lg'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          }
                        `}
                      >
                        {/* Block Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Clock className={`w-6 h-6 ${block.available ? 'text-primary-teal' : 'text-gray-400'}`} />
                            <div>
                              <h4 className="text-lg font-bold text-gray-900">
                                {block.label}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {block.timeRange}
                              </p>
                            </div>
                          </div>
                          {!block.available && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                              {t('step3.full_badge')}
                            </span>
                          )}
                        </div>

                        {/* Capacity Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{t('step3.availability')}</span>
                            <span className={`font-bold ${
                              block.remaining > 10 ? 'text-green-600' :
                              block.remaining > 5 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {t('step3.slots', { remaining: block.remaining, capacity: block.capacity })}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                block.remaining > 10 ? 'bg-green-500' :
                                block.remaining > 5 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${(block.remaining / block.capacity) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Status Message */}
                        {block.available ? (
                          <p className="text-xs text-green-700 font-medium">
                            {t('step3.available')}
                          </p>
                        ) : (
                          <p className="text-xs text-red-700 font-medium">
                            {t('step3.fully_booked')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('step3.no_blocks')}
                  </div>
                )}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setStep(3); // Go back to date selection (now Step 3)
                      setSelectedDate('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    ← Choose Different Date
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Document Upload (Health Card only) */}
            {step === 2 && selectedService && isHealthCardService(selectedService) && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Upload Documents
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Upload the required documents for your health card application.
                </p>

                <div className="max-w-3xl">
                  {/* Show loading state while creating draft */}
                  {creatingDraft && !draftAppointmentId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-teal"></div>
                        <p className="text-sm text-blue-800">Preparing upload area...</p>
                      </div>
                    </div>
                  )}

                  {/* Show upload form once draft is created */}
                  {draftAppointmentId && (
                    <>
                      {/* Info banner for Inside CHO */}
                      {selectedLabLocation === 'inside_cho' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <p className="text-sm text-blue-800 font-medium mb-2">
                            <strong>Inside CHO Laboratory</strong>
                          </p>
                          <p className="text-sm text-blue-700">
                            Please upload the following 3 required documents:
                          </p>
                          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                            <li>Laboratory Request Form (downloadable template)</li>
                            <li>Payment Receipt from CHO Treasury</li>
                            <li>Valid Government-Issued ID</li>
                          </ul>
                        </div>
                      )}

                      {/* Info banner for Outside CHO */}
                      {selectedLabLocation === 'outside_cho' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <p className="text-sm text-blue-800 font-medium mb-2">
                            <strong>Outside CHO Laboratory</strong>
                          </p>
                          <p className="text-sm text-blue-700">
                            Please upload your Valid Government-Issued ID and confirm you have obtained your lab results.
                          </p>
                        </div>
                      )}

                      {/* Document Upload Form */}
                      <DocumentUploadForm
                        appointmentId={draftAppointmentId}
                        requiredUploads={
                          selectedLabLocation === 'inside_cho'
                            ? ['lab_request', 'payment_receipt', 'valid_id']
                            : ['valid_id']
                        }
                        onUploadsComplete={handleUploadsComplete}
                        disabled={false}
                      />

                      {/* Confirmation Checkbox for Outside CHO */}
                      {selectedLabLocation === 'outside_cho' && (
                        <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                          <input
                            type="checkbox"
                            id="lab-results-confirm"
                            checked={labResultsConfirmed}
                            onChange={(e) => setLabResultsConfirmed(e.target.checked)}
                            className="mt-1 w-4 h-4 text-primary-teal border-gray-300 rounded focus:ring-primary-teal"
                          />
                          <label htmlFor="lab-results-confirm" className="text-sm text-gray-700 cursor-pointer">
                            I confirm that I have obtained my laboratory results from an outside facility
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-200">
                    <button
                      onClick={() => {
                        // Cleanup draft when going back
                        if (draftAppointmentId) {
                          deleteDraftAppointment(draftAppointmentId);
                          setDraftAppointmentId(null);
                        }
                        setStep(1);
                        setUploadedDocuments([]);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      ← Back to Service Selection
                    </button>
                    <button
                      onClick={handleStep2Continue}
                      disabled={
                        creatingDraft ||
                        uploadedDocuments.length < (selectedLabLocation === 'inside_cho' ? 3 : 1) ||
                        (selectedLabLocation === 'outside_cho' && !labResultsConfirmed)
                      }
                      className="px-8 py-3 bg-primary-teal text-white font-semibold rounded-md hover:bg-primary-teal/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Date Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Booking Confirm */}
            {step === 5 && selectedServiceDetails && (
              <form onSubmit={handleSubmit}>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Booking Confirm
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Review your appointment details and submit your booking.
                </p>

                {/* Appointment Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">{t('step4.service_label')}</dt>
                      <dd className="text-sm text-gray-900 font-medium">
                        {selectedServiceDetails.name}
                      </dd>
                    </div>

                    {/* Health Card specific fields */}
                    {isHealthCardService(selectedService!) && (
                      <>
                        {selectedCardType && (
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Card Type</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedCardType === 'food_handler' && '🟡 Yellow Card (Food Handler)'}
                              {selectedCardType === 'non_food' && '🟢 Green Card (Non-Food)'}
                              {selectedCardType === 'pink' && '🩷 Pink Card (Service/Clinical)'}
                            </dd>
                          </div>
                        )}
                        {selectedLabLocation && (
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Laboratory</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedLabLocation === 'inside_cho' ? 'Inside CHO' : 'Outside CHO'}
                            </dd>
                          </div>
                        )}
                        {uploadedDocuments.length > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-sm font-medium text-gray-500">Documents</dt>
                            <dd className="text-sm text-gray-900">
                              {uploadedDocuments.length} file(s) uploaded ✓
                            </dd>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">{t('step4.date_label')}</dt>
                      <dd className="text-sm text-gray-900">{selectedDate}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">{t('step4.time_block_label')}</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(selectedBlock as TimeBlock)}`}>
                          {selectedBlock}
                        </span>
                        <span className="ml-2 text-gray-600">
                          {selectedBlock && formatTimeBlock(selectedBlock as TimeBlock)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* What Happens Next Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    {t('step4.what_happens_next.heading')}
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2 ml-2">
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">1.</span>
                      <span>{t('step4.what_happens_next.step1', { role: getAdminRoleLabel(selectedServiceDetails.category) })}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">2.</span>
                      <span>{t('step4.what_happens_next.step2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">3.</span>
                      <span>{t('step4.what_happens_next.step3', { time: getExpectedProcessingTime(selectedServiceDetails.category).toLowerCase() })}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">4.</span>
                      <span>{t('step4.what_happens_next.step4')}</span>
                    </li>
                  </ol>
                </div>

                {/* Reason for Visit */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('step4.reason_label')}
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    {t('step4.reason_help', { role: getAdminRoleLabel(selectedServiceDetails.category) })}
                  </p>

                  {/* Dropdown for template selection */}
                  <select
                    value={reasonTemplate}
                    onChange={(e) => {
                      setReasonTemplate(e.target.value);
                      if (e.target.value !== 'other') {
                        setCustomReason(''); // Clear custom input when not "Other"
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal mb-3"
                  >
                    <option value="">{t('step4.reason_placeholder')}</option>
                    {getReasonTemplates(selectedServiceDetails.category).map((template) => (
                      <option key={template.value} value={template.label}>
                        {template.label}
                      </option>
                    ))}
                  </select>

                  {/* Conditional textarea for "Other" */}
                  {reasonTemplate === 'Other (please specify)' && (
                    <>
                      <textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value.slice(0, 500))}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                        placeholder={t('step4.custom_reason_placeholder')}
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {t('step4.character_count', { count: customReason.length })}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      // If HealthCard with uploads, go back to step 4 (uploads)
                      // Otherwise go back to step 3 (time selection)
                      if (selectedService && isHealthCardService(selectedService) && selectedLabLocation && requiresDocumentUpload(selectedLabLocation)) {
                        setStep(4);
                      } else {
                        setStep(3);
                      }
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t('step4.booking_button_loading') : t('step4.booking_button')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
