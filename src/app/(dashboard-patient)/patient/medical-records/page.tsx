'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FileText } from 'lucide-react';

export default function PatientMedicalRecordsPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Medical Records"
      pageDescription="View your medical history"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              My Medical Records
            </h2>
            <p className="text-gray-600">
              This page will display your complete medical history including
              diagnoses, treatments, and doctor notes.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
