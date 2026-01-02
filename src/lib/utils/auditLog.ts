/**
 * Audit Logging Utility
 *
 * Provides functions to log system activities for security auditing and compliance.
 * All critical actions (create, update, delete) should be logged using these utilities.
 *
 * Usage:
 * ```typescript
 * import { logAuditAction } from '@/lib/utils/auditLog';
 *
 * // In API route
 * await logAuditAction({
 *   supabase,
 *   userId: user.id,
 *   action: 'user_created',
 *   entityType: 'profile',
 *   entityId: newUser.id,
 *   changes: { before: null, after: newUser },
 *   request,
 * });
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Standard action types for audit logging
 * Use these constants for consistency across the application
 */
export const AUDIT_ACTIONS = {
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',
  PASSWORD_CHANGED: 'password_changed',

  // Appointment Management
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  APPOINTMENT_CHECKED_IN: 'appointment_checked_in',
  APPOINTMENT_STARTED: 'appointment_started',

  // Medical Records
  MEDICAL_RECORD_CREATED: 'medical_record_created',
  MEDICAL_RECORD_UPDATED: 'medical_record_updated',
  MEDICAL_RECORD_DELETED: 'medical_record_deleted',
  MEDICAL_RECORD_ACCESSED: 'medical_record_accessed',

  // Health Cards
  HEALTH_CARD_GENERATED: 'health_card_generated',
  HEALTH_CARD_ACCESSED: 'health_card_accessed',

  // Announcements
  ANNOUNCEMENT_CREATED: 'announcement_created',
  ANNOUNCEMENT_UPDATED: 'announcement_updated',
  ANNOUNCEMENT_DELETED: 'announcement_deleted',
  ANNOUNCEMENT_TOGGLED: 'announcement_toggled',

  // Services
  SERVICE_CREATED: 'service_created',
  SERVICE_UPDATED: 'service_updated',
  SERVICE_DELETED: 'service_deleted',
  SERVICE_TOGGLED: 'service_toggled',

  // Barangays
  BARANGAY_CREATED: 'barangay_created',
  BARANGAY_UPDATED: 'barangay_updated',
  BARANGAY_DELETED: 'barangay_deleted',

  // Disease Surveillance
  DISEASE_CASE_CREATED: 'disease_case_created',
  DISEASE_CASE_UPDATED: 'disease_case_updated',
  DISEASE_PREDICTION_GENERATED: 'disease_prediction_generated',

  // Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  FEEDBACK_REVIEWED: 'feedback_reviewed',

  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',

  // System
  SYSTEM_SETTINGS_UPDATED: 'system_settings_updated',
} as const;

/**
 * Standard entity types for audit logging
 */
export const AUDIT_ENTITIES = {
  PROFILE: 'profile',
  APPOINTMENT: 'appointment',
  MEDICAL_RECORD: 'medical_record',
  HEALTH_CARD: 'health_card',
  ANNOUNCEMENT: 'announcement',
  SERVICE: 'service',
  BARANGAY: 'barangay',
  DISEASE_CASE: 'disease_case',
  DISEASE_PREDICTION: 'disease_prediction',
  FEEDBACK: 'feedback',
  PATIENT: 'patient',
  HEALTHCARE_ADMIN: 'healthcare_admin',
  SUPER_ADMIN: 'super_admin',
  STAFF: 'staff',
  SYSTEM: 'system',
} as const;

/**
 * Parameters for logging an audit action
 */
export interface LogAuditActionParams {
  /** Supabase client instance */
  supabase: SupabaseClient;
  /** ID of the user performing the action (null for system actions) */
  userId: string | null;
  /** Action being performed (use AUDIT_ACTIONS constants) */
  action: string;
  /** Type of entity being acted upon (use AUDIT_ENTITIES constants) */
  entityType: string;
  /** ID of the specific entity (e.g., user ID, appointment ID) */
  entityId?: string | null;
  /** Before and after values for the action */
  changes?: {
    before?: any;
    after?: any;
  } | null;
  /** Next.js request object to extract IP and user agent */
  request?: NextRequest | null;
  /** Manual IP address override (if request is not available) */
  ipAddress?: string | null;
  /** Manual user agent override (if request is not available) */
  userAgent?: string | null;
}

/**
 * Log an audit action to the database
 *
 * @param params - Audit action parameters
 * @returns Promise that resolves when the log is saved
 *
 * @example
 * ```typescript
 * // Log user creation
 * await logAuditAction({
 *   supabase,
 *   userId: adminUser.id,
 *   action: AUDIT_ACTIONS.USER_CREATED,
 *   entityType: AUDIT_ENTITIES.PROFILE,
 *   entityId: newUser.id,
 *   changes: {
 *     before: null,
 *     after: { email: newUser.email, role: newUser.role }
 *   },
 *   request,
 * });
 * ```
 */
export async function logAuditAction(params: LogAuditActionParams): Promise<void> {
  const {
    supabase,
    userId,
    action,
    entityType,
    entityId = null,
    changes = null,
    request = null,
    ipAddress = null,
    userAgent = null,
  } = params;

  try {
    // Extract IP address from request or use override
    let finalIpAddress = ipAddress;
    if (!finalIpAddress && request) {
      finalIpAddress = extractIpAddress(request);
    }

    // Extract user agent from request or use override
    let finalUserAgent = userAgent;
    if (!finalUserAgent && request) {
      finalUserAgent = request.headers.get('user-agent');
    }

    // Insert audit log entry
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes: changes ? sanitizeChanges(changes) : null,
      ip_address: finalIpAddress,
      user_agent: finalUserAgent,
    });

    if (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging should not break the main operation
    }
  } catch (error) {
    console.error('Unexpected error logging audit action:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Extract IP address from Next.js request
 * Handles various proxy configurations (Vercel, CloudFlare, etc.)
 */
function extractIpAddress(request: NextRequest): string | null {
  // Try various headers in order of preference
  const headers = [
    'x-real-ip',
    'x-forwarded-for',
    'cf-connecting-ip', // CloudFlare
    'x-vercel-forwarded-for', // Vercel
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first
      return value.split(',')[0].trim();
    }
  }

  return null;
}

/**
 * Sanitize changes object to prevent logging sensitive data
 * Removes password fields and other sensitive information
 */
function sanitizeChanges(changes: { before?: any; after?: any }): any {
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];

  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  };

  return {
    before: sanitize(changes.before),
    after: sanitize(changes.after),
  };
}

/**
 * Batch log multiple audit actions at once
 * Useful for operations that affect multiple entities
 *
 * @param supabase - Supabase client instance
 * @param actions - Array of audit actions to log
 *
 * @example
 * ```typescript
 * await batchLogAuditActions(supabase, [
 *   {
 *     userId: user.id,
 *     action: AUDIT_ACTIONS.USER_DELETED,
 *     entityType: AUDIT_ENTITIES.PROFILE,
 *     entityId: userId1,
 *   },
 *   {
 *     userId: user.id,
 *     action: AUDIT_ACTIONS.USER_DELETED,
 *     entityType: AUDIT_ENTITIES.PROFILE,
 *     entityId: userId2,
 *   },
 * ]);
 * ```
 */
export async function batchLogAuditActions(
  supabase: SupabaseClient,
  actions: Omit<LogAuditActionParams, 'supabase'>[]
): Promise<void> {
  try {
    const entries = actions.map(action => {
      const {
        userId,
        action: actionType,
        entityType,
        entityId = null,
        changes = null,
        request = null,
        ipAddress = null,
        userAgent = null,
      } = action;

      // Extract IP and user agent
      let finalIpAddress = ipAddress;
      if (!finalIpAddress && request) {
        finalIpAddress = extractIpAddress(request);
      }

      let finalUserAgent = userAgent;
      if (!finalUserAgent && request) {
        finalUserAgent = request.headers.get('user-agent');
      }

      return {
        user_id: userId,
        action: actionType,
        entity_type: entityType,
        entity_id: entityId,
        changes: changes ? sanitizeChanges(changes) : null,
        ip_address: finalIpAddress,
        user_agent: finalUserAgent,
      };
    });

    const { error } = await supabase.from('audit_logs').insert(entries);

    if (error) {
      console.error('Failed to batch log audit actions:', error);
      // Don't throw - audit logging should not break the main operation
    }
  } catch (error) {
    console.error('Unexpected error batch logging audit actions:', error);
    // Don't throw - audit logging should not break the main operation
  }
}
