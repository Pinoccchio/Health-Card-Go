/**
 * Laboratory Fees Configuration
 *
 * Fee structure for health card laboratory tests inside CHO (City Health Office)
 * Fees are in Philippine Pesos (₱)
 *
 * Last Updated: January 2026
 * Note: Fees are now dynamically fetched from database via API
 */

import type { LabFeesData } from '@/lib/hooks/useLabFees';

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
 * Fallback laboratory fees for Yellow Card (Food Handler)
 * Used only if database fetch fails
 */
const FALLBACK_YELLOW_CARD_FEES: HealthCardFees = {
  cardType: 'yellow',
  cardName: 'Yellow Card',
  tests: [
    {
      name: 'Stool Examination',
      price: 33,
      description: 'Stool examination for food handlers',
    },
    {
      name: 'Urinalysis',
      price: 33,
      description: 'Urine analysis test',
    },
    {
      name: 'CBC',
      price: 34,
      description: 'Complete Blood Count',
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
 * Fallback laboratory fees for Green Card (Non-Food Handler)
 * Used only if database fetch fails
 */
const FALLBACK_GREEN_CARD_FEES: HealthCardFees = {
  cardType: 'green',
  cardName: 'Green Card',
  tests: [
    {
      name: 'Stool Examination',
      price: 33,
      description: 'Stool examination for general workers',
    },
    {
      name: 'Urinalysis',
      price: 33,
      description: 'Urine analysis test',
    },
    {
      name: 'CBC',
      price: 34,
      description: 'Complete Blood Count',
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
 * Fallback laboratory fees for Pink Card
 * Used only if database fetch fails
 */
const FALLBACK_PINK_CARD_FEES: HealthCardFees = {
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
 * Transform database fee data to HealthCardFees format with individual test fees
 * @param cardType - Type of card (yellow, green, pink)
 * @param testFee - Legacy combined test fee from database (optional for backward compatibility)
 * @param cardFee - Card fee from database
 * @param totalFee - Total fee from database
 * @param stoolExamFee - Individual stool exam fee (optional)
 * @param urinalysisFee - Individual urinalysis fee (optional)
 * @param cbcFee - Individual CBC fee (optional)
 * @param smearingFee - Individual smearing fee (optional)
 * @param xrayFee - Individual X-Ray fee (optional)
 * @returns Formatted HealthCardFees object
 */
function transformDatabaseFee(
  cardType: 'yellow' | 'green' | 'pink',
  testFee: number,
  cardFee: number,
  totalFee: number,
  stoolExamFee?: number | null,
  urinalysisFee?: number | null,
  cbcFee?: number | null,
  smearingFee?: number | null,
  xrayFee?: number | null
): HealthCardFees {
  const baseStructure = {
    cardType,
    cardFee,
    total: totalFee,
  };

  switch (cardType) {
    case 'yellow':
      return {
        ...baseStructure,
        cardName: 'Yellow Card',
        tests: [
          {
            name: 'Stool Examination',
            price: stoolExamFee ?? 33,
            description: 'Stool examination for food handlers',
          },
          {
            name: 'Urinalysis',
            price: urinalysisFee ?? 33,
            description: 'Urine analysis test',
          },
          {
            name: 'CBC',
            price: cbcFee ?? 34,
            description: 'Complete Blood Count',
          },
          {
            name: 'X-ray',
            price: xrayFee ?? 'N/A',
            description: 'Not available at CHO',
          },
        ],
      };
    case 'green':
      return {
        ...baseStructure,
        cardName: 'Green Card',
        tests: [
          {
            name: 'Stool Examination',
            price: stoolExamFee ?? 33,
            description: 'Stool examination for general workers',
          },
          {
            name: 'Urinalysis',
            price: urinalysisFee ?? 33,
            description: 'Urine analysis test',
          },
          {
            name: 'CBC',
            price: cbcFee ?? 34,
            description: 'Complete Blood Count',
          },
          {
            name: 'X-ray',
            price: xrayFee ?? 'N/A',
            description: 'Not available at CHO',
          },
        ],
      };
    case 'pink':
      return {
        ...baseStructure,
        cardName: 'Pink Card',
        tests: [
          {
            name: 'Smearing',
            price: smearingFee ?? 60,
            description: 'Laboratory smearing test for skin-contact workers',
          },
        ],
      };
  }
}

/**
 * Get fees for a specific health card type from database data
 * @param cardType - Type of health card ('yellow', 'green', or 'pink')
 * @param databaseFees - Optional fees fetched from database
 * @returns Fee structure for the specified card type
 */
export function getLabFees(
  cardType: 'yellow' | 'green' | 'pink',
  databaseFees?: LabFeesData
): HealthCardFees {
  // If database fees provided, use them
  if (databaseFees) {
    const dbCardType = getHealthCardTypeFromCardType(cardType);
    const fee = databaseFees[dbCardType];

    if (fee) {
      return transformDatabaseFee(
        cardType,
        fee.test_fee,
        fee.card_fee,
        fee.total_fee,
        fee.stool_exam_fee,
        fee.urinalysis_fee,
        fee.cbc_fee,
        fee.smearing_fee,
        fee.xray_fee
      );
    }
  }

  // Fallback to hardcoded values if database unavailable
  switch (cardType) {
    case 'yellow':
      return FALLBACK_YELLOW_CARD_FEES;
    case 'green':
      return FALLBACK_GREEN_CARD_FEES;
    case 'pink':
      return FALLBACK_PINK_CARD_FEES;
    default:
      throw new Error(`Invalid card type: ${cardType}`);
  }
}

/**
 * Get health card type from card type
 * Converts 'yellow' to 'food_handler', 'green' to 'non_food', 'pink' to 'pink'
 */
function getHealthCardTypeFromCardType(
  cardType: 'yellow' | 'green' | 'pink'
): 'food_handler' | 'non_food' | 'pink' {
  switch (cardType) {
    case 'yellow':
      return 'food_handler';
    case 'green':
      return 'non_food';
    case 'pink':
      return 'pink';
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
