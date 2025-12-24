'use client';

import { Clock, User, Calendar, CheckCircle, Briefcase } from 'lucide-react';
import { formatPhilippineDateTime } from '@/lib/utils/timezone';
import { TIME_BLOCKS, getTimeBlockColor, TimeBlock } from '@/types/appointment';

interface PendingAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  time_block: 'AM' | 'PM';
  status: string;
  service_id: number;
  patients: {
    id: string;
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  services?: {
    service_name: string;
  };
}

interface PendingAppointmentsSectionProps {
  appointments: PendingAppointment[];
  isLoading: boolean;
  onComplete: (appointment: PendingAppointment) => void;
}

export function PendingAppointmentsSection({
  appointments,
  isLoading,
  onComplete,
}: PendingAppointmentsSectionProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary-teal" />
              Pending Work
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              In-progress appointments waiting for completion
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
          <p className="ml-3 text-sm text-gray-500">Loading pending appointments...</p>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary-teal" />
              Pending Work
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              In-progress appointments waiting for completion
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500">
            No appointments currently in progress. Great work!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary-teal" />
            Pending Work
            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              {appointments.length}
            </span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            In-progress appointments waiting for completion
          </p>
        </div>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-sm">
                    #{appointment.appointment_number}
                  </span>
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {appointment.patients.profiles.first_name}{' '}
                    {appointment.patients.profiles.last_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {appointment.patients.patient_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span>
                  {new Date(appointment.appointment_date).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center text-sm gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className={`px-2 py-1 rounded text-xs font-bold ${getTimeBlockColor(appointment.time_block)}`}>
                  {appointment.time_block}
                </span>
                <span className="text-xs text-gray-600">
                  {TIME_BLOCKS[appointment.time_block].timeRange}
                </span>
              </div>
              {appointment.services && (
                <div className="flex items-center text-sm">
                  <Briefcase className="w-4 h-4 mr-2 text-teal-500" />
                  <span className="truncate font-medium text-gray-900">{appointment.services.name}</span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                In Progress
              </span>
            </div>

            {/* Complete Button */}
            <button
              onClick={() => onComplete(appointment)}
              className="w-full px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-teal-700 font-medium text-sm transition-colors flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Appointment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
