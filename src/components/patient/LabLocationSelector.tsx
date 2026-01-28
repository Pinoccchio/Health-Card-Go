'use client';

import { Check, Building2, MapPin } from 'lucide-react';
import {
  LabLocationType,
  LAB_LOCATIONS,
  getLabLocationInfo,
} from '@/types/appointment';

interface LabLocationSelectorProps {
  selectedLocation: LabLocationType | null;
  onSelect: (location: LabLocationType) => void;
  disabled?: boolean;
}

/**
 * LabLocationSelector Component
 * Allows patients to select where they will have their lab tests done
 * - Inside CHO: Tests done at City Health Office
 * - Outside CHO: Tests done at external facility (requires upload of lab request & results)
 */
export function LabLocationSelector({
  selectedLocation,
  onSelect,
  disabled = false,
}: LabLocationSelectorProps) {
  const locations: LabLocationType[] = ['inside_cho', 'outside_cho'];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Laboratory Location
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose where you will have your laboratory tests conducted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((location) => {
          const info = getLabLocationInfo(location);
          const isSelected = selectedLocation === location;
          const isInsideCHO = location === 'inside_cho';

          return (
            <button
              key={location}
              type="button"
              onClick={() => !disabled && onSelect(location)}
              disabled={disabled}
              className={`
                relative p-6 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-primary-teal bg-primary-teal/5'
                  : 'border-gray-200 bg-white hover:border-primary-teal/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-primary-teal rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Location Icon */}
              <div className="mb-4">
                {isInsideCHO ? (
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                )}
              </div>

              {/* Location Label */}
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                {info.label}
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-4">
                {info.description}
              </p>

              {/* Requirements to Bring */}
              {!isInsideCHO && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Requirements to Bring:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Valid Government-Issued ID</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    You will confirm this requirement in the next step
                  </p>
                </div>
              )}

              {isInsideCHO && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Requirements to Bring:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Payment Receipt (Resibo) from CHO Treasury</li>
                    <li>• Valid Government-Issued ID</li>
                  </ul>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    You will confirm these requirements in the next step
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-900">
          <strong>Which option should I choose?</strong>
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-2 ml-4">
          <li>
            • <strong>Inside CHO Laboratory:</strong> If you prefer to have your lab tests done at the City Health Office. Bring payment receipt (resibo) and valid ID.
          </li>
          <li>
            • <strong>Outside CHO Laboratory:</strong> If you have already arranged lab tests at an external facility or prefer to use your own clinic. Bring valid ID only.
          </li>
        </ul>
      </div>
    </div>
  );
}
