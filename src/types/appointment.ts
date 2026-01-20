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
  | 'draft'         // Draft appointment created during upload step (not finalized)
  | 'pending'       // Newly created, awaiting confirmation
  | 'scheduled'     // Confirmed and scheduled
  | 'checked_in'    // Patient has checked in
  | 'in_progress'   // Appointment in progress
  | 'completed'     // Appointment completed
  | 'cancelled'     // Cancelled by patient or admin
  | 'no_show'       // Patient did not arrive
  | 'rescheduled';  // Requires additional testing, patient needs to reschedule

// ============================================================================
// HEALTH CARD TYPES
// ============================================================================

/**
 * Health card type enum
 * - food_handler: Yellow Card - Food Handler (requires Urinalysis, Stool Test, CBC, Chest X-ray)
 * - non_food: Green Card - Non-Food (requires Urinalysis, Stool Test, CBC, Chest X-ray)
 * - pink: Pink Card - Skin-to-skin contact occupations (requires Smearing)
 */
export type HealthCardType = 'food_handler' | 'non_food' | 'pink';

/**
 * Lab location type for health card appointments
 * - inside_cho: Patient will have lab tests done inside CHO
 * - outside_cho: Patient has lab tests done outside CHO (requires upload of lab request & results)
 */
export type LabLocationType = 'inside_cho' | 'outside_cho';

/**
 * Verification status for uploaded documents
 */
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Appointment stage for health card workflow
 */
export type AppointmentStage = 'check_in' | 'laboratory' | 'results' | 'checkup' | 'releasing';

/**
 * File type for appointment uploads
 */
export type UploadFileType = 'lab_request' | 'payment_receipt' | 'valid_id' | 'other';

// ============================================================================
// HEALTH CARD CONSTANTS
// ============================================================================

/**
 * Health card type configurations with display information and requirements
 */
export const HEALTH_CARD_TYPES: Record<HealthCardType, {
  /** Display label */
  label: string;

  /** Color identifier (for UI) */
  color: string;

  /** Card description */
  description: string;

  /** Target audience */
  targetAudience: string;

  /** Required laboratory tests */
  requiredTests: string[];

  /** Badge color classes */
  badgeColor: string;
}> = {
  food_handler: {
    label: 'Yellow Card - Food Handler',
    color: 'yellow',
    description: 'For food handlers and workers in the food industry.',
    targetAudience: 'Food Handlers, Food Industry Workers',
    requiredTests: ['Urinalysis', 'Stool Test', 'CBC (Complete Blood Count)', 'Chest X-ray'],
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  non_food: {
    label: 'Green Card - Non-Food',
    color: 'green',
    description: 'For non-food handlers or general employees in other industries.',
    targetAudience: 'Non-Food Handlers, General Employees',
    requiredTests: ['Urinalysis', 'Stool Test', 'CBC (Complete Blood Count)', 'Chest X-ray'],
    badgeColor: 'bg-green-100 text-green-800 border-green-300',
  },
  pink: {
    label: 'Pink Card',
    color: 'pink',
    description: 'For occupations involving skin-to-skin contact (e.g., massage therapists, health workers).',
    targetAudience: 'Massage Therapists, Health Workers',
    requiredTests: ['Smearing'],
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-300',
  },
};

/**
 * Lab location configurations
 */
export const LAB_LOCATIONS: Record<LabLocationType, {
  label: string;
  description: string;
  requiredUploads: UploadFileType[];
}> = {
  inside_cho: {
    label: 'Inside CHO Laboratory',
    description: 'Laboratory tests will be conducted at the City Health Office',
    requiredUploads: ['lab_request', 'payment_receipt', 'valid_id'], // Require all 3 documents for verification
  },
  outside_cho: {
    label: 'Outside CHO Laboratory',
    description: 'Laboratory tests conducted at an external facility',
    requiredUploads: ['valid_id'], // Require only Valid ID (patient already has lab results)
  },
};

/**
 * Upload file type configurations
 */
export const UPLOAD_FILE_TYPES: Record<UploadFileType, {
  label: string;
  description: string;
  acceptedFormats: string[];
  maxSizeMB: number;
}> = {
  lab_request: {
    label: 'Laboratory Request Form',
    description: 'Official lab request form with required tests',
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 5,
  },
  payment_receipt: {
    label: 'Payment Receipt',
    description: 'Official receipt for laboratory payment',
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 5,
  },
  valid_id: {
    label: 'Valid ID',
    description: 'Government-issued ID for verification',
    acceptedFormats: ['image/jpeg', 'image/png'],
    maxSizeMB: 3,
  },
  other: {
    label: 'Other Document',
    description: 'Additional supporting documents',
    acceptedFormats: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 5,
  },
};

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

  /** Health card type (for health card appointments) */
  card_type?: HealthCardType;

  /** Lab location selection (for health card appointments) */
  lab_location?: LabLocationType;

  /** Verification status for uploaded documents */
  verification_status?: VerificationStatus;

  /** Current stage in health card workflow */
  appointment_stage?: AppointmentStage;

  /** Created timestamp */
  created_at: string;

  /** Updated timestamp */
  updated_at: string;
}

/**
 * Appointment upload record for document verification
 */
export interface AppointmentUpload {
  id: string;
  appointment_id: string;
  file_type: UploadFileType;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  uploaded_by_id: string;
  uploaded_at: string;
  verified_by_id?: string;
  verified_at?: string;
  verification_status: VerificationStatus;
  verification_notes?: string;
  created_at: string;
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
  status?: AppointmentStatus; // Optional: For draft appointments

  // Health card specific fields
  card_type?: HealthCardType;
  lab_location?: LabLocationType;
}

/**
 * Request body for uploading appointment documents
 */
export interface UploadAppointmentDocumentRequest {
  appointment_id: string;
  file_type: UploadFileType;
  file: File;
}

/**
 * Response from upload document API
 */
export interface UploadAppointmentDocumentResponse {
  success: boolean;
  upload?: AppointmentUpload;
  error?: string;
}

/**
 * Request body for verifying an appointment upload
 */
export interface VerifyAppointmentUploadRequest {
  upload_id: string;
  verification_status: VerificationStatus;
  verification_notes?: string;
}

/**
 * Health card type option for UI selection
 */
export interface HealthCardTypeOption {
  value: HealthCardType;
  label: string;
  color: string;
  description: string;
  targetAudience: string;
  requiredTests: string[];
  badgeColor: string;
}

/**
 * Lab location option for UI selection
 */
export interface LabLocationOption {
  value: LabLocationType;
  label: string;
  description: string;
  requiredUploads: UploadFileType[];
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

/**
 * Get health card type display information
 */
export function getHealthCardTypeInfo(cardType: HealthCardType): typeof HEALTH_CARD_TYPES[HealthCardType] {
  return HEALTH_CARD_TYPES[cardType];
}

/**
 * Get lab location display information
 */
export function getLabLocationInfo(labLocation: LabLocationType): typeof LAB_LOCATIONS[LabLocationType] {
  return LAB_LOCATIONS[labLocation];
}

/**
 * Get upload file type display information
 */
export function getUploadFileTypeInfo(fileType: UploadFileType): typeof UPLOAD_FILE_TYPES[UploadFileType] {
  return UPLOAD_FILE_TYPES[fileType];
}

/**
 * Get verification status badge color classes
 */
export function getVerificationStatusColor(status: VerificationStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get appointment stage badge color classes
 */
export function getAppointmentStageColor(stage: AppointmentStage): string {
  switch (stage) {
    case 'check_in':
      return 'bg-blue-100 text-blue-800';
    case 'laboratory':
      return 'bg-purple-100 text-purple-800';
    case 'results':
      return 'bg-indigo-100 text-indigo-800';
    case 'checkup':
      return 'bg-amber-100 text-amber-800';
    case 'releasing':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get appointment stage display label
 */
export function getAppointmentStageLabel(stage: AppointmentStage): string {
  switch (stage) {
    case 'check_in':
      return 'Check-In';
    case 'laboratory':
      return 'Laboratory';
    case 'results':
      return 'Results Ready';
    case 'checkup':
      return 'Doctor Checkup';
    case 'releasing':
      return 'Health Card Releasing';
    default:
      return 'Unknown';
  }
}

/**
 * Check if service requires health card selection
 * @param serviceId - The service ID
 * @returns true if service is Health Card Issuance (ID 12)
 */
export function isHealthCardService(serviceId: number): boolean {
  return serviceId === 12;
}

/**
 * Check if lab location requires document upload
 * @param labLocation - The lab location type
 * @returns true if outside_cho (requires lab request & receipt)
 */
export function requiresDocumentUpload(labLocation: LabLocationType): boolean {
  return labLocation === 'outside_cho';
}

/**
 * Get required upload file types for a lab location
 * @param labLocation - The lab location type
 * @returns Array of required file types
 */
export function getRequiredUploads(labLocation: LabLocationType): UploadFileType[] {
  return LAB_LOCATIONS[labLocation].requiredUploads;
}

/**
 * Validate file type and size
 * @param file - File to validate
 * @param fileType - Expected file type
 * @returns Validation result with error message if invalid
 */
export function validateUploadFile(
  file: File,
  fileType: UploadFileType
): { valid: boolean; error?: string } {
  const fileConfig = UPLOAD_FILE_TYPES[fileType];

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > fileConfig.maxSizeMB) {
    return {
      valid: false,
      error: `File size exceeds ${fileConfig.maxSizeMB}MB limit`,
    };
  }

  // Check file format
  if (!fileConfig.acceptedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file format. Accepted formats: ${fileConfig.acceptedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}
