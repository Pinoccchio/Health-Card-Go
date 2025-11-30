/**
 * TypeScript Type Definitions for Medical Records
 */

import { TemplateType, MedicalRecordCategory } from '@/lib/config/medicalRecordTemplates';

/**
 * Medical Record from Database
 * Matches the medical_records table schema
 */
export interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  doctor_id: string;
  category: MedicalRecordCategory;
  template_type: TemplateType;
  record_data: Record<string, any>; // JSONB field containing form data
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;

  // Joined data
  patients?: {
    id: string;
    patient_number: string;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      date_of_birth: string;
      gender: string;
      barangay_id: number;
      barangays?: {
        name: string;
      };
    };
  };

  doctors?: {
    id: string;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      specialization: string | null;
    };
  };

  appointments?: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
  };
}

/**
 * Form data for creating a new medical record
 */
export interface CreateMedicalRecordData {
  patient_id: string;
  appointment_id?: string | null;
  template_type: TemplateType;
  category: MedicalRecordCategory;
  record_data: Record<string, any>;
}

/**
 * Disease case data for surveillance integration
 */
export interface DiseaseCase {
  patient_id: string;
  medical_record_id: string;
  barangay_id: number;
  disease_type: string;
  diagnosis_date: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  status: 'active' | 'recovered' | 'fatal' | 'monitoring';
}

/**
 * Medical record list filters
 */
export interface MedicalRecordFilters {
  patient_id?: string;
  doctor_id?: string;
  category?: MedicalRecordCategory;
  template_type?: TemplateType;
  start_date?: string;
  end_date?: string;
  search?: string;
}
