'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Users } from 'lucide-react';

export default function AdminPatientsPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Patients"
      pageDescription="Manage all patient accounts and registrations"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Patient Management
            </h2>
            <p className="text-gray-600">
              This page will display all patients with approval status, search
              functionality, and bulk actions.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
