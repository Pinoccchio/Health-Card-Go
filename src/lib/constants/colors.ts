/**
 * Centralized Color Constants for HealthCard Application
 *
 * This file provides consistent color definitions across the entire application
 * to ensure a unified visual language for appointment statuses, user roles, and UI elements.
 */

import { CheckCircle, XCircle, Clock, AlertCircle, Calendar, Users } from 'lucide-react';

// ============================================================================
// APPOINTMENT STATUS COLORS
// ============================================================================

export type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface StatusColorConfig {
  label: string;
  color: string;        // Light background for badges (e.g., bg-blue-100 text-blue-800)
  timeline: string;     // Standard color for timeline dots (e.g., bg-blue-500)
  icon: any;            // Lucide icon component
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, StatusColorConfig> = {
  pending: {
    label: 'Pending',
    color: 'bg-orange-100 text-orange-800',
    timeline: 'bg-orange-500',
    icon: Clock,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-800',
    timeline: 'bg-blue-500',
    icon: Calendar,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-purple-100 text-purple-800',
    timeline: 'bg-purple-500',
    icon: Users,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    timeline: 'bg-yellow-500',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    timeline: 'bg-green-500',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    timeline: 'bg-gray-500',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'bg-red-100 text-red-800',
    timeline: 'bg-red-500',
    icon: AlertCircle,
  },
};

// ============================================================================
// USER ROLE COLORS
// ============================================================================

export type UserRole = 'patient' | 'doctor' | 'healthcare_admin' | 'super_admin';

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  patient: 'bg-blue-100 text-blue-800',
  doctor: 'bg-green-100 text-green-800',
  healthcare_admin: 'bg-purple-100 text-purple-800',
  super_admin: 'bg-red-100 text-red-800',
};

// ============================================================================
// TIMELINE-SPECIFIC COLORS
// ============================================================================

export const TIMELINE_COLORS = {
  doctor_assigned: 'bg-blue-500',      // Blue for doctor assignment/changes
  doctor_unassigned: 'bg-gray-500',    // Gray for doctor removal
  reversion: 'bg-yellow-500',          // Yellow for status reversions (warning)
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the timeline dot color for a status change
 * @param status - The appointment status
 * @returns Tailwind CSS class for timeline dot color
 */
export function getStatusTimelineColor(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_CONFIG[status]?.timeline || 'bg-gray-500';
}

/**
 * Get the badge color for a status
 * @param status - The appointment status
 * @returns Tailwind CSS class for status badge
 */
export function getStatusBadgeColor(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_CONFIG[status]?.color || 'bg-gray-100 text-gray-800';
}

/**
 * Get the role badge color
 * @param role - The user role
 * @returns Tailwind CSS class for role badge
 */
export function getRoleBadgeColor(role: string): string {
  const normalizedRole = role as UserRole;
  return USER_ROLE_COLORS[normalizedRole] || 'bg-gray-100 text-gray-800';
}
