/**
 * Form Helper Utilities
 * Utilities for medical record forms including age calculation, test data generation, and localStorage management
 */

import type { Patient, Appointment } from '@/types';

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth in YYYY-MM-DD format
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Generate dummy patient data for test mode
 * @returns Mock patient object
 */
export function getTestPatientData(): Patient {
  return {
    id: 'test-patient-id',
    user_id: 'test-user-id',
    patient_number: 'P000001',
    philhealth_number: '12-345678901-2',
    medical_history: {
      conditions: ['Hypertension'],
      surgeries: [],
      hospitalizations: []
    },
    allergies: {
      medications: ['Penicillin'],
      food: ['Peanuts'],
      environmental: []
    },
    current_medications: {
      medications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily' }
      ]
    },
    accessibility_requirements: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profiles: {
      id: 'test-user-id',
      email: 'jex.xejs@example.com',
      first_name: 'Jex',
      last_name: 'Xejs',
      role: 'patient' as const,
      admin_category: null,
      status: 'active' as const,
      contact_number: '+63 912 345 6789',
      date_of_birth: '1998-12-08',
      gender: 'male' as const,
      specialization: null,
      license_number: null,
      barangay_id: 1,
      emergency_contact: {
        name: 'Maria Xejs',
        relationship: 'Mother',
        phone: '+63 912 345 6780'
      },
      approved_at: new Date().toISOString(),
      approved_by: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      barangays: {
        id: 1,
        name: 'Datu Abdul Dadia',
        code: 'DAD',
        coordinates: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  };
}

/**
 * Generate dummy appointment data for test mode
 * @returns Mock appointment object
 */
export function getTestAppointmentData(): Appointment {
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 7); // 7 days from now

  return {
    id: 'test-appointment-id',
    patient_id: 'test-patient-id',
    doctor_id: 'test-doctor-id',
    appointment_date: appointmentDate.toISOString().split('T')[0],
    appointment_time: '08:00:00',
    appointment_number: 1,
    status: 'scheduled' as const,
    reason: 'General checkup',
    reminder_sent: false,
    checked_in_at: null,
    started_at: null,
    completed_at: null,
    cancellation_reason: null,
    cancelled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    service_id: 1,
    patients: getTestPatientData(),
    doctors: {
      id: 'test-doctor-id',
      user_id: 'test-doctor-user-id',
      schedule: null,
      max_patients_per_day: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: 'test-doctor-user-id',
        email: 'doctor@healthcard.gov.ph',
        first_name: 'Dr. Juan',
        last_name: 'dela Cruz',
        role: 'doctor' as const,
        admin_category: null,
        status: 'active' as const,
        contact_number: '+63 912 000 0000',
        date_of_birth: '1980-01-01',
        gender: 'male' as const,
        specialization: 'General Practice',
        license_number: 'PRC-1234567',
        barangay_id: null,
        emergency_contact: null,
        approved_at: new Date().toISOString(),
        approved_by: null,
        rejection_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        barangays: null
      }
    },
    services: {
      id: 1,
      name: 'General Checkup',
      category: 'general',
      description: 'Standard medical consultation and diagnosis',
      duration_minutes: 30,
      requires_appointment: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };
}

/**
 * Save form draft to localStorage
 * @param key - Storage key identifier
 * @param data - Form data to save
 */
export function saveFormDraft(key: string, data: any): void {
  try {
    const draft = {
      data,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`healthcard_draft_${key}`, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save form draft:', error);
  }
}

/**
 * Load form draft from localStorage
 * @param key - Storage key identifier
 * @returns Saved form data or null if not found
 */
export function loadFormDraft(key: string): any | null {
  try {
    const saved = localStorage.getItem(`healthcard_draft_${key}`);
    if (!saved) return null;

    const draft = JSON.parse(saved);

    // Check if draft is older than 24 hours
    const draftDate = new Date(draft.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - draftDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      // Clear old draft
      clearFormDraft(key);
      return null;
    }

    return draft.data;
  } catch (error) {
    console.error('Failed to load form draft:', error);
    return null;
  }
}

/**
 * Clear form draft from localStorage
 * @param key - Storage key identifier
 */
export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(`healthcard_draft_${key}`);
  } catch (error) {
    console.error('Failed to clear form draft:', error);
  }
}

/**
 * Get prefilled patient data for medical record form
 * @param patient - Patient object
 * @returns Object with prefilled field values
 */
export function getPrefilledPatientData(patient: Patient) {
  return {
    patient_name: `${patient.profiles.first_name} ${patient.profiles.last_name}`,
    patient_number: patient.patient_number,
    age: calculateAge(patient.profiles.date_of_birth),
    sex: patient.profiles.gender,
    barangay: patient.profiles.barangays?.name || 'Unknown',
    contact_number: patient.profiles.contact_number || '',
    emergency_contact: patient.emergency_contact
      ? `${(patient.emergency_contact as any).name} (${(patient.emergency_contact as any).relationship}): ${(patient.emergency_contact as any).phone}`
      : ''
  };
}

/**
 * Format appointment details for display
 * @param appointment - Appointment object
 * @returns Formatted appointment string
 */
export function formatAppointmentDetails(appointment: Appointment): string {
  const date = new Date(appointment.appointment_date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const time = appointment.appointment_time.substring(0, 5); // HH:MM format
  const period = parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM';
  let hours = parseInt(time.split(':')[0]);
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  const formattedTime = `${hours}:${time.split(':')[1]} ${period}`;

  return `${formattedDate} at ${formattedTime}`;
}

/**
 * Get default/sample form data for auto-fill toggle
 * @param templateType - Type of medical record template
 * @param patient - Optional patient data for prefilling patient info
 * @returns Complete sample data for the template
 */
export function getDefaultFormData(templateType: string, patient?: Patient | null): Record<string, any> {
  // Get date helpers
  const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const getDateOffset = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Base patient data (prefilled or sample)
  const baseData: Record<string, any> = {
    patient_name: patient?.profiles ? `${patient.profiles.first_name} ${patient.profiles.last_name}` : 'Jex Xejs',
    patient_number: patient?.patient_number || 'P000001',
    age: patient?.profiles?.date_of_birth ? calculateAge(patient.profiles.date_of_birth) : 26,
    sex: patient?.profiles?.gender || 'male',
    barangay: patient?.profiles?.barangays?.name || 'Salvacion (Poblacion)',
  };

  // Template-specific sample data
  switch (templateType) {
    case 'general_checkup':
      return {
        ...baseData,
        // Vital Signs
        blood_pressure: '120/80',
        temperature: '36.5',
        heart_rate: '72',
        respiratory_rate: '16',
        weight: '65',
        height: '165',
        // Chief Complaint
        chief_complaint: 'Patient presents with fever and headache',
        duration: '3 days',
        // Diagnosis
        diagnosis: 'Viral infection',
        secondary_diagnosis: '',
        severity: 'mild',
        // Treatment Plan
        prescription: 'Paracetamol 500mg every 6 hours\nVitamin C 500mg once daily',
        treatment_notes: 'Rest and hydration advised',
        follow_up_date: getDateOffset(7),
        follow_up_notes: 'Return if symptoms worsen',
        // Additional Notes
        notes: 'Patient cooperative, no complications observed',
      };

    case 'immunization':
      return {
        ...baseData,
        // Vaccine Information
        vaccine_type: 'covid19',
        vaccine_name: 'Pfizer',
        batch_number: 'AB12345',
        dose_number: '1',
        total_doses: '2',
        administration_date: getTodayString(),
        // Administration Details
        route: 'intramuscular',
        site: 'Left deltoid',
        dosage: '0.5 mL',
        // Follow-up
        next_dose_date: getDateOffset(21),
        adverse_reactions: '',
        notes: 'No immediate adverse reactions observed',
      };

    case 'prenatal':
      return {
        ...baseData,
        // Pregnancy Information
        gestational_age: '12 weeks 3 days',
        lmp: getDateOffset(-84), // 12 weeks ago
        edd: getDateOffset(196), // 28 weeks from now (40 weeks - 12 weeks)
        gravida: '1',
        para: '0',
        // Vital Signs & Measurements
        blood_pressure: '110/70',
        weight: '60',
        fundal_height: '12',
        fetal_heart_rate: '140',
        // Physical Examination
        fetal_position: 'Cephalic',
        edema: 'none',
        urine_protein: 'Negative',
        urine_sugar: 'Negative',
        // Risk Assessment
        risk_level: 'low',
        complications: '',
        // Treatment & Follow-up
        supplements: 'Folic acid 400mcg once daily\nIron supplements 60mg once daily',
        recommendations: 'Continue prenatal vitamins, maintain healthy diet, regular exercise',
        next_visit_date: getDateOffset(28),
        notes: 'Normal prenatal checkup, no concerns',
      };

    case 'hiv':
      return {
        ...baseData,
        // HIV Status
        test_type: 'screening',
        test_date: getTodayString(),
        test_result: 'negative',
        // Clinical Assessment
        cd4_count: '',
        viral_load: '',
        who_stage: '',
        // Treatment
        treatment_status: 'not_started',
        art_regimen: '',
        adherence: '',
        side_effects: '',
        // Follow-up
        next_visit_date: getDateOffset(180),
        next_lab_date: '',
        counseling_notes: 'Risk reduction counseling provided',
        notes: 'Routine screening, patient counseled on prevention',
      };

    case 'laboratory':
      return {
        ...baseData,
        // Test Information
        test_category: 'hematology',
        test_name: 'Complete Blood Count (CBC)',
        test_date: getTodayString(),
        specimen_type: 'Blood',
        // Results
        results: `WBC: 7.5 x10^9/L (Normal: 4.0-11.0)
RBC: 4.8 x10^12/L (Normal: 4.5-5.5)
Hemoglobin: 140 g/L (Normal: 130-170)
Hematocrit: 42% (Normal: 40-50%)
Platelets: 250 x10^9/L (Normal: 150-400)`,
        interpretation: 'normal',
        // Clinical Correlation
        clinical_notes: 'All values within normal range, no abnormalities detected',
        recommendations: 'No follow-up tests required at this time',
        notes: 'Results discussed with patient',
      };

    default:
      return baseData;
  }
}
