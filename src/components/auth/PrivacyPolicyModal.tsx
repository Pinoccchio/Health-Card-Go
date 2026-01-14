'use client';

import { Modal } from '@/components/ui';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy"
      size="lg"
    >
      <div className="space-y-6 pb-6">
        <p className="text-sm text-gray-500">Last Updated: January 2025</p>

        {/* Introduction */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Introduction
          </h2>
          <p>
            The City Health Office of Panabo City, Davao del Norte, Philippines
            ("we," "our," or "us") is committed to protecting the privacy and
            security of your personal information. This Privacy Policy explains how
            we collect, use, disclose, and safeguard your information when you use
            the HealthCard Healthcare Appointment Management and Disease
            Surveillance System ("the System").
          </p>
          <p className="mt-3">
            This Policy complies with the Data Privacy Act of 2012 (Republic Act
            No. 10173) and its implementing rules and regulations, as well as
            international best practices for healthcare data protection.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            1. Information We Collect
          </h2>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            1.1 Personal Information
          </h3>
          <p className="mb-2">
            We collect the following personal information when you register:
          </p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Full name (first name, last name)</li>
            <li>Email address</li>
            <li>Password (encrypted and securely stored)</li>
            <li>User role (Patient, Healthcare Administrator, Super Administrator)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            1.2 Patient-Specific Information
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Barangay (residential area)</li>
            <li>Date of birth</li>
            <li>Gender</li>
            <li>Contact number</li>
            <li>Emergency contact information</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            1.3 Healthcare Professional Information
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Admin category (for Healthcare Administrators)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            1.4 Protected Health Information (PHI)
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Medical history and diagnoses</li>
            <li>Treatment records and prescriptions</li>
            <li>Laboratory test results</li>
            <li>Appointment history</li>
            <li>
              Sensitive health information (HIV status, pregnancy records) -
              encrypted at rest and in transit
            </li>
            <li>Immunization records</li>
            <li>Health card QR code data</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            1.5 Usage Data
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Login timestamps and session duration</li>
            <li>IP addresses and device information</li>
            <li>System interaction logs</li>
            <li>Appointment booking and modification history</li>
            <li>Feedback and ratings submitted</li>
          </ul>
        </section>

        {/* 2. How We Use Your Information */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            2. How We Use Your Information
          </h2>
          <p className="mb-2">
            We use your information for the following purposes:
          </p>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            2.1 Healthcare Services
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Processing appointment bookings and managing healthcare queues</li>
            <li>Maintaining accurate medical records</li>
            <li>Generating and managing digital health cards with QR codes</li>
            <li>Facilitating communication between patients and healthcare providers</li>
            <li>Providing appointment reminders and notifications</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            2.2 Public Health and Disease Surveillance
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>
              Tracking and monitoring disease cases (HIV/AIDS, Dengue, Malaria,
              Measles, Rabies, Pregnancy complications)
            </li>
            <li>Creating disease heatmaps by barangay for public health planning</li>
            <li>
              Generating predictive analytics using SARIMA models for disease
              outbreak forecasting
            </li>
            <li>Producing aggregated public health reports and statistics</li>
            <li>
              Supporting evidence-based healthcare policy and resource allocation
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            2.3 System Administration
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>User authentication and account management</li>
            <li>System security monitoring and fraud prevention</li>
            <li>Technical support and troubleshooting</li>
            <li>System performance optimization</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            2.4 Legal and Compliance
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Complying with legal obligations and regulatory requirements</li>
            <li>Responding to lawful requests from government authorities</li>
            <li>Protecting our legal rights and preventing fraud</li>
            <li>Audit and compliance monitoring</li>
          </ul>
        </section>

        {/* 3. How We Share Your Information */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            3. How We Share Your Information
          </h2>
          <p className="mb-2">
            We do not sell, rent, or trade your personal information. We may share
            your information only in the following circumstances:
          </p>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            3.1 Within the Healthcare System
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>
              With Healthcare Administrators based on their category permissions
              (healthcard, HIV, pregnancy, general, laboratory)
            </li>
            <li>
              With Super Administrators for system management and oversight
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            3.2 Public Health Authorities
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>
              Aggregated, de-identified disease surveillance data with the
              Department of Health (DOH)
            </li>
            <li>
              Required reporting of notifiable diseases as mandated by law
            </li>
            <li>
              Public health research with proper anonymization and ethical approval
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            3.3 Legal Requirements
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>When required by court order or legal process</li>
            <li>To comply with applicable laws and regulations</li>
            <li>
              To protect the rights, property, or safety of the City Health Office,
              our users, or the public
            </li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            3.4 Service Providers
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              With trusted third-party service providers who assist in system
              operations (hosting, database management, email services)
            </li>
            <li>
              All service providers are bound by strict confidentiality agreements
              and data protection requirements
            </li>
          </ul>
        </section>

        {/* 4. Data Security */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            4. Data Security
          </h2>
          <p className="mb-2">
            We implement comprehensive security measures to protect your information:
          </p>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            4.1 Technical Safeguards
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>End-to-end encryption for all data transmission (HTTPS/TLS)</li>
            <li>
              Strong encryption at rest for sensitive medical records (HIV,
              pregnancy data)
            </li>
            <li>Secure password hashing using industry-standard algorithms</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Multi-factor authentication for administrative accounts</li>
            <li>Database encryption and access controls</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            4.2 Administrative Safeguards
          </h3>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>
              Role-based access control (RBAC) limiting data access by user role
            </li>
            <li>Comprehensive audit logging of all data access and modifications</li>
            <li>
              Staff training on data privacy and security best practices
            </li>
            <li>Incident response plan for data breaches</li>
            <li>Regular privacy and security compliance reviews</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-800 mb-2">
            4.3 Session Security
          </h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Automatic session timeout after 15 minutes of inactivity</li>
            <li>Secure session management to prevent hijacking</li>
            <li>Protection against common web vulnerabilities (XSS, CSRF, SQL injection)</li>
          </ul>
        </section>

        {/* 5. Your Privacy Rights */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            5. Your Privacy Rights
          </h2>
          <p className="mb-2">
            Under the Data Privacy Act of 2012, you have the following rights:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Right to Access:</strong> Request copies of your personal and
              medical information
            </li>
            <li>
              <strong>Right to Correction:</strong> Request correction of inaccurate
              or incomplete data
            </li>
            <li>
              <strong>Right to Object:</strong> Object to processing of your data
              for specific purposes (except when required by law)
            </li>
            <li>
              <strong>Right to Erasure:</strong> Request deletion of your data
              (subject to legal retention requirements)
            </li>
            <li>
              <strong>Right to Data Portability:</strong> Receive your data in a
              structured, commonly used format
            </li>
            <li>
              <strong>Right to File a Complaint:</strong> Lodge a complaint with the
              National Privacy Commission if you believe your rights have been violated
            </li>
            <li>
              <strong>Right to Be Informed:</strong> Be informed about how your data
              is collected and used
            </li>
          </ul>
          <p className="mt-3">
            To exercise these rights, please contact our Data Protection Officer at
            the contact information provided below.
          </p>
        </section>

        {/* 6. Data Retention */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            6. Data Retention
          </h2>
          <p className="mb-2">
            We retain your information for as long as necessary to fulfill the
            purposes outlined in this Privacy Policy and to comply with legal
            obligations:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Active Accounts:</strong> Data retained while your account is
              active
            </li>
            <li>
              <strong>Medical Records:</strong> Retained for a minimum of 10 years
              as required by Philippine healthcare regulations
            </li>
            <li>
              <strong>Audit Logs:</strong> Retained for 7 years for compliance and
              security purposes
            </li>
            <li>
              <strong>Disease Surveillance Data:</strong> Aggregated data retained
              indefinitely for public health research (de-identified)
            </li>
            <li>
              <strong>Deleted Accounts:</strong> Personal data anonymized or deleted
              within 90 days, except where retention is legally required
            </li>
          </ul>
        </section>

        {/* 7. Cookies and Tracking */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            7. Cookies and Tracking Technologies
          </h2>
          <p className="mb-2">
            The System uses cookies and similar technologies to:
          </p>
          <ul className="list-disc pl-6 space-y-1 mb-3">
            <li>Maintain user sessions and authentication</li>
            <li>Remember user preferences and settings</li>
            <li>Analyze system usage and improve performance</li>
            <li>Prevent fraudulent activity and enhance security</li>
          </ul>
          <p>
            We use only essential and functional cookies. You can control cookie
            settings through your browser, but disabling cookies may limit system
            functionality.
          </p>
        </section>

        {/* 8. Children's Privacy */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            8. Children's Privacy
          </h2>
          <p>
            The System is used to provide healthcare services to individuals of all
            ages, including minors. For patient accounts of minors (under 18 years),
            parental or guardian consent is required during registration. Parents and
            guardians have the right to access and manage their children's health
            information through the System.
          </p>
        </section>

        {/* 9. Third-Party Links */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            9. Third-Party Links
          </h2>
          <p>
            The System may contain links to third-party websites or services. We are
            not responsible for the privacy practices of these external sites. We
            encourage you to review the privacy policies of any third-party services
            you access.
          </p>
        </section>

        {/* 10. Changes to Privacy Policy */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            10. Changes to This Privacy Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in
            our practices, technology, or legal requirements. We will notify you of
            significant changes via email or prominent notice within the System. The
            "Last Updated" date at the top of this page indicates when the policy was
            last revised.
          </p>
          <p className="mt-3">
            Your continued use of the System after changes to this Privacy Policy
            constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* 11. International Data Transfers */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            11. International Data Transfers
          </h2>
          <p>
            Your data is primarily stored and processed within the Philippines. If
            data is transferred internationally (e.g., to cloud service providers), we
            ensure appropriate safeguards are in place, including:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Standard contractual clauses approved by regulatory authorities</li>
            <li>Adequate data protection measures equivalent to Philippine standards</li>
            <li>Compliance with cross-border data transfer requirements under the Data Privacy Act</li>
          </ul>
        </section>

        {/* Contact Information */}
        <section className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Contact Our Data Protection Officer
          </h2>
          <p className="mb-3">
            If you have questions about this Privacy Policy or wish to exercise your
            privacy rights, please contact:
          </p>
          <p>
            <strong>Data Protection Officer</strong>
            <br />
            City Health Office
            <br />
            Panabo City, Davao del Norte, Philippines
            <br />
            Email:{' '}
            <a
              href="mailto:dpo@panabocity.gov.ph"
              className="text-primary-teal hover:underline"
            >
              dpo@panabocity.gov.ph
            </a>
            <br />
            Privacy Hotline: [To be provided]
          </p>
          <p className="mt-3 text-sm">
            <strong>National Privacy Commission:</strong>
            <br />
            For complaints or concerns about data privacy violations, you may contact
            the National Privacy Commission at{' '}
            <a
              href="https://privacy.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-teal hover:underline"
            >
              privacy.gov.ph
            </a>
          </p>
        </section>
      </div>
    </Modal>
  );
}
