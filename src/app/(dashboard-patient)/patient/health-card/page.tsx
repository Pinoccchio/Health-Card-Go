'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Heart } from 'lucide-react';

export default function PatientHealthCardPage() {
  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Health Card"
      pageDescription="Your digital health card with QR code"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-primary-teal mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Digital Health Card
            </h2>
            <p className="text-gray-600">
              This page will display your digital health card with QR code,
              downloadable as PDF and PNG formats.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
