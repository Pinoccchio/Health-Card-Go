'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Drawer } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import FeedbackCard from '@/components/feedback/FeedbackCard';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  Reply,
  Clock,
  AlertCircle,
  Calendar,
  Eye,
  Send,
  ListChecks,
} from 'lucide-react';
import {
  TimeBlock,
  TIME_BLOCKS,
  formatTimeBlock,
  getTimeBlockColor,
} from '@/types/appointment';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  time_block: TimeBlock;
  appointment_number: number;
  completed_at: string;
  has_feedback?: boolean;
  services?: {
    name: string;
    category: string;
  };
  feedback?: Array<{ id: string }>;
}

interface Feedback {
  id: string;
  rating: number;
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
  };
  responded_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

type FilterType = 'all' | 'pending' | 'submitted' | 'recommended' | 'with_response' | 'awaiting_response';

export default function PatientFeedbackPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [eligibleAppointments, setEligibleAppointments] = useState<Appointment[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [isFeedbackDrawerOpen, setIsFeedbackDrawerOpen] = useState(false);
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
          setIsFormDrawerOpen(true);
        }
      }
    }
  }, [eligibleAppointments, selectedAppointment]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load completed appointments eligible for feedback (within 7 days)
      const appointmentsRes = await fetch('/api/appointments?status=completed&_t=' + Date.now());
      const appointmentsData = await appointmentsRes.json();

      if (appointmentsData.success && appointmentsData.data) {
        // Filter for appointments completed within 7 days and without feedback
        const now = new Date();
        const eligible = appointmentsData.data.filter((apt: any) => {
          if (!apt.completed_at) return false;

          const completedAt = new Date(apt.completed_at);
          const daysSince = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));

          // Check if within 7 days AND doesn't have feedback yet
          const hasFeedback = apt.has_feedback === true;

          return daysSince <= 7 && !hasFeedback;
        });

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
    setIsFormDrawerOpen(false);
    loadData();
  };

  const handleSubmitClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsFormDrawerOpen(true);
  };

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsFeedbackDrawerOpen(true);
  };

  const calculateDaysRemaining = (completedAt: string) => {
    const completed = new Date(completedAt);
    const deadline = new Date(completed);
    deadline.setDate(deadline.getDate() + 7);

    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return daysRemaining;
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalSubmitted = feedbackHistory.length;
    const pending = eligibleAppointments.length;
    const averageRating = feedbackHistory.length > 0
      ? feedbackHistory.reduce((sum, f) => sum + f.rating, 0) / feedbackHistory.length
      : 0;
    const recommendations = feedbackHistory.filter(f => f.would_recommend).length;
    const withResponse = feedbackHistory.filter(f => f.admin_response).length;
    const awaitingResponse = feedbackHistory.filter(f => !f.admin_response).length;

    return { totalSubmitted, pending, averageRating, recommendations, withResponse, awaitingResponse };
  }, [eligibleAppointments, feedbackHistory]);

  // Filter feedback history
  const filteredFeedback = useMemo(() => {
    if (filter === 'all') return feedbackHistory;
    if (filter === 'pending') return []; // Pending is for eligible appointments
    if (filter === 'submitted') return feedbackHistory;
    if (filter === 'recommended') return feedbackHistory.filter(f => f.would_recommend);
    if (filter === 'with_response') return feedbackHistory.filter(f => f.admin_response);
    if (filter === 'awaiting_response') return feedbackHistory.filter(f => !f.admin_response);
    return feedbackHistory;
  }, [feedbackHistory, filter]);

  // Show eligible appointments when 'pending' or 'all' filter is active
  const showEligibleAppointments = filter === 'pending' || filter === 'all';

  // Show feedback history when not 'pending' filter (includes 'all')
  const showFeedbackHistory = filter !== 'pending';

  // Define table columns for feedback history
  const tableColumns = [
    {
      header: 'Submitted',
      accessor: 'created_at',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Calendar className="w-3 h-3 text-gray-400" />
          {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ),
    },
    {
      header: 'Service',
      accessor: 'service',
      sortable: false,
      render: (_: any, row: Feedback) => (
        <div className="text-sm">
          {row.appointments?.services ? (
            <span className="text-gray-900">{row.appointments.services.name}</span>
          ) : (
            <span className="text-gray-400 italic">N/A</span>
          )}
        </div>
      ),
    },
    {
      header: 'Rating',
      accessor: 'rating',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-1 text-sm">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold text-gray-900">{value.toFixed(1)}</span>
          <span className="text-gray-500">/ 5.0</span>
        </div>
      ),
    },
    {
      header: 'Recommend',
      accessor: 'would_recommend',
      sortable: true,
      render: (value: boolean) => (
        value ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Yes
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            No
          </span>
        )
      ),
    },
    {
      header: 'Response',
      accessor: 'admin_response',
      sortable: false,
      render: (value: string | undefined) => (
        value ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Reply className="w-3 h-3 mr-1" />
            Responded
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: Feedback) => (
        <button
          onClick={() => handleViewFeedback(row)}
          className="inline-flex items-center px-3 py-1.5 bg-[#20C997] text-white text-xs font-medium rounded-md hover:bg-[#1AA179] transition-colors"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          View Details
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Feedback"
      pageDescription="Share your experience and view your feedback history"
    >
      <Container size="full">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Submitted</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.totalSubmitted}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <ListChecks className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.pending}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.averageRating.toFixed(1)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Recommended</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.recommendations}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <ThumbsUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">With Response</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.withResponse}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Reply className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Awaiting</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.awaitingResponse}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All', count: statistics.totalSubmitted + statistics.pending, color: 'teal', icon: ListChecks },
                { id: 'pending', label: 'Pending Feedback', count: statistics.pending, color: 'orange', icon: Clock },
                { id: 'submitted', label: 'Submitted', count: statistics.totalSubmitted, color: 'teal', icon: Send },
                { id: 'recommended', label: 'Recommended', count: statistics.recommendations, color: 'green', icon: ThumbsUp },
                { id: 'with_response', label: 'With Response', count: statistics.withResponse, color: 'blue', icon: Reply },
                { id: 'awaiting_response', label: 'Awaiting Response', count: statistics.awaitingResponse, color: 'purple', icon: MessageSquare },
              ].map((filterOption) => {
                const Icon = filterOption.icon;
                const isActive = filter === filterOption.id;
                const colorClasses = {
                  teal: { bg: 'bg-teal-100 hover:bg-teal-200', text: 'text-teal-700', ring: 'ring-teal-500', activeBg: 'bg-teal-200' },
                  orange: { bg: 'bg-orange-100 hover:bg-orange-200', text: 'text-orange-700', ring: 'ring-orange-500', activeBg: 'bg-orange-200' },
                  green: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-700', ring: 'ring-green-500', activeBg: 'bg-green-200' },
                  blue: { bg: 'bg-blue-100 hover:bg-blue-200', text: 'text-blue-700', ring: 'ring-blue-500', activeBg: 'bg-blue-200' },
                  purple: { bg: 'bg-purple-100 hover:bg-purple-200', text: 'text-purple-700', ring: 'ring-purple-500', activeBg: 'bg-purple-200' },
                };
                const colors = colorClasses[filterOption.color as keyof typeof colorClasses];

                return (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id as FilterType)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
                      ${isActive ? `${colors.activeBg} ${colors.text} ring-2 ${colors.ring} shadow-md` : `${colors.bg} ${colors.text}`}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filterOption.label}</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/80' : 'bg-white/60'}`}>
                      {filterOption.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="space-y-6">
              {/* Eligible Appointments Section */}
              {showEligibleAppointments && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Eligible Appointments
                    </h2>
                    <p className="text-sm text-gray-600">
                      You can submit feedback within 7 days of appointment completion.
                    </p>
                  </div>

                  {eligibleAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Eligible Appointments
                      </h3>
                      <p className="text-gray-600">
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
                            className="border border-gray-200 rounded-lg p-4 hover:border-primary-teal transition-colors"
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
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTimeBlockColor(appointment.time_block)}`}>
                                      {appointment.time_block}
                                    </span>
                                    <span className="text-xs">
                                      {TIME_BLOCKS[appointment.time_block].timeRange}
                                    </span>
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
                                  onClick={() => handleSubmitClick(appointment)}
                                  className="ml-4 px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors text-sm font-medium"
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

              {/* Feedback History Section */}
              {showFeedbackHistory && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Your Feedback History
                    </h2>
                    <p className="text-sm text-gray-600">
                      View all your submitted feedback and admin responses.
                    </p>
                  </div>

                  {filteredFeedback.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Feedback Yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        You haven't submitted any feedback yet.
                      </p>
                      <button
                        onClick={() => setFilter('pending')}
                        className="px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors text-sm font-medium"
                      >
                        View Eligible Appointments
                      </button>
                    </div>
                  ) : (
                    <EnhancedTable
                      columns={tableColumns}
                      data={filteredFeedback}
                      searchable
                      searchPlaceholder="Search by service or rating..."
                      paginated
                      pageSize={10}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        )}

        {/* Feedback Form Drawer */}
        {selectedAppointment && (
          <Drawer
            isOpen={isFormDrawerOpen}
            onClose={() => {
              setIsFormDrawerOpen(false);
              setSelectedAppointment(null);

              // Remove appointment_id from URL to prevent re-opening
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('appointment_id');
                window.history.replaceState({}, '', url.pathname);
              }
            }}
            size="xl"
            title="Submit Feedback"
            subtitle={selectedAppointment.services?.name || 'Appointment'}
          >
            <div className="p-6">
              <FeedbackForm
                appointment={selectedAppointment}
                onSuccess={handleFeedbackSuccess}
                onCancel={() => {
                  setIsFormDrawerOpen(false);
                  setSelectedAppointment(null);

                  // Remove appointment_id from URL to prevent re-opening
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('appointment_id');
                    window.history.replaceState({}, '', url.pathname);
                  }
                }}
              />
            </div>
          </Drawer>
        )}

        {/* Feedback Details Drawer */}
        {selectedFeedback && (
          <Drawer
            isOpen={isFeedbackDrawerOpen}
            onClose={() => {
              setIsFeedbackDrawerOpen(false);
              setSelectedFeedback(null);
            }}
            size="xl"
            title="Feedback Details"
            subtitle={selectedFeedback.appointments?.services?.name || 'Appointment'}
          >
            <div className="p-6">
              <FeedbackCard feedback={selectedFeedback} showAppointmentDetails={true} />
            </div>
          </Drawer>
        )}
      </Container>
    </DashboardLayout>
  );
}
