/**
 * Time Formatting Utilities
 * Centralized functions for converting between 24-hour and 12-hour time formats
 */

/**
 * Formats a 24-hour time string (HH:MM:SS) to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "08:00:00", "13:30:00")
 * @returns Time in 12-hour format with AM/PM (e.g., "8:00 AM", "1:30 PM")
 *
 * @example
 * formatTime24To12("08:00:00") // "8:00 AM"
 * formatTime24To12("13:30:00") // "1:30 PM"
 * formatTime24To12("00:00:00") // "12:00 AM"
 * formatTime24To12("12:00:00") // "12:00 PM"
 */
export function formatTime24To12(time24: string): string {
  if (!time24) return '';

  // Extract hours and minutes from HH:MM:SS format
  const [hoursStr, minutesStr] = time24.split(':');
  const hours24 = parseInt(hoursStr, 10);
  const minutes = minutesStr;

  // Determine AM/PM
  const period = hours24 >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12; // Midnight (0) and Noon (12) should show as 12

  return `${hours12}:${minutes} ${period}`;
}

/**
 * Checks if a string is in time format (HH:MM:SS or HH:MM)
 * @param value - String to check
 * @returns True if the string matches time format
 */
export function isTimeFormat(value: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

/**
 * Formats appointment time for display
 * Uses both appointment_time and time_block for context
 * @param appointment_time - Time in 24-hour format from database
 * @param time_block - Optional time block ('AM' or 'PM') for validation
 * @returns Formatted time string
 */
export function formatAppointmentTime(appointment_time: string, time_block?: 'AM' | 'PM'): string {
  return formatTime24To12(appointment_time);
}
