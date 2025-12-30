/**
 * Medical Record Template Definitions
 *
 * Defines the 5 template types for medical records:
 * 1. general_checkup - General medical consultations
 * 2. immunization - Vaccination records
 * 3. prenatal - Pregnancy monitoring (encrypted)
 * 4. hiv - HIV/AIDS monitoring (encrypted)
 * 5. laboratory - Lab test results
 */

export type TemplateType = 'general_checkup' | 'immunization' | 'prenatal' | 'hiv' | 'laboratory';

export type MedicalRecordCategory = 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';

// Field types for dynamic form generation
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'radio' | 'multiselect';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  readonly?: boolean; // Field is prefilled and cannot be edited
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  unit?: string;
  helpText?: string;
}

export interface TemplateSection {
  title: string;
  fields: FieldDefinition[];
}

export interface MedicalRecordTemplate {
  type: TemplateType;
  category: MedicalRecordCategory;
  name: string;
  description: string;
  requiresEncryption: boolean;
  sections: TemplateSection[];
  diseaseTypes?: string[]; // For disease surveillance integration
}

/**
 * General Checkup Template
 * Used for routine consultations and general medical issues
 */
export const generalCheckupTemplate: MedicalRecordTemplate = {
  type: 'general_checkup',
  category: 'general',
  name: 'General Checkup',
  description: 'Standard medical consultation and diagnosis',
  requiresEncryption: false,
  diseaseTypes: ['dengue', 'malaria', 'measles', 'rabies', 'other'],
  sections: [
    {
      title: 'Patient Information',
      fields: [
        { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
        { name: 'patient_number', label: 'Patient Number', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true, unit: 'years' },
        { name: 'sex', label: 'Sex', type: 'text', required: true },
        { name: 'barangay', label: 'Barangay', type: 'text', required: true },
      ],
    },
    {
      title: 'Vital Signs',
      fields: [
        { name: 'blood_pressure', label: 'Blood Pressure', type: 'text', required: true, placeholder: '120/80', helpText: 'Format: systolic/diastolic (e.g., 120/80)' },
        { name: 'temperature', label: 'Temperature', type: 'number', required: true, placeholder: '36.5', min: 30, max: 45, unit: '°C' },
        { name: 'heart_rate', label: 'Heart Rate', type: 'number', required: true, placeholder: '72', min: 30, max: 200, unit: 'bpm' },
        { name: 'respiratory_rate', label: 'Respiratory Rate', type: 'number', required: true, placeholder: '16', min: 8, max: 40, unit: 'breaths/min' },
        { name: 'weight', label: 'Weight', type: 'number', required: false, placeholder: '65', min: 1, max: 300, unit: 'kg' },
        { name: 'height', label: 'Height', type: 'number', required: false, placeholder: '165', min: 50, max: 250, unit: 'cm' },
      ],
    },
    {
      title: 'Chief Complaint',
      fields: [
        { name: 'chief_complaint', label: 'Chief Complaint', type: 'textarea', required: true, placeholder: 'Patient presents with...' },
        { name: 'duration', label: 'Duration of Symptoms', type: 'text', required: false, placeholder: '3 days' },
      ],
    },
    {
      title: 'Diagnosis',
      fields: [
        {
          name: 'diagnosis',
          label: 'Primary Diagnosis',
          type: 'text',
          required: true,
          placeholder: 'Enter primary diagnosis',
          helpText: 'Main condition or disease identified'
        },
        { name: 'secondary_diagnosis', label: 'Secondary Diagnosis', type: 'text', required: false, placeholder: 'Additional diagnoses (if any)' },
        {
          name: 'severity',
          label: 'Severity',
          type: 'select',
          required: true,
          options: [
            { value: 'mild', label: 'Mild' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'severe', label: 'Severe' },
            { value: 'critical', label: 'Critical' },
          ]
        },
      ],
    },
    {
      title: 'Treatment Plan',
      fields: [
        { name: 'prescription', label: 'Prescription', type: 'textarea', required: false, placeholder: 'Medications prescribed...' },
        { name: 'treatment_notes', label: 'Treatment Notes', type: 'textarea', required: false, placeholder: 'Additional treatment instructions...' },
        { name: 'follow_up_date', label: 'Follow-up Date', type: 'date', required: false },
        { name: 'follow_up_notes', label: 'Follow-up Notes', type: 'text', required: false, placeholder: 'Instructions for follow-up visit' },
      ],
    },
    {
      title: 'Additional Notes',
      fields: [
        { name: 'notes', label: 'Clinical Notes', type: 'textarea', required: false, placeholder: 'Any additional observations or notes...' },
      ],
    },
  ],
};

/**
 * Immunization Template
 * Used for vaccination records
 */
export const immunizationTemplate: MedicalRecordTemplate = {
  type: 'immunization',
  category: 'immunization',
  name: 'Immunization Record',
  description: 'Vaccination and immunization tracking',
  requiresEncryption: false,
  diseaseTypes: ['measles'], // For disease surveillance if vaccine fails
  sections: [
    {
      title: 'Patient Information',
      fields: [
        { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
        { name: 'patient_number', label: 'Patient Number', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true, unit: 'years' },
        { name: 'sex', label: 'Sex', type: 'text', required: true },
        { name: 'barangay', label: 'Barangay', type: 'text', required: true },
      ],
    },
    {
      title: 'Vaccine Information',
      fields: [
        {
          name: 'vaccine_type',
          label: 'Vaccine Type',
          type: 'select',
          required: true,
          options: [
            { value: 'bcg', label: 'BCG (Tuberculosis)' },
            { value: 'hepatitis_b', label: 'Hepatitis B' },
            { value: 'dpt', label: 'DPT (Diphtheria, Pertussis, Tetanus)' },
            { value: 'opv', label: 'OPV (Oral Polio Vaccine)' },
            { value: 'measles', label: 'Measles' },
            { value: 'mmr', label: 'MMR (Measles, Mumps, Rubella)' },
            { value: 'pneumococcal', label: 'Pneumococcal' },
            { value: 'rotavirus', label: 'Rotavirus' },
            { value: 'influenza', label: 'Influenza' },
            { value: 'covid19', label: 'COVID-19' },
            { value: 'hpv', label: 'HPV (Human Papillomavirus)' },
            { value: 'other', label: 'Other' },
          ]
        },
        { name: 'vaccine_name', label: 'Vaccine Brand/Name', type: 'text', required: true, placeholder: 'e.g., Pfizer, Moderna' },
        { name: 'batch_number', label: 'Batch/Lot Number', type: 'text', required: true, placeholder: 'Vaccine batch number' },
        { name: 'dose_number', label: 'Dose Number', type: 'number', required: true, placeholder: '1', min: 1, max: 10 },
        { name: 'total_doses', label: 'Total Doses Required', type: 'number', required: true, placeholder: '2', min: 1, max: 10 },
        { name: 'administration_date', label: 'Date Administered', type: 'date', required: true },
      ],
    },
    {
      title: 'Administration Details',
      fields: [
        {
          name: 'route',
          label: 'Route of Administration',
          type: 'select',
          required: true,
          options: [
            { value: 'intramuscular', label: 'Intramuscular (IM)' },
            { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
            { value: 'oral', label: 'Oral' },
            { value: 'intradermal', label: 'Intradermal (ID)' },
            { value: 'intranasal', label: 'Intranasal' },
          ]
        },
        { name: 'site', label: 'Injection Site', type: 'text', required: false, placeholder: 'e.g., Left deltoid' },
        { name: 'dosage', label: 'Dosage', type: 'text', required: false, placeholder: 'e.g., 0.5 mL' },
      ],
    },
    {
      title: 'Follow-up',
      fields: [
        { name: 'next_dose_date', label: 'Next Dose Due Date', type: 'date', required: false },
        { name: 'adverse_reactions', label: 'Adverse Reactions', type: 'textarea', required: false, placeholder: 'Any reactions or side effects observed...' },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false, placeholder: 'Any additional observations...' },
      ],
    },
  ],
};

/**
 * Prenatal Template
 * Used for pregnancy monitoring (ENCRYPTED)
 */
export const prenatalTemplate: MedicalRecordTemplate = {
  type: 'prenatal',
  category: 'pregnancy',
  name: 'Prenatal Care Record',
  description: 'Pregnancy monitoring and prenatal checkup',
  requiresEncryption: true,
  diseaseTypes: ['pregnancy_complications'],
  sections: [
    {
      title: 'Patient Information',
      fields: [
        { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
        { name: 'patient_number', label: 'Patient Number', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true, unit: 'years' },
        { name: 'sex', label: 'Sex', type: 'text', required: true },
        { name: 'barangay', label: 'Barangay', type: 'text', required: true },
      ],
    },
    {
      title: 'Pregnancy Information',
      fields: [
        { name: 'gestational_age', label: 'Gestational Age', type: 'text', required: true, placeholder: 'e.g., 12 weeks 3 days' },
        { name: 'lmp', label: 'Last Menstrual Period (LMP)', type: 'date', required: true },
        { name: 'edd', label: 'Estimated Due Date (EDD)', type: 'date', required: true },
        { name: 'gravida', label: 'Gravida (G)', type: 'number', required: true, placeholder: '1', min: 1, max: 20, helpText: 'Total number of pregnancies' },
        { name: 'para', label: 'Para (P)', type: 'number', required: true, placeholder: '0', min: 0, max: 20, helpText: 'Number of births after 20 weeks' },
      ],
    },
    {
      title: 'Vital Signs & Measurements',
      fields: [
        { name: 'blood_pressure', label: 'Blood Pressure', type: 'text', required: true, placeholder: '110/70' },
        { name: 'weight', label: 'Weight', type: 'number', required: true, placeholder: '60', unit: 'kg' },
        { name: 'fundal_height', label: 'Fundal Height', type: 'number', required: false, placeholder: '24', unit: 'cm' },
        { name: 'fetal_heart_rate', label: 'Fetal Heart Rate', type: 'number', required: false, placeholder: '140', min: 110, max: 160, unit: 'bpm' },
      ],
    },
    {
      title: 'Physical Examination',
      fields: [
        { name: 'fetal_position', label: 'Fetal Position', type: 'text', required: false, placeholder: 'e.g., Cephalic' },
        { name: 'edema', label: 'Edema', type: 'select', required: false, options: [
          { value: 'none', label: 'None' },
          { value: 'mild', label: 'Mild' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'severe', label: 'Severe' },
        ]},
        { name: 'urine_protein', label: 'Urine Protein', type: 'text', required: false, placeholder: 'Negative' },
        { name: 'urine_sugar', label: 'Urine Sugar', type: 'text', required: false, placeholder: 'Negative' },
      ],
    },
    {
      title: 'Risk Assessment',
      fields: [
        {
          name: 'risk_level',
          label: 'Risk Level',
          type: 'select',
          required: true,
          options: [
            { value: 'low', label: 'Low Risk' },
            { value: 'moderate', label: 'Moderate Risk' },
            { value: 'high', label: 'High Risk' },
          ]
        },
        { name: 'complications', label: 'Complications/Concerns', type: 'textarea', required: false, placeholder: 'Any complications or concerns identified...' },
      ],
    },
    {
      title: 'Treatment & Follow-up',
      fields: [
        { name: 'supplements', label: 'Supplements Prescribed', type: 'textarea', required: false, placeholder: 'e.g., Folic acid, Iron supplements' },
        { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: false, placeholder: 'Diet, exercise, lifestyle recommendations...' },
        { name: 'next_visit_date', label: 'Next Visit Date', type: 'date', required: false },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
      ],
    },
  ],
};

/**
 * HIV Template
 * Used for HIV/AIDS monitoring (ENCRYPTED)
 */
export const hivTemplate: MedicalRecordTemplate = {
  type: 'hiv',
  category: 'hiv',
  name: 'HIV/AIDS Monitoring',
  description: 'HIV/AIDS diagnosis and treatment monitoring',
  requiresEncryption: true,
  diseaseTypes: ['hiv_aids'],
  sections: [
    {
      title: 'Patient Information',
      fields: [
        { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
        { name: 'patient_number', label: 'Patient Number', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true, unit: 'years' },
        { name: 'sex', label: 'Sex', type: 'text', required: true },
        { name: 'barangay', label: 'Barangay', type: 'text', required: true },
      ],
    },
    {
      title: 'HIV Status',
      fields: [
        {
          name: 'test_type',
          label: 'Test Type',
          type: 'select',
          required: true,
          options: [
            { value: 'screening', label: 'Screening Test' },
            { value: 'confirmatory', label: 'Confirmatory Test' },
            { value: 'viral_load', label: 'Viral Load' },
            { value: 'cd4_count', label: 'CD4 Count' },
            { value: 'follow_up', label: 'Follow-up Monitoring' },
          ]
        },
        { name: 'test_date', label: 'Test Date', type: 'date', required: true },
        {
          name: 'test_result',
          label: 'Test Result',
          type: 'select',
          required: true,
          options: [
            { value: 'positive', label: 'Positive' },
            { value: 'negative', label: 'Negative' },
            { value: 'indeterminate', label: 'Indeterminate' },
          ]
        },
      ],
    },
    {
      title: 'Clinical Assessment',
      fields: [
        { name: 'cd4_count', label: 'CD4 Count', type: 'number', required: false, placeholder: '500', min: 0, max: 2000, unit: 'cells/mm³' },
        { name: 'viral_load', label: 'Viral Load', type: 'text', required: false, placeholder: 'e.g., Undetectable or <50 copies/mL' },
        {
          name: 'who_stage',
          label: 'WHO Clinical Stage',
          type: 'select',
          required: false,
          options: [
            { value: 'stage_1', label: 'Stage 1 - Asymptomatic' },
            { value: 'stage_2', label: 'Stage 2 - Mild Symptoms' },
            { value: 'stage_3', label: 'Stage 3 - Advanced Disease' },
            { value: 'stage_4', label: 'Stage 4 - Severe Disease (AIDS)' },
          ]
        },
      ],
    },
    {
      title: 'Treatment',
      fields: [
        {
          name: 'treatment_status',
          label: 'Treatment Status',
          type: 'select',
          required: true,
          options: [
            { value: 'not_started', label: 'Not Yet Started' },
            { value: 'on_art', label: 'On Antiretroviral Therapy (ART)' },
            { value: 'treatment_interrupted', label: 'Treatment Interrupted' },
            { value: 'treatment_failed', label: 'Treatment Failed' },
          ]
        },
        { name: 'art_regimen', label: 'ART Regimen', type: 'textarea', required: false, placeholder: 'Antiretroviral medications and dosages...' },
        { name: 'adherence', label: 'Adherence Level', type: 'select', required: false, options: [
          { value: 'excellent', label: 'Excellent (>95%)' },
          { value: 'good', label: 'Good (85-95%)' },
          { value: 'fair', label: 'Fair (70-84%)' },
          { value: 'poor', label: 'Poor (<70%)' },
        ]},
        { name: 'side_effects', label: 'Side Effects', type: 'textarea', required: false, placeholder: 'Any side effects from medications...' },
      ],
    },
    {
      title: 'Follow-up',
      fields: [
        { name: 'next_visit_date', label: 'Next Visit Date', type: 'date', required: false },
        { name: 'next_lab_date', label: 'Next Lab Test Date', type: 'date', required: false },
        { name: 'counseling_notes', label: 'Counseling Notes', type: 'textarea', required: false, placeholder: 'Psychosocial support and counseling provided...' },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
      ],
    },
  ],
};

/**
 * Laboratory Template
 * Used for lab test results
 */
export const laboratoryTemplate: MedicalRecordTemplate = {
  type: 'laboratory',
  category: 'laboratory',
  name: 'Laboratory Results',
  description: 'Medical laboratory test results',
  requiresEncryption: false,
  sections: [
    {
      title: 'Patient Information',
      fields: [
        { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
        { name: 'patient_number', label: 'Patient Number', type: 'text', required: true },
        { name: 'age', label: 'Age', type: 'number', required: true, unit: 'years' },
        { name: 'sex', label: 'Sex', type: 'text', required: true },
        { name: 'barangay', label: 'Barangay', type: 'text', required: true },
      ],
    },
    {
      title: 'Test Information',
      fields: [
        {
          name: 'test_category',
          label: 'Test Category',
          type: 'select',
          required: true,
          options: [
            { value: 'hematology', label: 'Hematology (Blood Tests)' },
            { value: 'chemistry', label: 'Clinical Chemistry' },
            { value: 'microbiology', label: 'Microbiology' },
            { value: 'serology', label: 'Serology/Immunology' },
            { value: 'urinalysis', label: 'Urinalysis' },
            { value: 'imaging', label: 'Imaging/Radiology' },
            { value: 'other', label: 'Other' },
          ]
        },
        { name: 'test_name', label: 'Test Name', type: 'text', required: true, placeholder: 'e.g., Complete Blood Count (CBC)' },
        { name: 'test_date', label: 'Test Date', type: 'date', required: true },
        { name: 'specimen_type', label: 'Specimen Type', type: 'text', required: false, placeholder: 'e.g., Blood, Urine, Sputum' },
      ],
    },
    {
      title: 'Results',
      fields: [
        { name: 'results', label: 'Test Results', type: 'textarea', required: true, placeholder: 'Enter detailed test results...\n\nExample:\nWBC: 7.5 x10^9/L (Normal: 4.0-11.0)\nRBC: 4.8 x10^12/L (Normal: 4.5-5.5)\nHemoglobin: 140 g/L (Normal: 130-170)' },
        {
          name: 'interpretation',
          label: 'Interpretation',
          type: 'select',
          required: true,
          options: [
            { value: 'normal', label: 'Normal/Within Normal Limits' },
            { value: 'abnormal', label: 'Abnormal' },
            { value: 'critical', label: 'Critical' },
            { value: 'pending', label: 'Pending Further Tests' },
          ]
        },
      ],
    },
    {
      title: 'Clinical Correlation',
      fields: [
        { name: 'clinical_notes', label: 'Clinical Notes', type: 'textarea', required: false, placeholder: 'Clinical interpretation and correlation with symptoms...' },
        { name: 'recommendations', label: 'Recommendations', type: 'textarea', required: false, placeholder: 'Recommended follow-up tests or actions...' },
        { name: 'notes', label: 'Additional Notes', type: 'textarea', required: false },
      ],
    },
  ],
};

/**
 * Template Registry
 * Maps template types to their definitions
 */
export const medicalRecordTemplates: Record<TemplateType, MedicalRecordTemplate> = {
  general_checkup: generalCheckupTemplate,
  immunization: immunizationTemplate,
  prenatal: prenatalTemplate,
  hiv: hivTemplate,
  laboratory: laboratoryTemplate,
};

/**
 * Get template by type
 */
export function getTemplate(type: TemplateType): MedicalRecordTemplate | undefined {
  return medicalRecordTemplates[type];
}

/**
 * Get all template types
 */
export function getAllTemplateTypes(): TemplateType[] {
  return Object.keys(medicalRecordTemplates) as TemplateType[];
}

/**
 * Check if template requires encryption
 */
export function requiresEncryption(type: TemplateType): boolean {
  const template = medicalRecordTemplates[type];
  return template?.requiresEncryption ?? false;
}
