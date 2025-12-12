import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthCard } from '@/components/auth';

export default function TermsPage() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-full max-w-4xl">
        <AuthCard
          title="Terms and Conditions"
          subtitle="Last Updated: January 2025"
        >
          <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
            {/* Back to Register Link */}
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-primary-teal hover:text-primary-teal-dark transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Registration
            </Link>

            {/* 1. Acceptance of Terms */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using the HealthCard Healthcare Appointment Management
                and Disease Surveillance System ("the System"), operated by the City
                Health Office of Panabo City, Davao del Norte, Philippines, you agree
                to comply with and be bound by these Terms and Conditions. If you do
                not agree with these terms, please do not use the System.
              </p>
            </section>

            {/* 2. User Roles and Responsibilities */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. User Roles and Responsibilities
              </h2>
              <p className="mb-3">
                The System supports four distinct user roles, each with specific
                responsibilities:
              </p>

              <h3 className="text-lg font-medium text-gray-800 mb-2">
                2.1 Patients
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Must provide accurate and complete registration information</li>
                <li>
                  Account requires approval before accessing full system features
                </li>
                <li>
                  Responsible for maintaining confidentiality of account credentials
                </li>
                <li>Must book appointments at least 7 days in advance</li>
                <li>Limited to one active appointment at a time</li>
                <li>Must cancel appointments at least 24 hours before scheduled time</li>
                <li>Required to provide feedback after appointments</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">
                2.2 Healthcare Administrators
              </h3>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>Must be authorized by the City Health Office</li>
                <li>Assigned to specific categories (healthcard, HIV, pregnancy, general admin, laboratory)</li>
                <li>Responsible for accurate patient registration approval/rejection</li>
                <li>Must maintain patient confidentiality at all times</li>
                <li>Required to handle sensitive medical data according to privacy regulations</li>
              </ul>

              <h3 className="text-lg font-medium text-gray-800 mb-2">
                2.3 Super Administrators
              </h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full system access and management responsibilities</li>
                <li>User account creation and management for Healthcare Admins</li>
                <li>System configuration and security oversight</li>
              </ul>
            </section>

            {/* 3. Appointment Booking Rules */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. Appointment Booking Rules
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Lead Time:</strong> Appointments must be booked at least 7
                  days in advance
                </li>
                <li>
                  <strong>Capacity:</strong> Maximum 100 appointments per day, limited
                  to 30-minute time slots
                </li>
                <li>
                  <strong>Operating Hours:</strong> Monday to Friday, 8:00 AM - 5:00 PM
                </li>
                <li>
                  <strong>One Active Appointment:</strong> Patients may only have one
                  active appointment at any time
                </li>
                <li>
                  <strong>Cancellation Policy:</strong> Cancellations must be made at
                  least 24 hours before the scheduled appointment
                </li>
                <li>
                  <strong>No-Show Policy:</strong> Repeated no-shows may result in
                  account restrictions
                </li>
                <li>
                  <strong>Queue Management:</strong> Appointment numbers are assigned
                  sequentially and may be adjusted if earlier appointments are cancelled
                </li>
              </ul>
            </section>

            {/* 4. Medical Records and Data Usage */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Medical Records and Data Usage
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  All medical records are stored securely and encrypted where required
                  (HIV and pregnancy records)
                </li>
                <li>
                  Medical data may be used for disease surveillance and public health
                  analytics
                </li>
                <li>
                  Patient data is aggregated and anonymized for disease tracking and
                  predictive analytics
                </li>
                <li>
                  Personal health information is protected under the Data Privacy Act of
                  2012 (Republic Act No. 10173)
                </li>
                <li>
                  Access to medical records is restricted based on user role and
                  Healthcare Administrator category
                </li>
              </ul>
            </section>

            {/* 5. Digital Health Card */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. Digital Health Card
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Digital health cards with QR codes are generated upon patient approval
                </li>
                <li>
                  Health cards contain encrypted patient identification and emergency
                  contact information
                </li>
                <li>Patients are responsible for protecting their health card QR code</li>
                <li>
                  Lost or compromised health cards should be reported immediately to the
                  City Health Office
                </li>
                <li>Health cards are for personal use only and may not be shared</li>
              </ul>
            </section>

            {/* 6. Disease Surveillance */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                6. Disease Surveillance and Public Health
              </h2>
              <p>
                The System collects and analyzes disease data for public health
                purposes. By using the System, you acknowledge and consent to:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  Automated logging of disease cases linked to diagnoses (HIV/AIDS,
                  Dengue, Malaria, Measles, Rabies, Pregnancy-related complications)
                </li>
                <li>
                  Aggregation of disease data by barangay for heatmap visualization
                </li>
                <li>
                  Use of historical data for predictive analytics using SARIMA models
                </li>
                <li>
                  Sharing of aggregated, anonymized data with public health authorities
                </li>
              </ul>
            </section>

            {/* 7. Account Termination */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                7. Account Termination
              </h2>
              <p>
                The City Health Office reserves the right to suspend or terminate
                accounts that:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Violate these Terms and Conditions</li>
                <li>Provide false or misleading information</li>
                <li>Abuse the appointment booking system</li>
                <li>Repeatedly miss scheduled appointments without notice</li>
                <li>Engage in inappropriate conduct toward healthcare staff</li>
                <li>Compromise system security or other users' privacy</li>
              </ul>
            </section>

            {/* 8. Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                8. Limitation of Liability
              </h2>
              <p>
                The City Health Office provides the System "as is" and makes no
                warranties regarding:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  Uninterrupted or error-free operation of the System
                </li>
                <li>Accuracy of predictive analytics or disease surveillance data</li>
                <li>
                  Availability of appointments at specific times
                </li>
                <li>
                  Medical outcomes or quality of care received
                </li>
              </ul>
              <p className="mt-3">
                The System is a tool for appointment management and does not replace
                professional medical judgment or emergency healthcare services.
              </p>
            </section>

            {/* 9. Emergency Situations */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                9. Emergency Situations
              </h2>
              <p className="font-semibold text-gray-900">
                This System is NOT for medical emergencies.
              </p>
              <p className="mt-2">
                In case of medical emergency, please contact emergency services
                immediately or visit the nearest emergency room. Do not rely on the
                appointment booking system for urgent medical care.
              </p>
            </section>

            {/* 10. Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                10. Changes to Terms
              </h2>
              <p>
                The City Health Office reserves the right to modify these Terms and
                Conditions at any time. Users will be notified of significant changes
                via email or system notification. Continued use of the System after
                changes constitutes acceptance of the modified terms.
              </p>
            </section>

            {/* 11. Governing Law */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                11. Governing Law
              </h2>
              <p>
                These Terms and Conditions are governed by the laws of the Republic of
                the Philippines. Any disputes arising from the use of this System shall
                be subject to the exclusive jurisdiction of the courts of Panabo City,
                Davao del Norte, Philippines.
              </p>
            </section>

            {/* Contact Information */}
            <section className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Contact Information
              </h2>
              <p>
                For questions regarding these Terms and Conditions, please contact:
              </p>
              <p className="mt-2">
                <strong>City Health Office</strong>
                <br />
                Panabo City, Davao del Norte, Philippines
                <br />
                Email:{' '}
                <a
                  href="mailto:healthoffice@panabocity.gov.ph"
                  className="text-primary-teal hover:underline"
                >
                  healthoffice@panabocity.gov.ph
                </a>
              </p>
            </section>

            {/* Back to Register Link - Bottom */}
            <div className="pt-6 border-t border-gray-200">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-primary-teal hover:text-primary-teal-dark transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Registration
              </Link>
            </div>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
