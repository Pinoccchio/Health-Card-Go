/**
 * Service Availability Types
 *
 * Type definitions for the service-level date blocking/availability feature.
 * Uses a WHITELIST approach where dates are blocked by default and must be
 * explicitly opened by Healthcare Admins.
 */

/**
 * Service available date entity from database
 */
export interface ServiceAvailableDate {
  id: string;
  service_id: number;
  available_date: string; // YYYY-MM-DD format
  opened_by: string; // UUID of the Healthcare Admin
  reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Service available date with admin details (for display)
 */
export interface ServiceAvailableDateWithAdmin extends ServiceAvailableDate {
  opened_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Request body for opening a date
 */
export interface OpenDateRequest {
  date: string; // YYYY-MM-DD format
  reason?: string;
}

/**
 * Request body for bulk opening dates
 */
export interface BulkOpenDatesRequest {
  dates: string[]; // Array of YYYY-MM-DD format dates
  reason?: string;
}

/**
 * API response for available dates endpoint
 */
export interface ServiceAvailableDatesResponse {
  success: boolean;
  service_id: number;
  available_dates: Array<{
    date: string;
    opened_by: string; // Full name
    reason: string | null;
  }>;
  total_count: number;
}

/**
 * API error response
 */
export interface ServiceAvailabilityError {
  error: string;
  code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_DATE' | 'WEEKEND' | 'HOLIDAY' | 'ALREADY_EXISTS' | 'NOT_FOUND';
}

/**
 * Date availability status for calendar display
 */
export type DateAvailabilityStatus =
  | 'available'      // Date is in service_available_dates (green)
  | 'blocked'        // Date is NOT in service_available_dates (red)
  | 'weekend'        // Saturday or Sunday (gray, cannot modify)
  | 'holiday'        // Holiday (gray, cannot modify)
  | 'past';          // Date is in the past (gray, cannot modify)

/**
 * Calendar day info for UI rendering
 */
export interface CalendarDayInfo {
  date: Date;
  dateString: string; // YYYY-MM-DD
  status: DateAvailabilityStatus;
  holidayName?: string;
  reason?: string; // Reason for opening (if available)
  canModify: boolean; // Whether the date can be toggled
  hasExistingAppointments?: boolean; // For warning when blocking
  appointmentCount?: number;
}

/**
 * Calendar month data
 */
export interface CalendarMonthData {
  year: number;
  month: number; // 0-11
  days: CalendarDayInfo[];
}

/**
 * Props for ServiceDateManager component
 */
export interface ServiceDateManagerProps {
  serviceId: number;
  serviceName: string;
  isReadOnly?: boolean; // For Super Admin view-only mode
  onDateToggled?: (date: string, isNowAvailable: boolean) => void;
}

/**
 * Helper function to format date for API
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper function to parse API date string to Date object
 */
export function parseDateFromAPI(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Helper function to check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Helper function to check if a date is in the past
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Helper function to get day name
 */
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Helper function to format date for display
 */
export function formatDateDisplay(dateString: string): string {
  const date = parseDateFromAPI(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Generate array of dates between start and end (inclusive)
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Filter to only weekdays from a date array
 */
export function filterWeekdays(dates: Date[]): Date[] {
  return dates.filter(date => !isWeekend(date));
}
