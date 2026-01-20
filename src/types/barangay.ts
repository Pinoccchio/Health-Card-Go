/**
 * Barangay Type Definitions and Validation Schemas
 *
 * Types for barangay management including CRUD operations,
 * geographic data, and population statistics.
 */

import { z } from 'zod';

// ============================================================================
// Database Schema Types
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BarangayDB {
  id: number;
  name: string;
  code: string;
  coordinates: Coordinates | null;
  population: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Frontend Types
// ============================================================================

export interface Barangay {
  id: number;
  name: string;
  code: string;
  coordinates?: Coordinates;
  population?: number | null;
  created_at?: string;
  updated_at?: string;
}

// Extended barangay with computed fields
export interface BarangayWithStats extends Barangay {
  patient_count?: number;
  disease_count?: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface BarangayFormData {
  name: string;
  code: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateBarangayData {
  name: string;
  code: string;
  coordinates?: Coordinates | null;
}

export interface UpdateBarangayData extends Partial<CreateBarangayData> {
  id: number;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

// Coordinates validation
export const coordinatesSchema = z.object({
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

// Create barangay validation
export const createBarangaySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(5, 'Code must not exceed 5 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .trim(),
  coordinates: coordinatesSchema.nullable().optional(),
});

// Update barangay validation (all fields optional except id)
export const updateBarangaySchema = z.object({
  id: z.number().int().positive(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(5, 'Code must not exceed 5 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .trim()
    .optional(),
  coordinates: coordinatesSchema.nullable().optional(),
});

// Form validation (used for client-side forms)
export const barangayFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(5, 'Code must not exceed 5 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers')
    .trim(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullable()
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullable()
    .optional(),
});

// ============================================================================
// API Response Types
// ============================================================================

export interface BarangayResponse {
  success: boolean;
  message?: string;
  data?: Barangay | Barangay[];
  error?: string;
}

export interface BarangayStatsResponse {
  total: number;
  with_coordinates: number;
}

// ============================================================================
// Helper Types
// ============================================================================

export type BarangaySortField = 'name' | 'code';
export type SortDirection = 'asc' | 'desc';

export interface BarangayFilters {
  search?: string;
  has_coordinates?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

export const isValidCoordinates = (coords: unknown): coords is Coordinates => {
  if (!coords || typeof coords !== 'object') return false;
  const c = coords as Record<string, unknown>;
  return (
    typeof c.lat === 'number' &&
    c.lat >= -90 &&
    c.lat <= 90 &&
    typeof c.lng === 'number' &&
    c.lng >= -180 &&
    c.lng <= 180
  );
};

export const isBarangay = (obj: unknown): obj is Barangay => {
  if (!obj || typeof obj !== 'object') return false;
  const b = obj as Record<string, unknown>;
  return (
    typeof b.id === 'number' &&
    typeof b.name === 'string' &&
    typeof b.code === 'string'
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert form data to create barangay payload
 */
export const formDataToCreatePayload = (
  formData: BarangayFormData
): CreateBarangayData => {
  const payload: CreateBarangayData = {
    name: formData.name,
    code: formData.code.toUpperCase(),
  };

  // Only include coordinates if both lat and lng are provided
  if (
    formData.latitude !== undefined &&
    formData.latitude !== null &&
    formData.longitude !== undefined &&
    formData.longitude !== null
  ) {
    payload.coordinates = {
      lat: formData.latitude,
      lng: formData.longitude,
    };
  }

  return payload;
};

/**
 * Convert barangay to form data
 */
export const barangayToFormData = (barangay: Barangay): BarangayFormData => {
  return {
    name: barangay.name,
    code: barangay.code,
    latitude: barangay.coordinates?.lat ?? null,
    longitude: barangay.coordinates?.lng ?? null,
  };
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (coords: Coordinates | null | undefined): string => {
  if (!coords) return 'Not set';
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
};
