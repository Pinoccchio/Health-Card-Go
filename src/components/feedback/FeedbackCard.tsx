'use client';

import StarRating from '@/components/ui/StarRating';
import { Calendar, User, Stethoscope, Building2, Timer, ThumbsUp, ThumbsDown, MessageSquare, Reply } from 'lucide-react';

interface FeedbackCardProps {
  feedback: {
    id: string;
    rating: number;
    doctor_rating: number;
    facility_rating: number;
    wait_time_rating: number;
    would_recommend: boolean;
    comments: string;
    created_at: string;
    admin_response?: string;
    responded_at?: string;
    appointments?: {
      appointment_date: string;
      appointment_time: string;
      services?: {
        name: string;
      };
      doctors?: {
        profiles?: {
          first_name: string;
          last_name: string;
        };
      };
    };
    responded_by_profile?: {
      first_name: string;
      last_name: string;
    };
  };
  showAppointmentDetails?: boolean;
}

export default function FeedbackCard({ feedback, showAppointmentDetails = true }: FeedbackCardProps) {
  const doctorName = feedback.appointments?.doctors?.profiles
    ? `Dr. ${feedback.appointments.doctors.profiles.first_name} ${feedback.appointments.doctors.profiles.last_name}`
    : 'Unknown Doctor';

  const adminName = feedback.responded_by_profile
    ? `${feedback.responded_by_profile.first_name} ${feedback.responded_by_profile.last_name}`
    : 'Administrator';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      {/* Appointment Details (if shown) */}
      {showAppointmentDetails && feedback.appointments && (
        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center text-gray-700">
              <Building2 className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">Service:</span>
              <span className="ml-2">{feedback.appointments.services?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Stethoscope className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">Doctor:</span>
              <span className="ml-2">{doctorName}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">Date:</span>
              <span className="ml-2">
                {new Date(feedback.appointments.appointment_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center text-gray-700">
              <Timer className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">Time:</span>
              <span className="ml-2">{feedback.appointments.appointment_time}</span>
            </div>
          </div>
        </div>
      )}

      {/* Submission Date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-2" />
          Submitted on {new Date(feedback.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        {feedback.would_recommend ? (
          <div className="flex items-center text-green-600 text-sm font-medium">
            <ThumbsUp className="w-4 h-4 mr-1" />
            Recommends
          </div>
        ) : (
          <div className="flex items-center text-gray-500 text-sm">
            <ThumbsDown className="w-4 h-4 mr-1" />
            Does not recommend
          </div>
        )}
      </div>

      {/* Ratings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Overall Experience</p>
          <StarRating value={feedback.rating} readonly size="sm" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Doctor Performance</p>
          <StarRating value={feedback.doctor_rating} readonly size="sm" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Facility Cleanliness</p>
          <StarRating value={feedback.facility_rating} readonly size="sm" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Wait Time</p>
          <StarRating value={feedback.wait_time_rating} readonly size="sm" />
        </div>
      </div>

      {/* Comments */}
      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
        <div className="flex items-start">
          <MessageSquare className="w-4 h-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 mb-1">Comments</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.comments}</p>
          </div>
        </div>
      </div>

      {/* Admin Response */}
      {feedback.admin_response && (
        <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
          <div className="flex items-start">
            <Reply className="w-4 h-4 mr-2 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-blue-900">Administrator Response</p>
                {feedback.responded_at && (
                  <p className="text-xs text-blue-600">
                    {new Date(feedback.responded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <p className="text-sm text-blue-900 whitespace-pre-wrap mb-2">{feedback.admin_response}</p>
              <p className="text-xs text-blue-600">
                <User className="w-3 h-3 inline mr-1" />
                {adminName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
