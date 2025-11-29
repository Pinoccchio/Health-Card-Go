'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { MessageSquare } from 'lucide-react';

export default function AdminFeedbackPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Feedback"
      pageDescription="View and respond to patient feedback"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Patient Feedback
            </h2>
            <p className="text-gray-600">
              This page will display all patient feedback with response
              capabilities (exclusive to Super Admin).
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
