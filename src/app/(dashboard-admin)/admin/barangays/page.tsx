'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { MapPin } from 'lucide-react';

export default function AdminBarangaysPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Barangays"
      pageDescription="Manage barangays and coverage areas"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Barangay Management
            </h2>
            <p className="text-gray-600">
              This page will display all 44 barangays with mapping coordinates and
              configuration options.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
