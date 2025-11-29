'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import PatientApprovalTable from '@/components/admin/PatientApprovalTable';
import { Users } from 'lucide-react';

interface Patient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';
  contact_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  emergency_contact?: any;
  created_at: string;
  barangay_id?: number;
  barangays?: { id: number; name: string; code: string } | null;
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPendingPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/patients/pending');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pending patients');
      }

      setPatients(result.data || []);
    } catch (err) {
      console.error('Error fetching pending patients:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPatients();
  }, []);

  const handleApprove = async (patientId: string) => {
    try {
      const response = await fetch(`/api/admin/patients/${patientId}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve patient');
      }

      setSuccessMessage('Patient approved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh the list
      await fetchPendingPatients();
    } catch (err) {
      console.error('Error approving patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve patient');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleReject = async (patientId: string, reason: string) => {
    try {
      const response = await fetch(`/api/admin/patients/${patientId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject patient');
      }

      setSuccessMessage('Patient rejected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh the list
      await fetchPendingPatients();
    } catch (err) {
      console.error('Error rejecting patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject patient');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Patients"
      pageDescription="Manage all patient accounts and registrations"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-primary-teal mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Pending Patient Registrations
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Review and approve patient account requests
                  </p>
                </div>
              </div>
              <button
                onClick={fetchPendingPatients}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-teal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className={`-ml-1 mr-2 h-5 w-5 text-gray-500 ${
                    loading ? 'animate-spin' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className="mt-4 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-3 text-sm font-medium text-green-800">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-3 text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading patients...</p>
              </div>
            ) : (
              <PatientApprovalTable
                patients={patients}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
