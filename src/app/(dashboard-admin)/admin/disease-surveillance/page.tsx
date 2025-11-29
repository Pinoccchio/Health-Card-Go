'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Activity } from 'lucide-react';

export default function AdminDiseaseSurveillancePage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Disease Surveillance"
      pageDescription="Monitor disease patterns and predictions across barangays"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Disease Surveillance Dashboard
            </h2>
            <p className="text-gray-600">
              This page will feature interactive heatmaps, SARIMA predictions, and
              disease trend analytics.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
