/**
 * HIV Testing & Counseling Service Configuration
 *
 * This file contains detailed information about HIV testing and counseling services
 * offered at the City Health Office of Panabo City.
 */

export interface HIVTestingServiceInfo {
  title: string;
  overview: string;
  confidentialityAssurance: string;
  schedule: {
    days: string[];
    displayText: string;
  };
  isFree: boolean;
  process: string[];
  requirements: string[];
  eligibility: {
    minAge: number;
    minorConsent: string;
  };
  resultsTimeline: string;
  importantNotes: string[];
}

/**
 * Comprehensive HIV Testing & Counseling Service Information
 */
export const HIV_TESTING_SERVICE: HIVTestingServiceInfo = {
  title: 'HIV Testing & Counseling',
  overview: 'Free and confidential HIV testing and counseling services provided by the City Health Office of Panabo City. We offer a safe, judgment-free environment where you can learn about HIV risks, get tested, and receive professional counseling and support.',
  confidentialityAssurance: 'All HIV testing and counseling services are strictly confidential. Your privacy is our priority. Test results and personal information are protected under Philippine law (RA 11166 - Philippine HIV and AIDS Policy Act). No information will be shared without your written consent.',

  schedule: {
    days: ['Monday', 'Wednesday', 'Friday'],
    displayText: 'Available every Monday, Wednesday, and Friday during regular clinic hours (8:00 AM - 5:00 PM)',
  },

  isFree: true,

  process: [
    'Register at the front desk and request HIV testing and counseling',
    'Complete the informed consent form and confidentiality agreement',
    'Attend mandatory pre-test counseling session (15-30 minutes)',
    'Undergo HIV rapid test (blood sample collection - results in 15-20 minutes)',
    'Receive post-test counseling based on test results',
    'If reactive (positive), receive referral for confirmatory testing and treatment',
    'If non-reactive (negative), receive prevention education and follow-up recommendations',
    'Collect certificate of completion (if needed for specific purposes)',
  ],

  requirements: [
    'Valid government-issued ID (for registration purposes only)',
    'Age 18 years or older (or parental/guardian consent if 16-17 years old)',
    'Completion of informed consent form',
    'Willingness to participate in pre-test and post-test counseling',
    'Signed confidentiality agreement',
  ],

  eligibility: {
    minAge: 16,
    minorConsent: 'Individuals aged 16-17 can access testing with parental or guardian written consent. For individuals 15 years and below, parental consent is mandatory.',
  },

  resultsTimeline: 'HIV rapid test results are available within 15-20 minutes. Confirmatory testing (if needed) takes 1-2 weeks and will be coordinated by our medical team.',

  importantNotes: [
    'All services are completely free of charge',
    'Anonymity is respected - you may use a code name instead of your real name',
    'Pre-test counseling is mandatory to ensure informed decision-making',
    'Post-test counseling provides emotional support and next steps guidance',
    'Reactive (positive) results require confirmatory testing at a reference laboratory',
    'Treatment and care referrals are provided for confirmed positive results',
    'Partner notification and contact tracing services available (voluntary)',
    'Regular testing is recommended for individuals at high risk',
    'Window period: HIV may not be detected for 3-6 months after exposure',
    'Testing services are available to all residents of Panabo City and nearby areas',
  ],
};

/**
 * Get HIV Testing service information
 */
export function getHIVTestingInfo(): HIVTestingServiceInfo {
  return HIV_TESTING_SERVICE;
}
