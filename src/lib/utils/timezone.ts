/**
 * Timezone Utilities for Philippine Time (Asia/Manila, UTC+8)
 *
 * This module provides consistent timezone handling across the application.
 * All dates are stored in UTC in the database but displayed in Philippine Time.
 */

export const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Get current date and time in Philippine timezone
 * @returns Date object offset to Philippine time (use getUTC* methods to get PHT values)
 *
 * IMPORTANT: Use .getUTCFullYear(), .getUTCMonth(), .getUTCDate(), .getUTCHours(), etc.
 * to extract Philippine time values from the returned Date object.
 *
 * Example:
 *   const nowPHT = getPhilippineTime();
 *   const phtDate = nowPHT.getUTCDate();  // Philippine day of month
 *   const phtHour = nowPHT.getUTCHours(); // Philippine hour
 */
export function getPhilippineTime(): Date {
  const nowUTC = new Date();

  // Philippine timezone is UTC+8 (8 hours ahead of UTC)
  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  // Create a Date object offset by 8 hours
  // When you use UTC methods on this Date, you get Philippine time values
  const nowPHT = new Date(nowUTC.getTime() + PHT_OFFSET_MS);

  return nowPHT;
}

/**
 * Format a UTC date string for display in Philippine timezone
 * @param dateString UTC date string (ISO format from database)
 * @param options Intl.DateTimeFormat options
 * @returns Formatted date string in Philippine time
 */
export function formatPhilippineDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    ...options,
  });
}

/**
 * Format a UTC date for short display (e.g., "Nov 30, 2025")
 */
export function formatPhilippineDateShort(dateString: string): string {
  return formatPhilippineDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a UTC date for long display (e.g., "Monday, November 30, 2025")
 */
export function formatPhilippineDateLong(dateString: string): string {
  return formatPhilippineDate(dateString, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a UTC datetime for display with time (e.g., "Nov 30, 2025, 9:37 AM")
 */
export function formatPhilippineDateTime(dateString: string): string {
  return formatPhilippineDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parse appointment date and time strings into a proper Date object in Philippine timezone
 * @param appointmentDate Date string (e.g., "2025-12-08")
 * @param appointmentTime Time string (e.g., "08:00:00" or "08:00")
 * @returns Date object representing the appointment time in PHT
 */
export function parseAppointmentDateTime(appointmentDate: string, appointmentTime: string): Date {
  // Parse the date and time as Philippine time
  // Format: "2025-12-08T08:00:00" in Philippine timezone
  const dateTimeString = `${appointmentDate}T${appointmentTime}`;

  // Create a date object from the string
  const parts = dateTimeString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!parts) {
    throw new Error(`Invalid date/time format: ${dateTimeString}`);
  }

  const [, year, month, day, hour, minute, second = '0'] = parts;

  // Create a date in local timezone with the PHT values
  // This assumes the server is running in PHT, which may not be true
  // For accurate conversion, we use the Intl API approach
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );

  return date;
}

/**
 * Get the minimum booking date (7 days from now in Philippine time)
 * Skips weekends to find next available weekday
 * @returns Date object for minimum booking date
 */
export function getMinBookingDate(): Date {
  const now = getPhilippineTime();
  let minDate = new Date(now);
  minDate.setUTCDate(minDate.getUTCDate() + 7);

  // Skip weekends
  while (minDate.getUTCDay() === 0 || minDate.getUTCDay() === 6) {
    minDate.setUTCDate(minDate.getUTCDate() + 1);
  }

  return minDate;
}

/**
 * Get the minimum booking date as a string (YYYY-MM-DD format)
 */
export function getMinBookingDateString(): string {
  const minDate = getMinBookingDate();
  const year = minDate.getUTCFullYear();
  const month = String(minDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(minDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate hours difference between appointment time and now in Philippine timezone
 * @param appointmentDate Date string (e.g., "2025-12-08")
 * @param appointmentTime Time string (e.g., "08:00:00")
 * @returns Hours difference (positive if appointment is in future)
 */
export function getHoursUntilAppointment(appointmentDate: string, appointmentTime: string): number {
  const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime);
  const now = getPhilippineTime();
  const diffMs = appointmentDateTime.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Check if an appointment can be cancelled
 * POLICY CHANGE: Patients can now cancel anytime, even same-day
 * Rationale: Cancellation (even last-minute) is better than no-show
 * Late cancellations trigger admin notifications (handled in API)
 * @param appointmentDate Date string
 * @param appointmentTime Time string
 * @returns true (always - patients can cancel anytime)
 */
export function canCancelAppointment(appointmentDate: string, appointmentTime: string): boolean {
  // Allow cancellation anytime - patients should be able to cancel
  // even in emergencies or same-day situations (better than no-show)
  return true;
}

/**
 * Validate if a date is at least 7 days in the future (in Philippine timezone)
 * @param dateString Date string to validate (YYYY-MM-DD)
 * @returns true if date is valid for booking
 */
export function isValidBookingDate(dateString: string): boolean {
  // Parse selected date (YYYY-MM-DD format)
  const [year, month, day] = dateString.split('-').map(Number);

  // Get minimum booking date in PHT
  const minDate = getMinBookingDate();
  const minYear = minDate.getUTCFullYear();
  const minMonth = minDate.getUTCMonth() + 1; // getUTCMonth() is 0-indexed
  const minDay = minDate.getUTCDate();

  // Compare dates numerically (year, month, day)
  if (year > minYear) return true;
  if (year < minYear) return false;

  if (month > minMonth) return true;
  if (month < minMonth) return false;

  return day >= minDay;
}

/**
 * Check if a date is a weekday (Monday-Friday)
 * @param dateString Date string (YYYY-MM-DD)
 * @returns true if date is a weekday
 */
export function isWeekday(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a holiday (client-side cache check)
 * This is a synchronous function that checks against a cached list of holidays
 * @param dateString Date string (YYYY-MM-DD)
 * @param holidays Array of holiday objects with holiday_date field
 * @returns true if date is a holiday
 */
export function isHoliday(dateString: string, holidays: { holiday_date: string }[]): boolean {
  return holidays.some(holiday => holiday.holiday_date === dateString);
}

/**
 * Check if a date is available for booking (not weekend, not holiday)
 * @param dateString Date string (YYYY-MM-DD)
 * @param holidays Array of holiday objects
 * @returns true if date is available for booking
 */
export function isDateAvailableForBooking(dateString: string, holidays: { holiday_date: string }[]): boolean {
  // Check if weekend
  if (!isWeekday(dateString)) {
    return false;
  }

  // Check if holiday
  if (isHoliday(dateString, holidays)) {
    return false;
  }

  // Check if meets minimum booking date requirement
  if (!isValidBookingDate(dateString)) {
    return false;
  }

  return true;
}
