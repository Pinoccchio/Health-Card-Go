'use client';

import { useState, useEffect } from 'react';
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
} from '@/types/appointment';

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

  // Suspension state
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [noShowCount, setNoShowCount] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Load services and check suspension status on mount
  useEffect(() => {
    fetchServices();
    checkSuspensionStatus();
  }, []);

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
        setError(data.reason || 'Unable to load available blocks');
        setAvailableBlocks([]);
      }
    } catch (err) {
      setError('Failed to load available time blocks');
      setAvailableBlocks([]);
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
    setSelectedBlock('');
    setStep(3);
  };

  const handleBlockSelect = (block: TimeBlock) => {
    setSelectedBlock(block);
    setStep(4);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Block submission if account is suspended
    if (isSuspended) {
      setError('Cannot book appointments while your account is suspended');
      setLoading(false);
      return;
    }

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
          time_block: selectedBlock,
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
                      If you believe this suspension is an error or have extenuating circumstances,
                      please contact the City Health Office of Panabo City immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Progress Steps */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: t('progress_steps.step1') },
                { num: 2, label: t('progress_steps.step2') },
                { num: 3, label: t('progress_steps.step3') },
                { num: 4, label: t('progress_steps.step4') },
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
                  {t('step1.heading')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('step1.description')}
                </p>

                {/* Loading State */}
                {servicesLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                    <p className="mt-2 text-sm text-gray-500">{t('step1.loading')}</p>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">{t('step1.no_services')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
                              {t('step1.free_badge')}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                          {service.description}
                        </p>

                        {/* Admin Category Badge */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${categoryColors.bgColor} ${categoryColors.textColor}`}>
                            {getAdminRoleLabel(service.category)}
                          </span>
                          {isConfidential && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              <Lock className="w-3 h-3 mr-1" />
                              {t('step1.confidential_badge')}
                            </span>
                          )}
                        </div>

                        {/* Requirements Section */}
                        {service.requirements && service.requirements.length > 0 && (
                          <div className="mb-3">
                            <ServiceRequirements requirements={service.requirements} />
                          </div>
                        )}

                        {/* Assigned Admin */}
                        {service.assigned_admins && service.assigned_admins.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
                            <User className="w-3.5 h-3.5" />
                            <span>
                              {t('step1.managed_by', {
                                name: `${service.assigned_admins[0].first_name} ${service.assigned_admins[0].last_name}`
                              })}
                              {service.admin_count && service.admin_count > 1 && (
                                <span className="text-gray-500"> {t('step1.and_more', { count: service.admin_count - 1 })}</span>
                              )}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                          <span>{t('step1.duration', { minutes: service.duration_minutes })}</span>
                          <span className="text-gray-400">{t('step1.booking_confirmation')}</span>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                )}

                {/* Information Panel */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700">
                      <h5 className="font-semibold text-gray-900 mb-1">{t('step1.about_system.heading')}</h5>
                      <p>
                        {t('step1.about_system.description')}
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
                  {t('step2.heading')}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('step2.description')}
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
                    {t('step2.back_to_services')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pick Time Block */}
            {step === 3 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('step3.heading')}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {t('step3.description', { date: selectedDate })}
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
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setStep(2);
                      setSelectedDate('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {t('step3.choose_different_date')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && selectedServiceDetails && (
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('step4.heading')}
                </h3>

                {/* Appointment Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-500">{t('step4.service_label')}</dt>
                      <dd className="text-sm text-gray-900 font-medium">
                        {selectedServiceDetails.name}
                      </dd>
                    </div>
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

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {t('step4.back_button')}
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
