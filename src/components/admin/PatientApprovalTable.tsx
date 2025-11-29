'use client';

import React, { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import ApprovalDialog from '@/components/admin/ApprovalDialog';
import RejectionDialog from '@/components/admin/RejectionDialog';

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

interface PatientApprovalTableProps {
  patients: Patient[];
  onApprove: (patientId: string) => Promise<void>;
  onReject: (patientId: string, reason: string) => Promise<void>;
}

export default function PatientApprovalTable({
  patients,
  onApprove,
  onReject,
}: PatientApprovalTableProps) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleApproveClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setApprovalDialogOpen(true);
  };

  const handleRejectClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setRejectionDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedPatient) return;
    await onApprove(selectedPatient.id);
    setApprovalDialogOpen(false);
    setSelectedPatient(null);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedPatient) return;
    await onReject(selectedPatient.id, reason);
    setRejectionDialogOpen(false);
    setSelectedPatient(null);
  };

  const toggleRowExpansion = (patientId: string) => {
    setExpandedRow(expandedRow === patientId ? null : patientId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return '-';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No pending patients</h3>
        <p className="mt-1 text-sm text-gray-500">
          All patient registrations have been processed.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                Patient Name
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Barangay
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Registered
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {patients.map((patient) => (
              <React.Fragment key={patient.id}>
                <tr className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    <button
                      onClick={() => toggleRowExpansion(patient.id)}
                      className="text-left hover:text-primary-teal"
                    >
                      {patient.first_name} {patient.last_name}
                      <svg
                        className={`inline-block ml-1 h-4 w-4 transition-transform ${
                          expandedRow === patient.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {patient.email}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {patient.barangays?.name || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(patient.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <StatusBadge status={patient.status} />
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => handleApproveClick(patient)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(patient)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
                {expandedRow === patient.id && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 px-4 py-6 sm:px-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">Contact Number:</p>
                          <p className="text-gray-500">{patient.contact_number || '-'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Date of Birth:</p>
                          <p className="text-gray-500">
                            {patient.date_of_birth
                              ? `${formatDate(patient.date_of_birth)} (${formatAge(
                                  patient.date_of_birth
                                )})`
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Gender:</p>
                          <p className="text-gray-500 capitalize">
                            {patient.gender || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Emergency Contact:</p>
                          <p className="text-gray-500">
                            {patient.emergency_contact
                              ? `${patient.emergency_contact.name} - ${patient.emergency_contact.phone}`
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPatient && (
        <>
          <ApprovalDialog
            isOpen={approvalDialogOpen}
            patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            onConfirm={handleApproveConfirm}
            onCancel={() => {
              setApprovalDialogOpen(false);
              setSelectedPatient(null);
            }}
          />
          <RejectionDialog
            isOpen={rejectionDialogOpen}
            patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            onConfirm={handleRejectConfirm}
            onCancel={() => {
              setRejectionDialogOpen(false);
              setSelectedPatient(null);
            }}
          />
        </>
      )}
    </>
  );
}
