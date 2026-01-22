'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, User, Calendar, Clock, FileText, Loader2, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/lib/contexts/ToastContext';
import { RejectionReasonModal } from './RejectionReasonModal';

interface PendingAppointmentApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSuccess: () => void;
}

export function PendingAppointmentApprovalModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: PendingAppointmentApprovalModalProps) {
  const toast = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'scheduled',
          action: 'approve',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Appointment approved successfully');
        onClose();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to approve appointment');
      }
    } catch (err) {
      console.error('Error approving appointment:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    setShowRejectionModal(true);
  };

  const handleRejectionSuccess = () => {
    setShowRejectionModal(false);
    onClose();
    onSuccess();
  };

  const patientName = appointment.patients?.profiles
    ? `${appointment.patients.profiles.first_name} ${appointment.patients.profiles.last_name}`
    : 'Unknown Patient';

  const serviceName = appointment.services?.name || 'Unknown Service';
  const barangayName = appointment.patients?.profiles?.barangays?.name || 'Unknown Barangay';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h2 className="text-xl font-bold">Review Pending Appointment</h2>
            <p className="text-sm text-blue-100 mt-1">Please review the details and approve or reject this application</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Patient Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{patientName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Patient Number</p>
                  <p className="font-medium text-gray-900">{appointment.patients?.patient_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Barangay</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {barangayName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Contact</p>
                  <p className="font-medium text-gray-900">{appointment.patients?.profiles?.phone_number || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Appointment Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Service</p>
                  <p className="font-medium text-gray-900">{serviceName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Appointment Number</p>
                  <p className="font-medium text-gray-900">#{appointment.appointment_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium text-gray-900">
                    {appointment.appointment_date ? format(new Date(appointment.appointment_date), 'MMMM dd, yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Time</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appointment.appointment_time || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason for Visit */}
            {appointment.reason && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Reason for Visit
                </h3>
                <p className="text-sm text-gray-700">{appointment.reason}</p>
              </div>
            )}

            {/* Card Type (if applicable) */}
            {appointment.card_type && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Health Card Type</h3>
                <p className="text-sm font-medium text-purple-900">
                  {appointment.card_type === 'food_handler' ? 'Yellow Card (Food Handler)' :
                   appointment.card_type === 'non_food' ? 'Green Card (Non-Food Handler)' :
                   appointment.card_type === 'pink' ? 'Pink Card (HIV)' : appointment.card_type}
                </p>
              </div>
            )}

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium">⚠️ Important</p>
              <p className="mt-1">
                Approving this appointment will change its status to <strong>SCHEDULED</strong> and notify the patient.
                Rejecting will <strong>CANCEL</strong> the appointment and require a reason.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 flex gap-3 rounded-b-lg border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              disabled={isApproving}
            >
              Close
            </button>
            <button
              onClick={handleReject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              disabled={isApproving}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        appointmentId={appointment.id}
        onSuccess={handleRejectionSuccess}
      />
    </>
  );
}
