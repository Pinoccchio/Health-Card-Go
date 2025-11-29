'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar } from 'lucide-react';

export default function AdminAppointmentsPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Appointments"
      pageDescription="View and manage all appointments across the system"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Appointments Management
            </h2>
            <p className="text-gray-600">
              This page will display all appointments across all categories with
              filtering and management capabilities.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
