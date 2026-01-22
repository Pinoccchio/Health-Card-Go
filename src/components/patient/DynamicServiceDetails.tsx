'use client';

import { FileText, CheckCircle, Clock, AlertCircle, Info, Heart, Shield } from 'lucide-react';
import { HEALTH_CARD_SERVICE, getHealthCardTypeInfo } from '@/lib/config/healthCardConfig';
import { getLabLocationInfo } from '@/lib/config/labLocationConfig';
import { HIV_TESTING_SERVICE } from '@/lib/config/hivTestingConfig';
import { PRENATAL_SERVICE } from '@/lib/config/prenatalConfig';

interface DynamicServiceDetailsProps {
  selectedServiceCategory?: string;
  selectedCardType?: 'food_handler' | 'non_food' | 'pink';
  selectedLabLocation?: 'inside_cho' | 'outside_cho';
}

export default function DynamicServiceDetails({
  selectedServiceCategory,
  selectedCardType,
  selectedLabLocation,
}: DynamicServiceDetailsProps) {
  // No service selected - show prompt
  if (!selectedServiceCategory) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Service Information</h3>
            <p className="text-sm text-gray-600">
              Select a service to view detailed information, requirements, and processing steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Health Card service selected
  if (selectedServiceCategory === 'healthcard') {
    const cardInfo = selectedCardType ? getHealthCardTypeInfo(selectedCardType) : null;
    const locationInfo = selectedLabLocation ? getLabLocationInfo(selectedLabLocation) : null;

    return (
      <div className="space-y-4">
        {/* Service Overview - Always show when health card is selected */}
        <div className="bg-primary-teal/5 border border-primary-teal/20 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary-teal flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{HEALTH_CARD_SERVICE.title}</h3>
              <p className="text-sm text-gray-700">
                Health card processing for food handlers (Yellow Card) and non-food handlers (Green Card).
                For HIV-related Pink Cards, please select the Pink Card Issuance & Renewal service.
              </p>
            </div>
          </div>
        </div>

        {/* Specific Card Type Details - Show when card type is selected */}
        {cardInfo && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-2">{cardInfo.name}</h3>
            <p className="text-sm text-gray-700 mb-4">{cardInfo.description}</p>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Requirements:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Valid ID</li>
                <li>• Payment receipt (for test fees and Health Card)</li>
              </ul>
            </div>

            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-semibold text-gray-900">Tests required:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {cardInfo.requiredTests.map((test, index) => (
                  <li key={index}>• {test}</li>
                ))}
                <li>• Health Card ({cardInfo.type === 'food_handler' ? 'Yellow' : 'Green'})</li>
                <li>• Laboratory Result</li>
              </ul>
            </div>
          </div>
        )}

        {/* Lab Location Details - Show when location is selected */}
        {locationInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{locationInfo.name}</h4>
                <p className="text-sm text-gray-700">{locationInfo.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pink Card service selected
  if (selectedServiceCategory === 'pink_card') {
    return (
      <div className="space-y-4">
        {/* Service Overview - Always show when pink card is selected */}
        <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-fuchsia-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Pink Card Issuance & Renewal</h3>
              <p className="text-sm text-gray-700">
                Specialized health card for occupations involving skin-to-skin contact.
                All laboratory tests are conducted at CHO facilities.
              </p>
            </div>
          </div>
        </div>

        {/* Pink Card Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Pink Card</h3>
          <p className="text-sm text-gray-700 mb-4">
            For occupations involving skin-to-skin contact (e.g., massage therapists, health workers).
          </p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Requirements:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Valid ID</li>
              <li>• Payment receipt (for test fees and Health Card)</li>
            </ul>
          </div>

          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold text-gray-900">Tests required:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Smearing</li>
              <li>• Pink Card</li>
              <li>• Laboratory Result</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // HIV Testing service selected
  if (selectedServiceCategory === 'hiv') {
    return (
      <div className="space-y-4">
        {/* Service Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-2">HIV Counselling</h3>
          <p className="text-sm text-gray-700 mb-4">Counseling for individuals who wish to understand HIV risks and testing.</p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Requirements:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Valid ID</li>
            </ul>
          </div>

          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold text-gray-900">Scheduled:</h4>
            <p className="text-sm text-gray-700">MWF (Monday, Wednesday, Friday)</p>
          </div>
        </div>
      </div>
    );
  }

  // Prenatal service selected
  if (selectedServiceCategory === 'pregnancy') {
    return (
      <div className="space-y-4">
        {/* Service Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Prenatal Checkup</h3>
          <p className="text-sm text-gray-700 mb-4">Consultation for expecting mothers to ensure the health of both mother and child.</p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">Requirements:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Valid ID</li>
            </ul>
          </div>

          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold text-gray-900">Scheduled:</h4>
            <p className="text-sm text-gray-700">Every Tuesday</p>
          </div>
        </div>
      </div>
    );
  }

  // Other service types - placeholder for future expansion
  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-1">Service Details</h3>
          <p className="text-sm text-gray-600">
            Service information will be displayed here based on your selection.
          </p>
        </div>
      </div>
    </div>
  );
}
