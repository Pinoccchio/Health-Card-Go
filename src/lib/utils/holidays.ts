/**
 * Holiday Management Utilities
 *
 * Provides functions for managing and checking holidays from multiple sources:
 * 1. date-holidays library - Automatic Philippine national/regional holidays
 * 2. Database - Custom CHO-specific closure dates
 *
 * Used by appointment booking to block unavailable dates.
 */

import Holidays from 'date-holidays';

export interface Holiday {
  date: Date;
  name: string;
  type: 'national' | 'regional' | 'custom';
  source: 'library' | 'database';
}

export interface DatabaseHoliday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  holiday_name: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get Philippine holidays from date-holidays library for a specific year
 */
export function getPhilippineHolidays(year: number): Holiday[] {
  const hd = new Holidays('PH'); // PH = Philippines
  const holidays = hd.getHolidays(year);

  return holidays.map(holiday => ({
    date: holiday.date instanceof Date ? holiday.date : new Date(holiday.date),
    name: holiday.name,
    type: holiday.type === 'public' ? 'national' : 'regional',
    source: 'library' as const,
  }));
}

/**
 * Fetch custom holidays from database via API
 */
export async function getCustomHolidays(): Promise<Holiday[]> {
  try {
    const response = await fetch('/api/holidays');

    if (!response.ok) {
      console.error('Failed to fetch custom holidays from database');
      return [];
    }

    const result = await response.json();
    const data: DatabaseHoliday[] = result.holidays || [];

    return data.map(holiday => ({
      date: new Date(holiday.holiday_date),
      name: holiday.holiday_name,
      type: 'custom' as const,
      source: 'database' as const,
    }));
  } catch (error) {
    console.error('Error fetching custom holidays:', error);
    return [];
  }
}

/**
 * Get all blocked dates (library holidays + database holidays) for a specific year
 * Removes duplicates based on date
 */
export async function getAllBlockedDates(year: number): Promise<Holiday[]> {
  const libraryHolidays = getPhilippineHolidays(year);
  const customHolidays = await getCustomHolidays();

  // Merge and remove duplicates
  const allHolidays = [...libraryHolidays, ...customHolidays];
  const uniqueHolidays = new Map<string, Holiday>();

  allHolidays.forEach(holiday => {
    const dateKey = holiday.date.toISOString().split('T')[0]; // YYYY-MM-DD

    // If duplicate, prefer custom holidays over library holidays
    if (!uniqueHolidays.has(dateKey) || holiday.source === 'database') {
      uniqueHolidays.set(dateKey, holiday);
    }
  });

  return Array.from(uniqueHolidays.values());
}

/**
 * Check if a specific date is a holiday
 */
export async function isDateHoliday(date: Date): Promise<{ isHoliday: boolean; holidayName?: string }> {
  const year = date.getFullYear();
  const blockedDates = await getAllBlockedDates(year);

  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const holiday = blockedDates.find(h => {
    const holidayString = h.date.toISOString().split('T')[0];
    return holidayString === dateString;
  });

  return {
    isHoliday: !!holiday,
    holidayName: holiday?.name,
  };
}

/**
 * Check if a specific date is blocked (weekend or holiday)
 * @param date - Date to check
 * @returns Object with isBlocked flag and reason
 */
export async function isDateBlocked(date: Date): Promise<{
  isBlocked: boolean;
  reason?: 'weekend' | 'holiday';
  holidayName?: string;
}> {
  // Check if weekend (Saturday = 6, Sunday = 0)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isBlocked: true,
      reason: 'weekend'
    };
  }

  // Check if holiday
  const { isHoliday, holidayName } = await isDateHoliday(date);
  if (isHoliday) {
    return {
      isBlocked: true,
      reason: 'holiday',
      holidayName
    };
  }

  return { isBlocked: false };
}

/**
 * Get all blocked dates for a date range (for calendar UI)
 * Returns array of Date objects that should be disabled
 */
export async function getBlockedDatesInRange(startDate: Date, endDate: Date): Promise<Date[]> {
  const blockedDates: Date[] = [];
  const currentDate = new Date(startDate);

  // Get holidays for the years in this range
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const allHolidays: Holiday[] = [];
  for (const year of years) {
    const yearHolidays = await getAllBlockedDates(year);
    allHolidays.push(...yearHolidays);
  }

  // Check each date in range
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateString = currentDate.toISOString().split('T')[0];

    // Block weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      blockedDates.push(new Date(currentDate));
    }
    // Block holidays
    else if (allHolidays.some(h => h.date.toISOString().split('T')[0] === dateString)) {
      blockedDates.push(new Date(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return blockedDates;
}

/**
 * Format date to Philippine timezone (Asia/Manila)
 */
export function toPhilippineDate(date: Date): Date {
  const phDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phDate;
}

/**
 * Get list of Philippine holidays for display (current year + next year)
 */
export async function getUpcomingHolidays(): Promise<Holiday[]> {
  const currentYear = new Date().getFullYear();
  const currentYearHolidays = await getAllBlockedDates(currentYear);
  const nextYearHolidays = await getAllBlockedDates(currentYear + 1);

  const allHolidays = [...currentYearHolidays, ...nextYearHolidays];

  // Filter to only future holidays
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allHolidays
    .filter(h => h.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ============================================================================
// Service-Level Date Availability Functions
// ============================================================================

export interface ServiceAvailableDate {
  date: string; // YYYY-MM-DD
  opened_by: string;
  reason: string | null;
}

/**
 * Check if a specific date is available for a service
 * Returns true if the date is in the service_available_dates table
 *
 * @param serviceId - The service ID to check
 * @param date - The date to check (YYYY-MM-DD string or Date object)
 * @returns Object with isAvailable flag and optional reason
 */
export async function isServiceDateAvailable(
  serviceId: number,
  date: string | Date
): Promise<{
  isAvailable: boolean;
  reason?: string;
  openedBy?: string;
}> {
  try {
    const dateString = typeof date === 'string'
      ? date
      : date.toISOString().split('T')[0];

    const response = await fetch(
      `/api/services/${serviceId}/available-dates?start_date=${dateString}&end_date=${dateString}`
    );

    if (!response.ok) {
      console.error('Failed to check service date availability');
      return { isAvailable: false };
    }

    const result = await response.json();

    if (result.available_dates && result.available_dates.length > 0) {
      const availableDate = result.available_dates[0];
      return {
        isAvailable: true,
        reason: availableDate.reason,
        openedBy: availableDate.opened_by,
      };
    }

    return { isAvailable: false };
  } catch (error) {
    console.error('Error checking service date availability:', error);
    return { isAvailable: false };
  }
}

/**
 * Get all available dates for a service within a date range
 *
 * @param serviceId - The service ID
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of available dates with metadata
 */
export async function getServiceAvailableDatesInRange(
  serviceId: number,
  startDate: Date,
  endDate: Date
): Promise<ServiceAvailableDate[]> {
  try {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];

    const response = await fetch(
      `/api/services/${serviceId}/available-dates?start_date=${startString}&end_date=${endString}`
    );

    if (!response.ok) {
      console.error('Failed to fetch service available dates');
      return [];
    }

    const result = await response.json();
    return result.available_dates || [];
  } catch (error) {
    console.error('Error fetching service available dates:', error);
    return [];
  }
}

/**
 * Check if a date is fully available for booking a specific service
 * This combines all checks: weekday, holiday, and service availability
 *
 * @param serviceId - The service ID
 * @param date - The date to check
 * @returns Object with full availability status
 */
export async function isDateAvailableForService(
  serviceId: number,
  date: Date
): Promise<{
  isAvailable: boolean;
  reason: 'available' | 'weekend' | 'holiday' | 'service_blocked' | 'past';
  details?: string;
}> {
  // Check if date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate < today) {
    return {
      isAvailable: false,
      reason: 'past',
      details: 'This date is in the past',
    };
  }

  // Check if weekend
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isAvailable: false,
      reason: 'weekend',
      details: 'The office is closed on weekends',
    };
  }

  // Check if holiday
  const { isHoliday, holidayName } = await isDateHoliday(date);
  if (isHoliday) {
    return {
      isAvailable: false,
      reason: 'holiday',
      details: holidayName || 'Holiday',
    };
  }

  // Check service-specific availability
  const { isAvailable, reason } = await isServiceDateAvailable(serviceId, date);
  if (!isAvailable) {
    return {
      isAvailable: false,
      reason: 'service_blocked',
      details: 'This service is not available on this date',
    };
  }

  return {
    isAvailable: true,
    reason: 'available',
    details: reason || undefined,
  };
}
