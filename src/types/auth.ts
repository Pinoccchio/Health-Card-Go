/**
 * Authentication Type Definitions
 *
 * Types for the HealthCard authentication system supporting 4 user roles:
 * - Super Admin (role_id: 1)
 * - Healthcare Admin (role_id: 2) with 5 categories
 * - Doctor (role_id: 3)
 * - Patient (role_id: 4)
 */

// ============================================================================
// User Roles and Categories
// ============================================================================

export type RoleId = 1 | 2 | 3 | 4;

export const ROLE_NAMES = {
  1: 'Super Admin',
  2: 'Healthcare Admin',
  3: 'Doctor',
  4: 'Patient',
} as const;

export type AdminCategory =
  | 'healthcard'
  | 'hiv'
  | 'pregnancy'
  | 'general_admin'
  | 'laboratory';

export const ADMIN_CATEGORY_NAMES = {
  healthcard: 'Healthcard Admin',
  hiv: 'HIV Admin',
  pregnancy: 'Pregnancy Admin',
  general_admin: 'General Admin',
  laboratory: 'Laboratory Admin',
} as const;

export type UserStatus = 'pending' | 'active' | 'inactive' | 'rejected';

// ============================================================================
// User Interface
// ============================================================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: RoleId;
  admin_category?: AdminCategory;
  status: UserStatus;
  barangay_id?: number;
  barangay_name?: string;
  contact_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  specialization?: string; // For doctors
  license_number?: string; // For doctors
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
  confirmPassword: string;
  first_name: string;
  last_name: string;
  role_id: RoleId;

  // Healthcare Admin specific
  admin_category?: AdminCategory;

  // Patient specific
  barangay_id?: number;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  contact_number?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    email?: string;
  };

  // Doctor specific
  specialization?: string;
  license_number?: string;

  // Super Admin specific
  admin_code?: string; // Secret code for super admin registration

  // Terms
  acceptTerms: boolean;
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
  login: (credentials: LoginCredentials) => Promise<void>;
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
