'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Megaphone } from 'lucide-react';

export default function HealthcareAdminAnnouncementsPage() {
  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Announcements"
      pageDescription="Post announcements for patients"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Announcement Management
            </h2>
            <p className="text-gray-600">
              This page will allow you to create, edit, and manage announcements for
              patients in your category.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
