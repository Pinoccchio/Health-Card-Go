'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Heart, FileText, Search, Lock, Filter, Download } from 'lucide-react';

export default function HealthcareAdminMedicalRecordsPage() {
  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Medical Records"
      pageDescription="View and manage medical records for your assigned service"
    >
      <Container size="full">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-16 h-16 text-teal-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Medical Records Management Coming Soon
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            This page will provide comprehensive medical records management for patients within your assigned service category,
            with secure access controls and complete patient medical histories.
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
            <Filter className="w-10 h-10 text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Service-Based Filtering</h3>
            <p className="text-sm text-gray-600">
              Automatically filtered medical records based on your assigned service category
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <FileText className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Record Templates</h3>
            <p className="text-sm text-gray-600">
              Specialized templates for different record types (HIV, Pregnancy, Healthcard, General)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <Lock className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Secure Access</h3>
            <p className="text-sm text-gray-600">
              Encrypted records for sensitive categories with comprehensive audit logging
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <Search className="w-10 h-10 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Advanced Search</h3>
            <p className="text-sm text-gray-600">
              Search records by patient name, number, date range, diagnosis, and more
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <Download className="w-10 h-10 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Export Capabilities</h3>
            <p className="text-sm text-gray-600">
              Export medical records and summaries in CSV or PDF format
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
            <Heart className="w-10 h-10 text-pink-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Patient History</h3>
            <p className="text-sm text-gray-600">
              Complete medical history view with timeline of diagnoses and treatments
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Features</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Service Category Filtering:</strong>
                <span className="text-gray-600"> Only view records for patients in your assigned service (Healthcard, HIV, Pregnancy, General Admin, Laboratory)</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Create & Update Records:</strong>
                <span className="text-gray-600"> Add new medical records and update existing ones with standardized templates</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Record Encryption:</strong>
                <span className="text-gray-600"> Automatic encryption for sensitive categories (HIV, Pregnancy) with secure access controls</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Audit Trail:</strong>
                <span className="text-gray-600"> Track all record access and modifications for compliance and security</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Linked to Appointments:</strong>
                <span className="text-gray-600"> Medical records automatically linked to completed appointments</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-teal-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Disease Surveillance Integration:</strong>
                <span className="text-gray-600"> Diagnoses automatically feed into disease surveillance system for tracking and analytics</span>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </DashboardLayout>
  );
}
