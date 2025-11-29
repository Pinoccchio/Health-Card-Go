'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Calendar } from 'lucide-react';

export default function PatientBookAppointmentPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Book Appointment"
      pageDescription="Schedule your next visit"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Book an Appointment
            </h2>
            <p className="text-gray-600">
              This page will allow you to book appointments with a 7-day advance
              requirement and view available time slots.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
