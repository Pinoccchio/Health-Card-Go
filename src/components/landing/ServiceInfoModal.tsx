'use client';

import { Modal } from '@/components/ui';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react';

interface ServiceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: 'healthcard' | 'hiv' | 'pregnancy';
}

export function ServiceInfoModal({ isOpen, onClose, serviceId }: ServiceInfoModalProps) {
  const t = useTranslations(`landing.service_modals.${serviceId}`);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('title')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Subtitle (HIV service only) */}
        {serviceId === 'hiv' && (
          <div className="bg-[#20C997]/10 border-l-4 border-[#20C997] p-4 rounded-r-lg">
            <p className="text-gray-700 italic font-medium">{t('subtitle')}</p>
          </div>
        )}

        {/* Important Notice (Health Card only) */}
        {serviceId === 'healthcard' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">{t('important_notice')}</h4>
              <p className="text-yellow-700 text-sm">{t('important_notice_text')}</p>
            </div>
          </div>
        )}

        {/* Overview Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{t('overview.title')}</h3>
          <p className="text-gray-600 leading-relaxed">{t('overview.content')}</p>
        </div>

        {/* Call to Action (Pregnancy only) */}
        {serviceId === 'pregnancy' && (
          <div className="bg-[#20C997]/10 border border-[#20C997]/20 p-4 rounded-lg">
            <p className="text-gray-700 leading-relaxed">{t('call_to_action')}</p>
          </div>
        )}

        {/* Health Card Specific Content */}
        {serviceId === 'healthcard' && (
          <>
            {/* General Requirements */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('general_requirements.title')}</h3>
              <p className="text-gray-600 mb-4">{t('general_requirements.subtitle')}</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Requirement</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(t.raw('general_requirements.items') as Array<{label: string; description: string}>).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.label}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card Categories */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{t('card_categories.title')}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Card Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Industry</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Requirements</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(t.raw('card_categories.items') as Array<{card: string; industry: string; requirements: string}>).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.card}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.industry}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.requirements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Booking Process */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{t('booking_process.title')}</h3>
              <div className="space-y-4">
                {(t.raw('booking_process.steps') as Array<{step: string; action: string; description: string}>).map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#20C997] text-white flex items-center justify-center font-bold text-lg">
                        {step.step}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">{step.action}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-4 mt-2">
              <p className="text-center text-gray-500 text-sm font-medium">{t('footer')}</p>
            </div>
          </>
        )}

        {/* HIV Specific Content */}
        {serviceId === 'hiv' && (
          <>
            {/* Key Services */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{t('key_services.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(t.raw('key_services.items') as Array<{service: string; description: string}>).map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-[#20C997] transition-colors">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#20C997] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">{item.service}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinic Access */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{t('clinic_access.title')}</h3>
              <div className="bg-[#20C997]/5 border border-[#20C997]/20 rounded-lg p-4 mb-4">
                <div className="flex gap-2 items-start mb-2">
                  <MapPin className="h-5 w-5 text-[#20C997] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 font-medium">{t('clinic_access.location')}</p>
                </div>
                <p className="text-gray-600 text-sm italic">{t('clinic_access.confidentiality')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(t.raw('clinic_access.options') as Array<{option: string; description: string}>).map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-1">{item.option}</h4>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{t('operating_hours.title')}</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#20C997]" />
                    <span className="font-semibold text-gray-800">{t('operating_hours.regular.label')}</span>
                  </div>
                  <span className="text-gray-700">{t('operating_hours.regular.value')}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#20C997]" />
                    <span className="font-semibold text-gray-800">{t('operating_hours.sundown.label')}</span>
                  </div>
                  <span className="text-gray-700">{t('operating_hours.sundown.value')}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Pregnancy Specific Content */}
        {serviceId === 'pregnancy' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('key_services.title')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(t.raw('key_services.items') as Array<{service: string; description: string}>).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.service}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
