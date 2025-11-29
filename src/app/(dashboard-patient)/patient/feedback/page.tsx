'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { MessageSquare } from 'lucide-react';

export default function PatientFeedbackPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Feedback"
      pageDescription="Share your experience"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Submit Feedback
            </h2>
            <p className="text-gray-600">
              This page will allow you to submit feedback after appointments and view
              your past feedback submissions.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
