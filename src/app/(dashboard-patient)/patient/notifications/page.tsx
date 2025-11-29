'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Bell } from 'lucide-react';

export default function PatientNotificationsPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Notifications"
      pageDescription="Stay updated with your health appointments"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Notifications Center
            </h2>
            <p className="text-gray-600">
              This page will display appointment reminders, approval notifications,
              and other important updates.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
