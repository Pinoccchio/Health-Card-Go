'use client';

import { useEffect, useState } from 'react';
import { X, User, MapPin, Phone, Mail, Heart, FileText, Calendar, QrCode, AlertCircle } from 'lucide-react';
import QRCodeGenerator from '@/components/health-card/QRCodeGenerator';

interface PatientDetailDrawerProps {
  patient: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PatientDetailDrawer({ patient, isOpen, onClose }: PatientDetailDrawerProps) {
  const [healthCard, setHealthCard] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patient) {
      loadPatientData();
    }
  }, [isOpen, patient]);

  const loadPatientData = async () => {
    if (!patient) return;

    setLoading(true);
    try {
      // Fetch health card
      const healthCardRes = await fetch(`/api/health-cards/doctor/${patient.id}`);
      if (healthCardRes.ok) {
        const healthCardData = await healthCardRes.json();
        setHealthCard(healthCardData.data);
      }

      // Fetch appointment history with this doctor
      const appointmentsRes = await fetch(`/api/appointments?patient_id=${patient.id}`);
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData.data?.slice(0, 10) || []);
      }
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!isOpen || !patient) return null;

  const profile = patient.profiles;
  const barangay = profile?.barangays;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Centered Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-primary-teal text-white">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-teal-100 text-sm">Patient #{patient.patient_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-teal-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Patient Overview */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-teal" />
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Age</p>
                <p className="font-medium text-gray-900">
                  {profile?.date_of_birth ? calculateAge(profile.date_of_birth) : 'N/A'} years
                </p>
              </div>
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="font-medium text-gray-900 capitalize">{profile?.gender || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Date of Birth</p>
                <p className="font-medium text-gray-900">
                  {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <p className={`font-medium ${profile?.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                  {profile?.status || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-teal" />
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900">{profile?.contact_number || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{profile?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Barangay:</span>
                <span className="font-medium text-gray-900">{barangay?.name || 'N/A'}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-gray-600 text-sm">Emergency Contact:</p>
                  {profile?.emergency_contact ? (
                    <div className="font-medium text-gray-900">
                      <p>{profile.emergency_contact.name}</p>
                      <p className="text-sm text-gray-600">{profile.emergency_contact.phone}</p>
                      {profile.emergency_contact.email && (
                        <p className="text-sm text-gray-600">{profile.emergency_contact.email}</p>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-gray-900">N/A</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Medical Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary-teal" />
              Medical Summary
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading medical information...</div>
            ) : healthCard?.patients ? (
              <div className="space-y-3 text-sm">
                {/* Blood Type - Extracted from medical_history JSONB */}
                {healthCard.patients.medical_history?.blood_type && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Blood Type:</p>
                      <p className="font-medium text-gray-900">{healthCard.patients.medical_history.blood_type}</p>
                    </div>
                  </div>
                )}

                {/* Allergies */}
                {healthCard.patients.allergies && Array.isArray(healthCard.patients.allergies) && healthCard.patients.allergies.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Allergies:
                    </p>
                    <p className="text-red-700 mt-1">{healthCard.patients.allergies.join(', ')}</p>
                  </div>
                )}

                {/* Current Medications */}
                {healthCard.patients.current_medications && typeof healthCard.patients.current_medications === 'string' && healthCard.patients.current_medications.trim() && (
                  <div>
                    <p className="text-gray-600">Current Medications:</p>
                    <p className="font-medium text-gray-900 mt-1">{healthCard.patients.current_medications}</p>
                  </div>
                )}

                {/* Medical History */}
                {healthCard.patients.medical_history && typeof healthCard.patients.medical_history === 'object' && Object.keys(healthCard.patients.medical_history).length > 0 && (
                  <div>
                    <p className="text-gray-600">Medical History:</p>
                    <div className="font-medium text-gray-900 mt-1">
                      {Object.entries(healthCard.patients.medical_history).map(([key, value]) => (
                        <p key={key} className="capitalize">
                          {key.replace(/_/g, ' ')}: {String(value)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accessibility Requirements */}
                {healthCard.patients.accessibility_requirements && typeof healthCard.patients.accessibility_requirements === 'string' && healthCard.patients.accessibility_requirements.trim() && (
                  <div>
                    <p className="text-gray-600">Accessibility Requirements:</p>
                    <p className="font-medium text-gray-900 mt-1">{healthCard.patients.accessibility_requirements}</p>
                  </div>
                )}

                {/* No Medical Data */}
                {!healthCard.patients.medical_history?.blood_type &&
                 (!healthCard.patients.allergies || healthCard.patients.allergies.length === 0) &&
                 !healthCard.patients.current_medications &&
                 (!healthCard.patients.medical_history || Object.keys(healthCard.patients.medical_history).filter(k => k !== 'blood_type').length === 0) &&
                 !healthCard.patients.accessibility_requirements && (
                  <p className="text-gray-500 text-center py-4">No medical information available</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Medical information not available</p>
            )}
          </div>

          {/* Health Card */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary-teal" />
              Health Card
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading health card...</div>
            ) : healthCard ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <QRCodeGenerator
                  data={healthCard.qr_code_data}
                  size={200}
                />
                <div className="text-center text-sm">
                  <p className="text-gray-600">Card Number:</p>
                  <p className="font-mono font-medium text-gray-900">{healthCard.card_number}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Issued: {new Date(healthCard.issue_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Health card not available</p>
            )}
          </div>

          {/* Appointment History */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-teal" />
              Recent Appointments ({loading ? '...' : appointments.length})
            </h3>
            {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading appointment history...</div>
            ) : appointments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No appointment history</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {new Date(apt.appointment_date).toLocaleDateString()} at {apt.appointment_time}
                        </p>
                        <p className="text-sm text-gray-600">Queue #{apt.appointment_number}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        apt.status === 'no_show' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-3">
          <a
            href={`/doctor/medical-records/create?patient_id=${patient.id}`}
            className="flex-1 bg-primary-teal text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium text-center"
          >
            Create Medical Record
          </a>
          <a
            href={`/doctor/medical-records?patient_id=${patient.id}`}
            className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium text-center"
          >
            View Records
          </a>
        </div>
        </div>
      </div>
    </div>
  );
}
