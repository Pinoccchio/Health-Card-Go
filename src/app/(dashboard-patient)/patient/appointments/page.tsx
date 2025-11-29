'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ClipboardList } from 'lucide-react';

export default function PatientAppointmentsPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Appointments"
      pageDescription="View and manage your appointments"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              My Appointments
            </h2>
            <p className="text-gray-600">
              This page will display your upcoming, completed, and cancelled
              appointments with queue numbers.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
