/**
 * Health Card Expiration Utilities
 *
 * Purpose: Helper functions for calculating and validating health card expiration
 * Business Rule: Health cards expire 1 year after appointment completion
 */

// Constants
export const HEALTH_CARD_EXPIRATION_YEARS = 1;
export const EXPIRATION_WARNING_DAYS = 30;

export type HealthCardStatus = 'active' | 'expiring_soon' | 'expired' | 'pending';

export interface HealthCardExpirationInfo {
  expiryDate: Date | null;
  isExpired: boolean;
  daysRemaining: number | null;
  status: HealthCardStatus;
  warningMessage?: string;
}

/**
 * Calculate expiry date based on appointment completion date
 * @param completedAt - The appointment completion timestamp
 * @returns Date object representing expiry date (1 year after completion)
 */
export function calculateExpiryDate(completedAt: Date | string): Date {
  const completionDate = typeof completedAt === 'string' ? new Date(completedAt) : completedAt;
  const expiryDate = new Date(completionDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + HEALTH_CARD_EXPIRATION_YEARS);
  return expiryDate;
}

/**
 * Check if a health card is expired
 * @param expiryDate - The expiry date to check
 * @returns true if the card is expired, false otherwise
 */
export function isHealthCardExpired(expiryDate: Date | string | null): boolean {
  if (!expiryDate) return false;

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  return expiry < today;
}

/**
 * Calculate days remaining until expiration
 * @param expiryDate - The expiry date
 * @returns Number of days remaining (negative if expired, null if no expiry date)
 */
export function getDaysRemaining(expiryDate: Date | string | null): number | null {
  if (!expiryDate) return null;

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get the expiration status of a health card
 * @param expiryDate - The expiry date
 * @returns HealthCardStatus enum value
 */
export function getExpirationStatus(expiryDate: Date | string | null): HealthCardStatus {
  if (!expiryDate) return 'pending';

  const daysRemaining = getDaysRemaining(expiryDate);

  if (daysRemaining === null) return 'pending';
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= EXPIRATION_WARNING_DAYS) return 'expiring_soon';

  return 'active';
}

/**
 * Get comprehensive expiration information for a health card
 * @param expiryDate - The expiry date
 * @returns HealthCardExpirationInfo object with all expiration details
 */
export function getExpirationInfo(expiryDate: Date | string | null): HealthCardExpirationInfo {
  const expiry = expiryDate ? (typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate) : null;
  const daysRemaining = getDaysRemaining(expiry);
  const status = getExpirationStatus(expiry);
  const isExpired = status === 'expired';

  let warningMessage: string | undefined;

  if (status === 'expired') {
    const daysPast = Math.abs(daysRemaining || 0);
    warningMessage = `Your health card expired ${daysPast} ${daysPast === 1 ? 'day' : 'days'} ago. Please renew your card.`;
  } else if (status === 'expiring_soon') {
    warningMessage = `Your health card will expire in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Consider renewing soon.`;
  }

  return {
    expiryDate: expiry,
    isExpired,
    daysRemaining,
    status,
    warningMessage,
  };
}

/**
 * Format expiry date for display
 * @param expiryDate - The expiry date
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatExpiryDate(expiryDate: Date | string | null, locale: string = 'en-US'): string {
  if (!expiryDate) return 'N/A';

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;

  return expiry.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get status badge color based on expiration status
 * @param status - The health card status
 * @returns Tailwind CSS color classes for the badge
 */
export function getStatusBadgeColor(status: HealthCardStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-500',
      };
    case 'expiring_soon':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-500',
      };
    case 'expired':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-500',
      };
    case 'pending':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-500',
      };
  }
}

/**
 * Get status label for display
 * @param status - The health card status
 * @returns Human-readable status label
 */
export function getStatusLabel(status: HealthCardStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expiring_soon':
      return 'Expiring Soon';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending';
  }
}

/**
 * Check if a health card needs renewal
 * @param expiryDate - The expiry date
 * @param warningThresholdDays - Days before expiry to show warning (default: 30)
 * @returns true if renewal is needed or recommended
 */
export function needsRenewal(expiryDate: Date | string | null, warningThresholdDays: number = EXPIRATION_WARNING_DAYS): boolean {
  const status = getExpirationStatus(expiryDate);
  return status === 'expired' || status === 'expiring_soon';
}

/**
 * Check if an appointment issues a health card
 *
 * Health cards are issued by:
 * - Service 12: Health Card Processing (Yellow/Green/Pink)
 * - Service 13: Food Handler Renewal (Yellow)
 * - Service 14: Non-Food Processing (Green)
 * - Service 15: Non-Food Renewal (Green)
 * - Service 16: HIV Testing ONLY if card_type === 'pink'
 *
 * @param serviceId - The service ID
 * @param cardType - The card type (food_handler, non_food, pink)
 * @returns true if the appointment issues a health card
 */
export function issuesHealthCard(serviceId: number | undefined, cardType?: string | null): boolean {
  if (!serviceId) return false;

  // Standard health card services (always issue cards)
  // Service 12-15: Health Card Processing (Yellow/Green)
  // Service 24: Pink Card Issuance & Renewal
  const healthCardServices = [12, 13, 14, 15, 24];
  if (healthCardServices.includes(serviceId)) {
    return true;
  }

  // Special case: HIV Testing (Service 16) only issues Pink Card
  if (serviceId === 16 && cardType === 'pink') {
    return true;
  }

  // All other services do not issue health cards
  return false;
}
