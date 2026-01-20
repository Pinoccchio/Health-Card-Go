/**
 * Health Card Service Configuration
 *
 * This file contains information about health card types and their requirements.
 * Content matches ERRORS.md specifications exactly.
 */

export interface HealthCardTypeInfo {
  type: 'food_handler' | 'non_food' | 'pink';
  name: string;
  description: string;
  requiredTests: string[];
  mandatoryCHOTesting?: boolean;
}

export interface HealthCardServiceInfo {
  title: string;
  overview: string;
  cardTypes: HealthCardTypeInfo[];
}

/**
 * Health Card Service Information
 */
export const HEALTH_CARD_SERVICE: HealthCardServiceInfo = {
  title: 'Health Card Issuance and Renewal',
  overview: 'In Panabo City, the Health Card from the City Health Office (CHO) is a mandatory identification card that proves a worker is medically fit for employment.',

  cardTypes: [
    {
      type: 'food_handler',
      name: 'Food (Yellow Card)',
      description: 'For food handlers and workers in the food industry.',
      requiredTests: [
        'Urinalysis',
        'Stool Test',
        'CBC (Complete Blood Count)',
        'Chest X-ray',
      ],
    },
    {
      type: 'non_food',
      name: 'Non-Food (Green Card)',
      description: 'For non-food handlers or general employees in other industries.',
      requiredTests: [
        'Urinalysis',
        'Stool Test',
        'CBC (Complete Blood Count)',
        'Chest X-ray',
      ],
    },
    {
      type: 'pink',
      name: 'Pink Card',
      description: 'For occupations involving skin-to-skin contact (e.g., massage therapists, health workers).',
      requiredTests: [
        'Smearing',
      ],
      mandatoryCHOTesting: true,
    },
  ],
};

/**
 * Get specific health card type information
 */
export function getHealthCardTypeInfo(type: 'food_handler' | 'non_food' | 'pink'): HealthCardTypeInfo | undefined {
  return HEALTH_CARD_SERVICE.cardTypes.find((card) => card.type === type);
}

/**
 * Get all health card types
 */
export function getAllHealthCardTypes(): HealthCardTypeInfo[] {
  return HEALTH_CARD_SERVICE.cardTypes;
}
