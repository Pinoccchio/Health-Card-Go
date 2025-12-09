/**
 * Authentication Type Definitions
 *
 * Types for the HealthCard authentication system supporting 4 user roles:
 * - Super Admin (role_id: 1) - Full system access
 * - Healthcare Admin (role_id: 2) - Service-specific admin with assigned_service_id
 * - Patient (role_id: 4) - Regular users
 * - Staff (role_id: 5) - Disease surveillance staff (handles ALL diseases, no service assignment)
 */

// ============================================================================
// User Roles and Categories (Updated to match Supabase schema)
// ============================================================================

// Database uses string enums, but we keep numeric IDs for backward compatibility
export type RoleId = 1 | 2 | 4 | 5;
export type UserRole = 'super_admin' | 'healthcare_admin' | 'staff' | 'patient';

// Mapping between role_id and role enum
export const ROLE_ID_TO_ENUM: Record<RoleId, UserRole> = {
  1: 'super_admin',
  2: 'healthcare_admin',
  4: 'patient',
  5: 'staff',
} as const;

export const ROLE_ENUM_TO_ID: Record<UserRole, RoleId> = {
  super_admin: 1,
  healthcare_admin: 2,
  patient: 4,
  staff: 5,
} as const;

export const ROLE_NAMES: Record<RoleId, string> = {
  1: 'Super Admin',
  2: 'Healthcare Admin',
  4: 'Patient',
  5: 'Staff',
} as const;

/**
 * DEPRECATED: AdminCategory is no longer used.
 * Healthcare Admins are now assigned to specific services via assigned_service_id.
 *
 * Previous categories mapped to services:
 * - healthcard → Health Card Service
 * - hiv → HIV/AIDS Service
 * - pregnancy → Pregnancy Service
 * - laboratory → Laboratory Service
 * - immunization → Immunization Service
 */
export type AdminCategory =
  | 'healthcard'
  | 'hiv'
  | 'pregnancy'
  | 'laboratory'
  | 'immunization';

export const ADMIN_CATEGORY_NAMES = {
  healthcard: 'Healthcard Admin',
  hiv: 'HIV Admin',
  pregnancy: 'Pregnancy Admin',
  laboratory: 'Laboratory Admin',
  immunization: 'Immunization Admin',
} as const;

export type UserStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';

// ============================================================================
// User Interface
// ============================================================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: RoleId;
  admin_category?: AdminCategory; // DEPRECATED: Use assigned_service_id instead
  assigned_service_id?: number; // For healthcare admins - references services.id
  status: UserStatus;
  barangay_id?: number;
  barangay_name?: string;
  contact_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  emergency_contact?: {
    name: string;
    phone: string;
    email?: string;
  };
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// Auth Forms
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  // Common fields
  email: string;
  password: string;
  confirmPassword?: string; // Optional since not sent to backend
  firstName: string; // Changed from first_name for consistency
  lastName: string; // Changed from last_name for consistency
  role: string; // Changed from role_id to work with Supabase string enums

  // Healthcare Admin specific
  adminCategory?: AdminCategory; // Changed from admin_category for consistency

  // Patient specific
  barangayId?: number; // Changed from barangay_id for consistency
  dateOfBirth?: string; // Changed from date_of_birth for consistency
  gender?: 'male' | 'female' | 'other';
  contactNumber?: string; // Changed from contact_number for consistency
  emergencyContact?: {
    name: string;
    phone: string;
    email?: string;
  };

  // Optional medical information
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string;
  medicalConditions?: string;

  // Terms
  acceptTerms?: boolean; // Optional since not sent to backend
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
  token?: string;
}

// ============================================================================
// Auth State
// ============================================================================

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// ============================================================================
// Mock Session Storage
// ============================================================================

export interface MockSession {
  user: User;
  token: string;
  expiresAt: string;
}

// ============================================================================
// Barangay (for registration)
// ============================================================================

export interface Barangay {
  id: number;
  name: string;
  code?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type RoleName = typeof ROLE_NAMES[RoleId];
export type AdminCategoryName = typeof ADMIN_CATEGORY_NAMES[AdminCategory];
