'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, MapPin, Calendar, RefreshCw, Info } from 'lucide-react';

interface ThresholdExceeded {
  threshold: number;
  days_window: number;
  description: string;
  case_count: number;
}

interface Outbreak {
  disease_type: string;
  custom_disease_name?: string; // For disease_type='other'
  barangay_id: number | null;
  barangay_name: string;
  case_count: number;
  critical_cases: number;
  severe_cases: number;
  days_window: number;
  threshold: number;
  threshold_description: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  first_case_date: string;
  latest_case_date: string;
  thresholds_exceeded?: ThresholdExceeded[]; // Consolidated threshold information
}

interface OutbreakAlertsProps {
  autoNotify?: boolean;
  refreshInterval?: number; // in milliseconds, default 5 minutes
  diseaseType?: string; // Optional filter
}

interface DiseaseStats {
  disease_type: string;
  active_cases_7d: number;
  active_cases_14d: number;
  active_cases_30d: number;
  threshold: number;
  days_window: number;
  description: string;
}

export default function OutbreakAlerts({ autoNotify = true, refreshInterval = 300000, diseaseType }: OutbreakAlertsProps) {
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [diseaseStats, setDiseaseStats] = useState<DiseaseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    loadOutbreaks();

    // Set up auto-refresh if enabled
    if (refreshInterval > 0) {
      const interval = setInterval(loadOutbreaks, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoNotify, refreshInterval]);

  const loadOutbreaks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (autoNotify) {
        params.append('auto_notify', 'true');
      }

      const response = await fetch(`/api/diseases/outbreak-detection?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setOutbreaks(result.data || []);
        setMetadata(result.metadata);
        setLastChecked(new Date(result.metadata.checked_at));

        // If no outbreaks, load disease stats for threshold breakdown
        if (result.data.length === 0) {
          await loadDiseaseStats();
        }
      } else {
        setError(result.error || 'Failed to load outbreak data');
      }
    } catch (err) {
      console.error('Error loading outbreaks:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadDiseaseStats = async () => {
    try {
      // Fetch recent disease cases to calculate current counts vs thresholds
      const response = await fetch('/api/diseases');
      const result = await response.json();

      if (result.success) {
        const diseases = result.data || [];
        const now = new Date();

        // Calculate active case counts for different time windows
        const thresholds = [
          { disease_type: 'dengue', threshold: 10, days_window: 7, description: '10+ cases in 7 days' },
          { disease_type: 'hiv_aids', threshold: 3, days_window: 30, description: '3+ cases in 30 days' },
          { disease_type: 'malaria', threshold: 3, days_window: 14, description: '3+ cases in 14 days' },
          { disease_type: 'measles', threshold: 2, days_window: 7, description: '2+ cases in 7 days' },
          { disease_type: 'rabies', threshold: 1, days_window: 7, description: 'Any rabies case triggers alert' },
          { disease_type: 'pregnancy_complications', threshold: 5, days_window: 30, description: '5+ cases in 30 days' },
          { disease_type: 'other', threshold: 3, days_window: 14, description: '3+ cases in 14 days (custom)' },
        ];

        const stats = thresholds.map(t => {
          const activeCases7d = diseases.filter((d: any) => {
            if (d.disease_type !== t.disease_type) return false;
            if (d.status !== 'active') return false;
            const diagnosisDate = new Date(d.diagnosis_date);
            const daysAgo = (now.getTime() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 7;
          }).length;

          const activeCases14d = diseases.filter((d: any) => {
            if (d.disease_type !== t.disease_type) return false;
            if (d.status !== 'active') return false;
            const diagnosisDate = new Date(d.diagnosis_date);
            const daysAgo = (now.getTime() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 14;
          }).length;

          const activeCases30d = diseases.filter((d: any) => {
            if (d.disease_type !== t.disease_type) return false;
            if (d.status !== 'active') return false;
            const diagnosisDate = new Date(d.diagnosis_date);
            const daysAgo = (now.getTime() - diagnosisDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          }).length;

          return {
            ...t,
            active_cases_7d: activeCases7d,
            active_cases_14d: activeCases14d,
            active_cases_30d: activeCases30d,
          };
        });

        setDiseaseStats(stats);
      }
    } catch (err) {
      console.error('Error loading disease stats:', err);
    }
  };

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getRiskIconColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  if (loading && !outbreaks.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Outbreak Alerts</h3>
          <AlertTriangle className="w-6 h-6 text-gray-400 animate-pulse" />
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal mx-auto"></div>
          <p className="text-gray-600 mt-2 text-sm">Detecting outbreaks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Error Loading Outbreaks</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Outbreak Alerts
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Real-time outbreak detection and monitoring
            </p>
          </div>
          <button
            onClick={loadOutbreaks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-teal hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        {metadata && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs text-red-600 font-medium">Critical</p>
              <p className="text-2xl font-bold text-red-900">{metadata.critical_outbreaks}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-orange-600 font-medium">High Risk</p>
              <p className="text-2xl font-bold text-orange-900">{metadata.high_risk_outbreaks}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{metadata.total_outbreaks}</p>
            </div>
          </div>
        )}

        {lastChecked && (
          <p className="text-xs text-gray-500 mt-3">
            Last checked: {lastChecked.toLocaleString()}
          </p>
        )}
      </div>

      {/* Outbreak List */}
      <div className="p-6">
        {outbreaks.length === 0 ? (
          <div>
            {/* Header */}
            <div className="text-center py-6 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-900 font-medium text-lg">No Outbreaks Detected</p>
              <p className="text-gray-600 text-sm mt-1">
                All disease cases are within normal thresholds
              </p>
            </div>

            {/* Threshold Breakdown */}
            {diseaseStats.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-gray-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Current Status vs. Outbreak Thresholds</h4>
                </div>

                <div className="space-y-4">
                  {diseaseStats.map((stat) => {
                    // Get the current count for the specific time window
                    const currentCount = stat.days_window === 7 ? stat.active_cases_7d :
                                       stat.days_window === 14 ? stat.active_cases_14d :
                                       stat.active_cases_30d;
                    const percentage = Math.min((currentCount / stat.threshold) * 100, 100);
                    const isClose = percentage >= 70; // 70% or more of threshold

                    return (
                      <div key={stat.disease_type} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {stat.disease_type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-600">
                                <span className={`font-bold ${isClose ? 'text-orange-600' : 'text-gray-900'}`}>
                                  {currentCount}
                                </span>
                                <span className="text-gray-500"> / {stat.threshold} cases</span>
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              Threshold: {stat.description}
                            </p>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isClose ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Information Box */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">
                      <span className="font-semibold">How it works:</span> Outbreak alerts are triggered when active case counts exceed predefined thresholds within specific time windows. The system continuously monitors disease patterns and automatically notifies Super Admins when outbreaks are detected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state for stats */}
            {diseaseStats.length === 0 && !loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-teal mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading threshold data...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {outbreaks.map((outbreak, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  outbreak.risk_level === 'critical'
                    ? 'border-red-300 bg-red-50'
                    : outbreak.risk_level === 'high'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-yellow-300 bg-yellow-50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 mt-1 ${getRiskIconColor(outbreak.risk_level)}`} />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {outbreak.disease_type === 'other' && outbreak.custom_disease_name
                          ? outbreak.custom_disease_name
                          : outbreak.disease_type.replace('_', ' ').toUpperCase()}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <p className="text-sm text-gray-700">{outbreak.barangay_name}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getRiskBadgeClass(outbreak.risk_level)}`}>
                    {outbreak.risk_level}
                  </span>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Total Cases</p>
                    <p className="text-lg font-bold text-gray-900">{outbreak.case_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Critical</p>
                    <p className="text-lg font-bold text-red-600">{outbreak.critical_cases}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Severe</p>
                    <p className="text-lg font-bold text-orange-600">{outbreak.severe_cases}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Time Window</p>
                    <p className="text-lg font-bold text-gray-900">{outbreak.days_window}d</p>
                  </div>
                </div>

                {/* Threshold Info - Multiple Thresholds */}
                {outbreak.thresholds_exceeded && outbreak.thresholds_exceeded.length > 1 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                      <TrendingUp className="w-3 h-3 text-gray-500" />
                      <span>Multiple thresholds exceeded:</span>
                    </div>
                    <div className="space-y-1.5">
                      {outbreak.thresholds_exceeded.map((threshold, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs bg-white bg-opacity-50 rounded p-2 border border-gray-200"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{threshold.description}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-900">{threshold.case_count}</span>
                            <span className="text-gray-500"> / {threshold.threshold} cases</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-xs bg-white bg-opacity-50 rounded p-2">
                    <TrendingUp className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <span className="font-medium">Threshold exceeded:</span> {outbreak.threshold_description}
                    </p>
                  </div>
                )}

                {/* Date Range */}
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(outbreak.first_case_date).toLocaleDateString()} - {new Date(outbreak.latest_case_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
