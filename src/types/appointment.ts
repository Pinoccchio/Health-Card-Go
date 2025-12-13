/**
 * Appointment Type Definitions
 * Defines types for the time block appointment system
 *
 * System: AM/PM blocks (replaces hourly slots)
 * - AM Block: 8:00 AM - 12:00 PM (50 appointments max)
 * - PM Block: 1:00 PM - 5:00 PM (50 appointments max)
 * - Total Daily Capacity: 100 appointments
 */

// ============================================================================
// TIME BLOCK TYPES
// ============================================================================

/**
 * Time block enum for appointments
 * - AM: Morning block (8:00 AM - 12:00 PM)
 * - PM: Afternoon block (1:00 PM - 5:00 PM)
 */
export type TimeBlock = 'AM' | 'PM';

/**
 * Time block information returned by availability API
 */
export interface TimeBlockInfo {
  /** Block identifier ('AM' or 'PM') */
  block: TimeBlock;

  /** Display label (e.g., "Morning", "Afternoon") */
  label: string;

  /** Human-readable time range (e.g., "8:00 AM - 12:00 PM") */
  timeRange: string;

  /** Maximum appointments allowed in this block */
  capacity: number;

  /** Number of appointments already booked */
  booked: number;

  /** Number of slots remaining */
  remaining: number;

  /** Whether block has available slots */
  available: boolean;
}

// ============================================================================
// CAPACITY CONSTANTS
// ============================================================================

/** Maximum appointments allowed in AM block (8:00 AM - 12:00 PM) */
export const AM_CAPACITY = 50;

/** Maximum appointments allowed in PM block (1:00 PM - 5:00 PM) */
export const PM_CAPACITY = 50;

/** Total daily appointment capacity across all blocks */
export const DAILY_CAPACITY = 100;

// ============================================================================
// TIME BLOCK METADATA
// ============================================================================

/**
 * Time block configuration and metadata
 * Maps each block to its display information and default time
 */
export const TIME_BLOCKS: Record<TimeBlock, {
  /** Display label for the block */
  label: string;

  /** Human-readable time range */
  timeRange: string;

  /** Default appointment_time for this block (used in database) */
  defaultTime: string;

  /** Start hour (24-hour format) */
  startHour: number;

  /** End hour (24-hour format) */
  endHour: number;
}> = {
  AM: {
    label: 'Morning',
    timeRange: '8:00 AM - 12:00 PM',
    defaultTime: '08:00:00',
    startHour: 8,
    endHour: 12,
  },
  PM: {
    label: 'Afternoon',
    timeRange: '1:00 PM - 5:00 PM',
    defaultTime: '13:00:00',
    startHour: 13,
    endHour: 17,
  },
};

// ============================================================================
// APPOINTMENT STATUS TYPES
// ============================================================================

/**
 * Appointment status enum
 */
export type AppointmentStatus =
  | 'pending'       // Newly created, awaiting confirmation
  | 'scheduled'     // Confirmed and scheduled
  | 'checked_in'    // Patient has checked in
  | 'in_progress'   // Appointment in progress
  | 'completed'     // Appointment completed
  | 'cancelled'     // Cancelled by patient or admin
  | 'no_show';      // Patient did not arrive

// ============================================================================
// APPOINTMENT INTERFACE
// ============================================================================

/**
 * Complete appointment record
 */
export interface Appointment {
  id: string;
  patient_id: string;
  service_id: number;

  /** Date of appointment (YYYY-MM-DD) */
  appointment_date: string;

  /** Default time for the block (08:00:00 or 13:00:00) - hidden from users */
  appointment_time: string;

  /** Time block selected by patient (AM or PM) */
  time_block: TimeBlock;

  /** Queue number (1-100) */
  appointment_number: number;

  /** Current status of appointment */
  status: AppointmentStatus;

  /** Patient's reason for visit */
  reason?: string;

  /** Whether reminder was sent */
  reminder_sent?: boolean;

  /** Check-in timestamp */
  checked_in_at?: string;

  /** Start timestamp */
  started_at?: string;

  /** Completion timestamp */
  completed_at?: string;

  /** Profile ID of who completed the appointment */
  completed_by_id?: string;

  /** Reason for cancellation */
  cancellation_reason?: string;

  /** Created timestamp */
  created_at: string;

  /** Updated timestamp */
  updated_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Request body for creating an appointment
 */
export interface CreateAppointmentRequest {
  service_id: number;
  appointment_date: string;
  time_block: TimeBlock;
  reason?: string;
}

/**
 * Response from available slots API
 */
export interface AvailableSlotsResponse {
  success: boolean;
  available: boolean;
  date: string;
  total_capacity: number;
  total_booked: number;
  total_remaining: number;
  blocks: TimeBlockInfo[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get capacity for a specific time block
 */
export function getBlockCapacity(block: TimeBlock): number {
  return block === 'AM' ? AM_CAPACITY : PM_CAPACITY;
}

/**
 * Get default time for a time block
 */
export function getBlockDefaultTime(block: TimeBlock): string {
  return TIME_BLOCKS[block].defaultTime;
}

/**
 * Format time block for display
 * @example formatTimeBlock('AM') => "Morning (8:00 AM - 12:00 PM)"
 */
export function formatTimeBlock(block: TimeBlock): string {
  const { label, timeRange } = TIME_BLOCKS[block];
  return `${label} (${timeRange})`;
}

/**
 * Check if a time block is valid
 */
export function isValidTimeBlock(block: string): block is TimeBlock {
  return block === 'AM' || block === 'PM';
}

/**
 * Get status badge color classes
 */
export function getStatusColor(status: AppointmentStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'checked_in':
      return 'bg-indigo-100 text-indigo-800';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'no_show':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get time block badge color classes
 */
export function getTimeBlockColor(block: TimeBlock): string {
  return block === 'AM'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-orange-100 text-orange-800';
}
