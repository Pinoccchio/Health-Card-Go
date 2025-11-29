'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FileText } from 'lucide-react';

export default function AdminReportsPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports"
      pageDescription="Generate comprehensive system reports"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reports Generation
            </h2>
            <p className="text-gray-600">
              This page will provide access to all report types including combined
              category reports and analytics.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
