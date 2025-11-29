'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar } from 'lucide-react';

export default function DoctorAppointmentsPage() {
  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Appointments"
      pageDescription="Today's appointment queue"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Appointment Queue
            </h2>
            <p className="text-gray-600">
              This page will display today's appointment queue with real-time updates
              and patient check-in status.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
