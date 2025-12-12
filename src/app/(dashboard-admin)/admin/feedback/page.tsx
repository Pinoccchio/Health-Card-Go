'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import StarRating from '@/components/ui/StarRating';
import {
  MessageSquare,
  User,
  Calendar,
  Star,
  TrendingUp,
  Reply,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

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
  patients?: {
    patient_number: string;
    profiles?: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
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

export default function AdminFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'responded' | 'pending'>('all');

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    filterFeedback();
  }, [searchTerm, statusFilter, feedbackList]);

  const loadFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback');
      const data = await response.json();

      if (data.success) {
        setFeedbackList(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load feedback');
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const filterFeedback = () => {
    let filtered = [...feedbackList];

    // Status filter
    if (statusFilter === 'responded') {
      filtered = filtered.filter(f => f.admin_response);
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(f => !f.admin_response);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(f => {
        const patientName = `${f.patients?.profiles?.first_name || ''} ${f.patients?.profiles?.last_name || ''}`.toLowerCase();
        const patientNumber = f.patients?.patient_number?.toLowerCase() || '';
        const serviceName = f.appointments?.services?.name?.toLowerCase() || '';
        const comments = f.comments?.toLowerCase() || '';

        return patientName.includes(search) ||
               patientNumber.includes(search) ||
               serviceName.includes(search) ||
               comments.includes(search);
      });
    }

    setFilteredFeedback(filtered);
  };

  const handleRespond = async () => {
    if (!selectedFeedback || !responseText.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_response: responseText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit response');
      }

      // Reload feedback
      await loadFeedback();
      setSelectedFeedback(null);
      setResponseText('');
    } catch (err) {
      console.error('Error submitting response:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateStats = () => {
    const total = feedbackList.length;
    const responded = feedbackList.filter(f => f.admin_response).length;
    const pending = total - responded;

    const avgOverall = total > 0
      ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1)
      : '0.0';

    const avgFacility = total > 0
      ? (feedbackList.reduce((sum, f) => sum + f.facility_rating, 0) / total).toFixed(1)
      : '0.0';

    const avgWaitTime = total > 0
      ? (feedbackList.reduce((sum, f) => sum + f.wait_time_rating, 0) / total).toFixed(1)
      : '0.0';

    const recommendCount = feedbackList.filter(f => f.would_recommend).length;
    const recommendPercent = total > 0 ? ((recommendCount / total) * 100).toFixed(0) : '0';

    return {
      total,
      responded,
      pending,
      avgOverall,
      avgFacility,
      avgWaitTime,
      recommendPercent,
    };
  };

  const stats = calculateStats();

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Feedback Management"
      pageDescription="View and respond to patient feedback"
    >
      <Container size="full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgOverall}</p>
                <p className="text-xs text-gray-500">out of 5.0</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recommend</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recommendPercent}%</p>
                <p className="text-xs text-gray-500">would recommend</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Responded</p>
                <p className="text-2xl font-bold text-gray-900">{stats.responded}</p>
                <p className="text-xs text-gray-500">of {stats.total}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500">need response</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient name, number, service, or comments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'responded' | 'pending')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Feedback</option>
                <option value="pending">Pending Response</option>
                <option value="responded">Responded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-red-800 font-medium">Error</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search term'
                  : 'No feedback has been submitted yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredFeedback.map((feedback) => {
                const patientName = feedback.patients?.profiles
                  ? `${feedback.patients.profiles.first_name} ${feedback.patients.profiles.last_name}`
                  : 'Unknown Patient';

                return (
                  <div key={feedback.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{patientName}</h3>
                          <span className="text-sm text-gray-500">
                            #{feedback.patients?.patient_number}
                          </span>
                          {feedback.admin_response ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Responded
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 mb-3 space-y-1">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(feedback.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                            <span>{feedback.appointments?.services?.name || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Ratings Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Overall</p>
                            <StarRating value={feedback.rating} readonly size="sm" />
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Facility</p>
                            <StarRating value={feedback.facility_rating} readonly size="sm" />
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-500 mb-1">Wait Time</p>
                            <StarRating value={feedback.wait_time_rating} readonly size="sm" />
                          </div>
                        </div>

                        {/* Comments */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.comments}</p>
                        </div>

                        {/* Admin Response */}
                        {feedback.admin_response && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <Reply className="w-4 h-4 mr-2 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-medium text-green-900">Your Response</p>
                                  {feedback.responded_at && (
                                    <p className="text-xs text-green-600">
                                      {new Date(feedback.responded_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm text-green-900 whitespace-pre-wrap">{feedback.admin_response}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!feedback.admin_response && (
                        <button
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setResponseText('');
                          }}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Respond
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Response Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Respond to Feedback</h3>
              </div>

              <div className="p-6">
                {/* Patient Info */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFeedback.patients?.profiles
                      ? `${selectedFeedback.patients.profiles.first_name} ${selectedFeedback.patients.profiles.last_name}`
                      : 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selectedFeedback.patients?.patient_number} • {selectedFeedback.patients?.profiles?.email}
                  </p>
                </div>

                {/* Original Feedback */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Original Feedback:</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFeedback.comments}</p>
                  </div>
                </div>

                {/* Response Textarea */}
                <div>
                  <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={6}
                    maxLength={1000}
                    placeholder="Write your response to the patient..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-right text-xs text-gray-500 mt-1">{responseText.length}/1000</p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setSelectedFeedback(null);
                    setResponseText('');
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRespond}
                  disabled={isSubmitting || !responseText.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Reply className="w-4 h-4 mr-2" />
                      Send Response
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
