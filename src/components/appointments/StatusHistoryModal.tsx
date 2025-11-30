'use client';

import { useEffect, useState } from 'react';
import { X, Clock, User, RotateCcw, AlertCircle, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { formatPhilippineDateTime } from '@/lib/utils/timezone';
import { getStatusTimelineColor, getRoleBadgeColor, TIMELINE_COLORS, AppointmentStatus } from '@/lib/constants/colors';

interface StatusHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string;
  changed_by_profile: {
    first_name: string;
    last_name: string;
    role: string;
  } | null;  // Made nullable for defensive programming
  reason: string | null;
  is_reversion: boolean;
  reverted_from_history_id: string | null;
  change_type: 'status_change' | 'doctor_assigned' | 'doctor_unassigned' | 'doctor_changed';
  old_doctor: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
      specialization: string | null;
    };
  } | null;
  new_doctor: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
      specialization: string | null;
    };
  } | null;
}

interface StatusHistoryModalProps {
  appointmentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function StatusHistoryModal({
  appointmentId,
  isOpen,
  onClose,
}: StatusHistoryModalProps) {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchHistory();
    }
  }, [isOpen, appointmentId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/history`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (err) {
      setError('Failed to load status history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Use Philippine timezone utility for consistent timezone handling
    return formatPhilippineDateTime(dateString);
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDoctorName = (doctor: StatusHistory['new_doctor']) => {
    if (!doctor || !doctor.profiles) return 'Unknown Doctor';
    const { first_name, last_name, specialization } = doctor.profiles;
    return `Dr. ${first_name} ${last_name}${specialization ? ` (${specialization})` : ''}`;
  };

  const getChangeIcon = (changeType: StatusHistory['change_type']) => {
    switch (changeType) {
      case 'doctor_assigned':
        return UserPlus;
      case 'doctor_unassigned':
        return UserMinus;
      case 'doctor_changed':
        return UserCheck;
      default:
        return null;
    }
  };

  // Get timeline dot color based on change type and status
  const getTimelineDotColor = (entry: StatusHistory): string => {
    if (entry.is_reversion) {
      return TIMELINE_COLORS.reversion; // Yellow for reversions
    }

    if (entry.change_type === 'doctor_assigned') {
      return TIMELINE_COLORS.doctor_assigned; // Blue for doctor assignments
    }

    if (entry.change_type === 'doctor_unassigned' || entry.change_type === 'doctor_changed') {
      return TIMELINE_COLORS.doctor_assigned; // Blue for doctor changes
    }

    // For status changes, use the actual status color
    if (entry.change_type === 'status_change' && entry.to_status) {
      return getStatusTimelineColor(entry.to_status as AppointmentStatus);
    }

    // Fallback
    return 'bg-gray-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Appointment Status History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading history...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-4">
                {/* Timeline */}
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                  {/* History entries */}
                  {history.map((entry, index) => (
                    <div key={entry.id} className="relative pb-8 last:pb-0">
                      {/* Timeline dot */}
                      <div className="absolute left-6 top-1.5 -translate-x-1/2">
                        <div
                          className={`w-3 h-3 rounded-full border-2 border-white ${getTimelineDotColor(entry)}`}
                        />
                      </div>

                      {/* Entry card */}
                      <div className="ml-12 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {entry.is_reversion && (
                              <RotateCcw className="w-4 h-4 text-yellow-600" />
                            )}
                            {entry.change_type !== 'status_change' && !entry.is_reversion && (() => {
                              const Icon = getChangeIcon(entry.change_type);
                              return Icon ? <Icon className="w-4 h-4 text-blue-600" /> : null;
                            })()}
                            <span className="font-semibold text-gray-900">
                              {entry.change_type === 'status_change' ? (
                                entry.from_status ? (
                                  <>
                                    {formatStatus(entry.from_status)} →{' '}
                                    {formatStatus(entry.to_status)}
                                  </>
                                ) : (
                                  `Initial: ${formatStatus(entry.to_status)}`
                                )
                              ) : entry.change_type === 'doctor_assigned' ? (
                                <>Doctor Assigned: {formatDoctorName(entry.new_doctor)}</>
                              ) : entry.change_type === 'doctor_unassigned' ? (
                                <>Doctor Unassigned: {formatDoctorName(entry.old_doctor)}</>
                              ) : entry.change_type === 'doctor_changed' ? (
                                <>
                                  Doctor Changed: {formatDoctorName(entry.old_doctor)} → {formatDoctorName(entry.new_doctor)}
                                </>
                              ) : null}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(entry.changed_at)}
                          </div>
                          <div className="flex items-center">
                            <User className="w-3 h-3 mr-1" />
                            {entry.changed_by_profile ? (
                              <>
                                {entry.changed_by_profile.first_name}{' '}
                                {entry.changed_by_profile.last_name}
                              </>
                            ) : (
                              <span className="text-gray-500 italic">Unknown User</span>
                            )}
                          </div>
                          {entry.changed_by_profile && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                entry.changed_by_profile.role
                              )}`}
                            >
                              {entry.changed_by_profile.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {entry.reason && (
                          <div className="mt-2 text-sm text-gray-700 italic">
                            "{entry.reason}"
                          </div>
                        )}

                        {entry.is_reversion && (
                          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                            ⚠ This was a status reversion
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No status history available
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
