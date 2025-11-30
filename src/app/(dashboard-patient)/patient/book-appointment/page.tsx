'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar, Clock, AlertCircle, CheckCircle2, Lock, Sparkles, Info } from 'lucide-react';
import { getReasonTemplates } from '@/lib/config/appointmentTemplates';
import { getMinBookingDateString } from '@/lib/utils/timezone';
import { ProcessingTimeline } from '@/components/appointments/ProcessingTimeline';
import {
  getCategoryLabel,
  getAdminRoleLabel,
  isConfidentialCategory,
  isFreeService,
  getCategoryColors,
  getExpectedProcessingTime,
} from '@/lib/utils/serviceHelpers';

interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  requires_appointment: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  remaining: number;
}

export default function PatientBookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reasonTemplate, setReasonTemplate] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [reason, setReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load services on mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services?requires_appointment=true');
      const data = await response.json();
      if (data.success) {
        setServices(data.data || []);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDate) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/appointments/available-slots?date=${selectedDate}&only_available=true`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableSlots(data.slots || []);
      } else {
        setError(data.reason || 'Unable to load available slots');
        setAvailableSlots([]);
      }
    } catch (err) {
      setError('Failed to load available time slots');
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setStep(3);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate if "Other" is selected but no custom reason provided
    if (reasonTemplate === 'Other (please specify)' && !customReason.trim()) {
      setError('Please provide a reason for your visit');
      setLoading(false);
      return;
    }

    // Combine template and custom reason
    const finalReason = reasonTemplate === 'Other (please specify)' ? customReason : reasonTemplate;

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          reason: finalReason,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/patient/appointments';
        }, 3000);
      } else {
        setError(data.error || 'Failed to book appointment');
      }
    } catch (err) {
      setError('An unexpected error occurred');
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
      <DashboardLayout roleId={4} pageTitle="Appointment Booked" pageDescription="">
        <Container size="full">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Appointment Booking Submitted!
              </h2>
              <p className="text-gray-600">
                Your appointment request has been received and is currently <strong>pending</strong> processing.
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
                  <h4 className="font-semibold mb-1">What Happens Next?</h4>
                  <p>
                    Our {getAdminRoleLabel(selectedServiceDetails.category)} will review your booking and assign an appropriate doctor.
                    You'll receive a confirmation notification {getExpectedProcessingTime(selectedServiceDetails.category).toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center">Redirecting to your appointments...</p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Book Appointment"
      pageDescription="Schedule your next visit (7-day advance booking required)"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow">
          {/* Progress Steps */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Select Service' },
                { num: 2, label: 'Choose Date' },
                { num: 3, label: 'Pick Time' },
                { num: 4, label: 'Confirm' },
              ].map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.num
                        ? 'bg-primary-teal text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {s.num}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                    {s.label}
                  </span>
                  {i < 3 && (
                    <div className="w-12 sm:w-24 h-0.5 bg-gray-300 mx-2"></div>
                  )}
                </div>
              ))}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Service
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose the healthcare service you need. Each service is managed by specialized administrators.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map((service) => {
                    const categoryColors = getCategoryColors(service.category);
                    const isConfidential = isConfidentialCategory(service.category);
                    const isFree = isFreeService(service.name);

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service.id)}
                        className="text-left p-5 border-2 border-gray-300 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 flex-1 pr-2">
                            {service.name}
                          </h4>
                          {isFree && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 flex-shrink-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              FREE
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {service.description}
                        </p>

                        {/* Admin Category Badge */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${categoryColors.bgColor} ${categoryColors.textColor}`}>
                            {getAdminRoleLabel(service.category)}
                          </span>
                          {isConfidential && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              <Lock className="w-3 h-3 mr-1" />
                              Confidential
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                          <span>Duration: {service.duration_minutes} min</span>
                          <span className="text-gray-400">• Doctor assigned after booking</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Information Panel */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <h5 className="font-semibold text-gray-900 mb-1">About Our Appointment System</h5>
                      <p>
                        Each service is managed by specialized administrators who will review your booking and assign the most appropriate doctor based on your needs and their availability.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Choose Date */}
            {step === 2 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Choose a Date
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Appointments must be booked at least 7 days in advance. Only weekdays (Monday-Friday) are available.
                </p>
                <input
                  type="date"
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                />
                <div className="mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Back to services
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pick Time */}
            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Time Slot
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Available time slots for {selectedDate} (Operating hours: 8:00 AM - 5:00 PM)
                </p>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading available slots...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={`p-3 text-center rounded-lg border-2 transition-colors ${
                          slot.available
                            ? 'border-gray-300 hover:border-primary-teal hover:bg-primary-teal/5'
                            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-sm font-medium">
                          {new Date(`2000-01-01T${slot.time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {slot.remaining} left
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No available slots for this date
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setStep(2);
                      setSelectedDate('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Choose different date
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && selectedServiceDetails && (
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confirm Appointment
                </h3>

                {/* Appointment Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Service:</dt>
                      <dd className="text-sm text-gray-900 font-medium">
                        {selectedServiceDetails.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Date:</dt>
                      <dd className="text-sm text-gray-900">{selectedDate}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">Time:</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* What Happens Next Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    What Happens Next
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2 ml-2">
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">1.</span>
                      <span>Your booking will be reviewed by our <strong>{getAdminRoleLabel(selectedServiceDetails.category)}</strong></span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">2.</span>
                      <span>A qualified doctor will be assigned based on availability and your needs</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">3.</span>
                      <span>You'll receive a confirmation notification ({getExpectedProcessingTime(selectedServiceDetails.category).toLowerCase()})</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2 flex-shrink-0">4.</span>
                      <span>A reminder will be sent 3 days before your appointment</span>
                    </li>
                  </ol>
                </div>

                {/* Reason for Visit */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Visit (Optional)
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Providing a reason helps our {getAdminRoleLabel(selectedServiceDetails.category)} assign the most appropriate doctor for your needs.
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
                    <option value="">Select a reason...</option>
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
                        placeholder="Please describe your reason for this appointment..."
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {customReason.length}/500 characters
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
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
