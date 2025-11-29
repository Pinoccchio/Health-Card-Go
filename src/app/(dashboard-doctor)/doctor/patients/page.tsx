'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Users } from 'lucide-react';

export default function DoctorPatientsPage() {
  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Patients"
      pageDescription="Access patient records"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Patient Records Access
            </h2>
            <p className="text-gray-600">
              This page will allow you to search and access all patient records,
              including QR code scanning for quick lookup.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
