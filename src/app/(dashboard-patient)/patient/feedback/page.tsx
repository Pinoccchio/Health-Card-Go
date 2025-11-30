'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import FeedbackCard from '@/components/feedback/FeedbackCard';
import { MessageSquare, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  completed_at: string;
  has_feedback?: boolean;
  services?: {
    name: string;
    category: string;
  };
  doctors?: {
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
  feedback?: Array<{ id: string }>;
}

interface Feedback {
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
}

export default function PatientFeedbackPage() {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [eligibleAppointments, setEligibleAppointments] = useState<Appointment[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Handle appointment_id from URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && eligibleAppointments.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const appointmentId = params.get('appointment_id');

      if (appointmentId && !selectedAppointment) {
        const appointment = eligibleAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
          setSelectedAppointment(appointment);
        }
      }
    }
  }, [eligibleAppointments, selectedAppointment]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load completed appointments eligible for feedback (within 7 days)
      // Add cache-busting to prevent stale data
      const appointmentsRes = await fetch('/api/appointments?status=completed&_t=' + Date.now(), {
        cache: 'no-store'
      });
      const appointmentsData = await appointmentsRes.json();

      // DEBUG: Log raw API response with primitive values
      console.log('=== RAW API RESPONSE ===');
      console.log('Total appointments:', appointmentsData.data?.length);
      appointmentsData.data?.forEach((apt: any, i: number) => {
        console.log(`\nAppointment ${i + 1}: ${apt.services?.name}`);
        console.log('  ID:', apt.id);
        console.log('  has_feedback TYPE:', typeof apt.has_feedback);
        console.log('  has_feedback VALUE:', apt.has_feedback);
        console.log('  has_feedback === true?', apt.has_feedback === true);
        console.log('  has_feedback === false?', apt.has_feedback === false);
        console.log('  feedback array:', apt.feedback);
        console.log('  feedback is null?', apt.feedback === null);
        console.log('  feedback is array?', Array.isArray(apt.feedback));
        console.log('  feedback length:', apt.feedback?.length);
      });
      console.log('=========================\n');

      if (appointmentsData.success && appointmentsData.data) {
        // Filter for appointments completed within 7 days and without feedback
        const now = new Date();
        const eligible = appointmentsData.data.filter((apt: any) => {
          if (!apt.completed_at) return false;

          const completedAt = new Date(apt.completed_at);
          const daysSince = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));

          // Check if within 7 days AND doesn't have feedback yet
          const hasFeedback = apt.has_feedback === true;

          // DEBUG: Log filtering decision with primitive values
          console.log(`\n🔍 [FILTER LOGIC] ${apt.services?.name}:`);
          console.log('  completed_at:', apt.completed_at);
          console.log('  daysSince:', daysSince);
          console.log('  within 7 days?', daysSince <= 7);
          console.log('  hasFeedback (from has_feedback field):', hasFeedback);
          console.log('  !hasFeedback:', !hasFeedback);
          console.log('  FINAL DECISION (include?):', daysSince <= 7 && !hasFeedback);

          return daysSince <= 7 && !hasFeedback;
        });

        // DEBUG: Log final eligible appointments
        console.log('\n✅ [FEEDBACK PAGE] Eligible appointments:', eligible.length);
        eligible.forEach((a: any) => console.log('  -', a.services?.name || a.id));

        setEligibleAppointments(eligible);
      }

      // Load feedback history
      const feedbackRes = await fetch('/api/feedback');
      const feedbackData = await feedbackRes.json();

      if (feedbackData.success) {
        setFeedbackHistory(feedbackData.data || []);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSuccess = () => {
    setSelectedAppointment(null);
    loadData();
  };

  const calculateDaysRemaining = (completedAt: string) => {
    const completed = new Date(completedAt);
    const deadline = new Date(completed);
    deadline.setDate(deadline.getDate() + 7);

    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysRemaining;
  };

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Feedback"
      pageDescription="Share your experience and view your feedback history"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('submit')}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'submit'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Submit Feedback
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Feedback History
                {feedbackHistory.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                    {feedbackHistory.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-red-800 font-medium">Error</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : activeTab === 'submit' ? (
              <div>
                {selectedAppointment ? (
                  <div>
                    <button
                      onClick={() => setSelectedAppointment(null)}
                      className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      ← Back to Eligible Appointments
                    </button>
                    <FeedbackForm
                      appointment={selectedAppointment}
                      onSuccess={handleFeedbackSuccess}
                      onCancel={() => setSelectedAppointment(null)}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        Eligible Appointments
                      </h2>
                      <p className="text-sm text-gray-600">
                        You can submit feedback within 7 days of appointment completion.
                      </p>
                    </div>

                    {eligibleAppointments.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-medium mb-1">No Eligible Appointments</h3>
                        <p className="text-gray-600 text-sm">
                          You don't have any completed appointments eligible for feedback at this time.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {eligibleAppointments.map((appointment) => {
                          const daysRemaining = calculateDaysRemaining(appointment.completed_at);

                          return (
                            <div
                              key={appointment.id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-medium text-gray-900">
                                      {appointment.services?.name || 'N/A'}
                                    </h3>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                      Completed
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                      {new Date(appointment.appointment_date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                      {appointment.appointment_time}
                                    </div>
                                  </div>

                                  <div className="flex items-center text-sm">
                                    {daysRemaining > 0 ? (
                                      <span className="text-amber-600 font-medium">
                                        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining to submit feedback
                                      </span>
                                    ) : (
                                      <span className="text-red-600 font-medium">
                                        Feedback deadline expired
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {daysRemaining > 0 && (
                                  <button
                                    onClick={() => setSelectedAppointment(appointment)}
                                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                  >
                                    Submit Feedback
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Your Feedback History
                  </h2>
                  <p className="text-sm text-gray-600">
                    View all your submitted feedback and admin responses.
                  </p>
                </div>

                {feedbackHistory.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-gray-900 font-medium mb-1">No Feedback Yet</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      You haven't submitted any feedback yet.
                    </p>
                    <button
                      onClick={() => setActiveTab('submit')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Submit Your First Feedback
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbackHistory.map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        showAppointmentDetails={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
