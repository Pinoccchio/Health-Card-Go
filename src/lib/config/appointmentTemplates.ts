/**
 * Appointment Reason Templates
 *
 * Predefined reason templates for appointment booking.
 * Templates are organized by service category to provide
 * relevant options based on the selected service.
 */

export interface ReasonTemplate {
  value: string;
  label: string;
}

export const APPOINTMENT_REASON_TEMPLATES: Record<string, ReasonTemplate[]> = {
  healthcard: [
    { value: 'new_application', label: 'New health card application' },
    { value: 'renewal', label: 'Annual renewal' },
    { value: 'lost_card', label: 'Lost card replacement' },
    { value: 'card_update', label: 'Card update/correction' },
    { value: 'employment', label: 'Employment requirement' },
    { value: 'food_handler', label: 'Food handler certification' },
    { value: 'non_food_handler', label: 'Non-food handler certification' },
    { value: 'other', label: 'Other (please specify)' },
  ],

  hiv: [
    { value: 'routine_screening', label: 'Routine screening' },
    { value: 'pre_employment', label: 'Pre-employment testing' },
    { value: 'follow_up', label: 'Follow-up consultation' },
    { value: 'pre_test_counseling', label: 'Pre-test counseling' },
    { value: 'post_test_counseling', label: 'Post-test counseling' },
    { value: 'treatment_follow_up', label: 'Treatment follow-up' },
    { value: 'other', label: 'Other (please specify)' },
  ],

  pregnancy: [
    { value: 'first_prenatal', label: 'First prenatal checkup' },
    { value: 'regular_prenatal', label: 'Regular prenatal checkup' },
    { value: 'postnatal', label: 'Postnatal care' },
    { value: 'ultrasound', label: 'Ultrasound request' },
    { value: 'lab_tests', label: 'Laboratory tests' },
    { value: 'confirmation', label: 'Pregnancy confirmation' },
    { value: 'complication', label: 'Complication concern' },
    { value: 'other', label: 'Other (please specify)' },
  ],

  immunization: [
    { value: 'routine_immunization', label: 'Routine immunization' },
    { value: 'vaccine_catchup', label: 'Vaccine catch-up' },
    { value: 'travel_vaccination', label: 'Travel vaccination' },
    { value: 'flu_shot', label: 'Flu shot' },
    { value: 'hepatitis', label: 'Hepatitis vaccination' },
    { value: 'tetanus', label: 'Tetanus booster' },
    { value: 'covid', label: 'COVID-19 vaccination' },
    { value: 'other', label: 'Other (please specify)' },
  ],

  laboratory: [
    { value: 'cbc', label: 'Complete Blood Count (CBC)' },
    { value: 'urinalysis', label: 'Urinalysis' },
    { value: 'blood_sugar', label: 'Blood sugar test' },
    { value: 'cholesterol', label: 'Cholesterol screening' },
    { value: 'pregnancy_test', label: 'Pregnancy test' },
    { value: 'follow_up_test', label: 'Follow-up test' },
    { value: 'pre_employment', label: 'Pre-employment medical exam' },
    { value: 'other', label: 'Other (please specify)' },
  ],

  general: [
    { value: 'checkup', label: 'General checkup' },
    { value: 'medical_certificate', label: 'Medical certificate request' },
    { value: 'follow_up', label: 'Follow-up consultation' },
    { value: 'sick_visit', label: 'Sick visit' },
    { value: 'medication_refill', label: 'Medication refill' },
    { value: 'health_concern', label: 'Health concern' },
    { value: 'second_opinion', label: 'Second opinion' },
    { value: 'other', label: 'Other (please specify)' },
  ],
};

/**
 * Get reason templates for a specific service category
 * @param category - Service category (healthcard, hiv, pregnancy, immunization, laboratory, general)
 * @returns Array of reason templates
 */
export function getReasonTemplates(category: string | undefined | null): ReasonTemplate[] {
  if (!category) {
    return APPOINTMENT_REASON_TEMPLATES.general;
  }

  // Normalize category name to handle different formats
  const normalizedCategory = category.toLowerCase().replace(/[_-]/g, '');

  // Map category variations to template keys
  const categoryMap: Record<string, string> = {
    healthcard: 'healthcard',
    hiv: 'hiv',
    hivtesting: 'hiv',
    pregnancy: 'pregnancy',
    pregnancycare: 'pregnancy',
    immunization: 'immunization',
    vaccination: 'immunization',
    laboratory: 'laboratory',
    lab: 'laboratory',
    general: 'general',
    generaladmin: 'general',
  };

  const templateKey = categoryMap[normalizedCategory] || 'general';
  return APPOINTMENT_REASON_TEMPLATES[templateKey];
}
