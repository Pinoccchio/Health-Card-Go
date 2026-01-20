/**
 * Laboratory Fees Configuration
 *
 * Fee structure for health card laboratory tests inside CHO (City Health Office)
 * Fees are in Philippine Pesos (₱)
 *
 * Last Updated: January 2026
 */

export interface LabTestFee {
  name: string;
  price: number | 'N/A';
  description?: string;
}

export interface HealthCardFees {
  cardType: 'yellow' | 'green' | 'pink';
  cardName: string;
  tests: LabTestFee[];
  cardFee: number;
  total: number;
}

/**
 * Laboratory fees for Yellow Card (Food Handler)
 * Required tests: Stool Exam, Urinalysis, CBC, X-ray, Health Card
 */
export const YELLOW_CARD_FEES: HealthCardFees = {
  cardType: 'yellow',
  cardName: 'Yellow Card',
  tests: [
    {
      name: 'Stool Exam, Urinalysis, and CBC',
      price: 100,
      description: 'Combined laboratory package for food handlers',
    },
    {
      name: 'X-ray',
      price: 'N/A',
      description: 'Not available at CHO',
    },
  ],
  cardFee: 70,
  total: 170,
};

/**
 * Laboratory fees for Green Card (Non-Food Handler)
 * Required tests: Stool Exam, Urinalysis, CBC, X-ray, Health Card
 * Same fees as Yellow Card
 */
export const GREEN_CARD_FEES: HealthCardFees = {
  cardType: 'green',
  cardName: 'Green Card',
  tests: [
    {
      name: 'Stool Exam, Urinalysis, and CBC',
      price: 100,
      description: 'Combined laboratory package for general workers',
    },
    {
      name: 'X-ray',
      price: 'N/A',
      description: 'Not available at CHO',
    },
  ],
  cardFee: 70,
  total: 170,
};

/**
 * Laboratory fees for Pink Card
 * Required tests: Smearing, Pink Card
 */
export const PINK_CARD_FEES: HealthCardFees = {
  cardType: 'pink',
  cardName: 'Pink Card',
  tests: [
    {
      name: 'Smearing',
      price: 60,
      description: 'Laboratory smearing test for skin-contact workers',
    },
  ],
  cardFee: 100,
  total: 160,
};

/**
 * Get fees for a specific health card type
 * @param cardType - Type of health card ('yellow', 'green', or 'pink')
 * @returns Fee structure for the specified card type
 */
export function getLabFees(cardType: 'yellow' | 'green' | 'pink'): HealthCardFees {
  switch (cardType) {
    case 'yellow':
      return YELLOW_CARD_FEES;
    case 'green':
      return GREEN_CARD_FEES;
    case 'pink':
      return PINK_CARD_FEES;
    default:
      throw new Error(`Invalid card type: ${cardType}`);
  }
}

/**
 * Get card type from health card type enum
 * Converts 'food_handler' to 'yellow', 'non_food' to 'green', 'pink' to 'pink'
 */
export function getCardTypeFromHealthCardType(
  healthCardType: 'food_handler' | 'non_food' | 'pink'
): 'yellow' | 'green' | 'pink' {
  switch (healthCardType) {
    case 'food_handler':
      return 'yellow';
    case 'non_food':
      return 'green';
    case 'pink':
      return 'pink';
    default:
      throw new Error(`Invalid health card type: ${healthCardType}`);
  }
}
