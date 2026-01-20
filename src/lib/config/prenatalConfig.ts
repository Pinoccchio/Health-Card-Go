/**
 * Prenatal Checkup Service Configuration
 *
 * This file contains detailed information about prenatal checkup services
 * for expecting mothers at the City Health Office of Panabo City.
 */

export interface PrenatalServiceInfo {
  title: string;
  overview: string;
  targetAudience: string;
  schedule: {
    day: string;
    displayText: string;
  };
  isFree: boolean;
  whatToExpect: string[];
  requirements: string[];
  recommendedTests: string[];
  philHealthCoverage: string;
  importantNotes: string[];
  emergencyGuidance: string;
}

/**
 * Comprehensive Prenatal Checkup Service Information
 */
export const PRENATAL_SERVICE: PrenatalServiceInfo = {
  title: 'Prenatal Checkup (Free)',
  overview: 'Free prenatal consultation and checkup services for expecting mothers to monitor the health and development of both mother and child throughout pregnancy. Our experienced healthcare team provides comprehensive maternal care to ensure a safe and healthy pregnancy journey.',
  targetAudience: 'All pregnant women residing in Panabo City and nearby areas, from confirmation of pregnancy through delivery. First-time mothers and high-risk pregnancies are especially encouraged to attend regular checkups.',

  schedule: {
    day: 'Tuesday',
    displayText: 'Prenatal checkups are conducted every Tuesday during clinic hours (8:00 AM - 5:00 PM). Walk-in patients are welcome, but appointments are recommended to reduce waiting time.',
  },

  isFree: true,

  whatToExpect: [
    'Initial consultation and pregnancy confirmation',
    'Comprehensive medical history review and risk assessment',
    'Physical examination including blood pressure, weight, and fundal height measurement',
    'Fetal heart rate monitoring (after 12 weeks)',
    'Prenatal vitamins and supplements prescription',
    'Nutritional counseling and dietary recommendations',
    'Education on pregnancy milestones, warning signs, and self-care',
    'Tetanus toxoid immunization (if needed)',
    'Laboratory test coordination and referrals',
    'Birth planning and delivery preparation counseling',
  ],

  requirements: [
    'Valid government-issued ID (GSIS, SSS, Passport, Driver\'s License, or Postal ID)',
    'Proof of pregnancy (ultrasound result, positive pregnancy test, or medical certificate)',
    'PhilHealth membership card or number (if available - for hospital delivery coverage)',
    'Previous obstetric-gynecologic records (if this is not your first pregnancy)',
    'OB-GYN referral letter (if referred from another health facility)',
    'Barangay Health Center records (if you\'ve had prior consultations)',
  ],

  recommendedTests: [
    'Complete Blood Count (CBC) - to check for anemia',
    'Urinalysis - to screen for urinary tract infections',
    'Blood type and Rh factor - important for delivery planning',
    'Hepatitis B screening - to prevent transmission to baby',
    'Syphilis (RPR/VDRL) screening - part of routine prenatal screening',
    'HIV screening - recommended for all pregnant women',
    'Blood sugar test - to screen for gestational diabetes',
    'Ultrasound - to monitor fetal development (typically done in 2nd trimester)',
  ],

  philHealthCoverage: 'PhilHealth covers prenatal consultations, laboratory tests, and delivery expenses. Pregnant women are encouraged to register their pregnancy with PhilHealth to avail of the Maternity Care Package (MCP), which includes prenatal checkups, delivery, and newborn care.',

  importantNotes: [
    'All prenatal checkup services are completely free at CHO',
    'Regular checkups are recommended: monthly visits until 28 weeks, bi-weekly until 36 weeks, then weekly until delivery',
    'Bring your prenatal record booklet (will be provided on first visit) to all checkups',
    'Laboratory tests may incur minimal fees if done at CHO or can be done at any accredited facility',
    'First prenatal visit should ideally occur within the first trimester (12 weeks)',
    'High-risk pregnancies (multiple births, previous complications, chronic conditions) require more frequent monitoring',
    'Prenatal vitamins (iron and folic acid) are provided free of charge',
    'Tetanus toxoid immunization is required during pregnancy to protect both mother and baby',
    'Pregnant women are prioritized in the queue to minimize waiting time',
    'Referrals to hospital OB-GYN specialists are provided for high-risk cases or complications',
  ],

  emergencyGuidance: 'Seek immediate medical attention at the emergency room if you experience: severe abdominal pain, heavy bleeding, severe headache with vision changes, sudden swelling of face/hands/feet, decreased fetal movement, leaking of fluid, or contractions before 37 weeks.',
};

/**
 * Get Prenatal service information
 */
export function getPrenatalInfo(): PrenatalServiceInfo {
  return PRENATAL_SERVICE;
}
