'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import {
  HealthCardType,
  HEALTH_CARD_TYPES,
  getHealthCardTypeInfo,
} from '@/types/appointment';

interface CardTypeSelectorProps {
  selectedCardType: HealthCardType | null;
  onSelect: (cardType: HealthCardType) => void;
  disabled?: boolean;
}

/**
 * CardTypeSelector Component
 * Allows patients to select which health card type they need
 * Shows all 3 types: Yellow (Food Handler), Green (Non-Food), Pink (Service/Clinical)
 */
export function CardTypeSelector({
  selectedCardType,
  onSelect,
  disabled = false,
}: CardTypeSelectorProps) {
  const cardTypes: HealthCardType[] = ['food_handler', 'non_food', 'pink'];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Select Health Card Type
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the type of health card you need based on your occupation or requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cardTypes.map((cardType) => {
          const info = getHealthCardTypeInfo(cardType);
          const isSelected = selectedCardType === cardType;

          // Icon for each card type
          const getCardIcon = (type: HealthCardType) => {
            switch (type) {
              case 'food_handler':
                return '🟡'; // Yellow
              case 'non_food':
                return '🟢'; // Green
              case 'pink':
                return '🩷'; // Pink
              default:
                return '📋';
            }
          };

          return (
            <button
              key={cardType}
              type="button"
              onClick={() => !disabled && onSelect(cardType)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-primary-teal bg-primary-teal/5'
                  : 'border-gray-200 bg-white hover:border-primary-teal/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary-teal rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Card Icon */}
              <div className="text-3xl mb-2">{getCardIcon(cardType)}</div>

              {/* Card Label */}
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                {info.label}
              </h4>

              {/* Target Audience */}
              <p className="text-xs text-gray-600 mb-3 font-medium">
                For: {info.targetAudience}
              </p>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-3">
                {info.description}
              </p>

              {/* Required Tests Badge */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Required Tests:
                </p>
                <div className="flex flex-wrap gap-1">
                  {info.requiredTests.map((test, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      {test}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-900">
          <strong>Need help choosing?</strong> Select the card type based on your job:
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
          <li>• <strong>Yellow Card:</strong> For food handlers, cooks, restaurant staff</li>
          <li>• <strong>Green Card:</strong> For non-food service workers, retail, office staff</li>
          <li>• <strong>Pink Card:</strong> For clinical/healthcare workers, service industry</li>
        </ul>
      </div>
    </div>
  );
}
