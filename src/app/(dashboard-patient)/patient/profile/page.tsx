'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { UserCircle } from 'lucide-react';

export default function PatientProfilePage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Profile"
      pageDescription="Manage your account information"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Profile Settings
            </h2>
            <p className="text-gray-600">
              This page will allow you to update your personal information, contact
              details, and account settings.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
