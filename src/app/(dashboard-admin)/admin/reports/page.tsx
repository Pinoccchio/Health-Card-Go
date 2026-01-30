'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

export default function AdminReportsPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports & Analytics"
      pageDescription="Comprehensive system-wide reports and analytics"
    >
      <Container>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-teal/10 mb-6">
              <BarChart3 className="w-8 h-8 text-primary-teal" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Reports & Analytics
            </h2>
            <p className="text-gray-500 leading-relaxed">
              This feature is currently under maintenance. Please check back soon.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
