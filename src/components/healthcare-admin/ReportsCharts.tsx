'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportsChartsProps {
  serviceId: number;
  serviceName: string;
  requiresAppointment: boolean;
  requiresMedicalRecord: boolean;
  startDate: string;
  endDate: string;
  barangayId?: number;
}

interface AppointmentStats {
  summary: {
    total: number;
    completed: number;
    scheduled: number;
    cancelled: number;
    no_show: number;
  };
  completion_rate: string;
  status_breakdown: Array<{ status: string; count: number }>;
  trend_data: Array<{ date: string; count: number }>;
}

interface PatientStats {
  summary: {
    total_patients: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  status_breakdown: Array<{ status: string; count: number }>;
}

interface DiseaseStats {
  summary: {
    total_cases: number;
    unique_patients: number;
  };
  disease_breakdown: Array<{ disease_type: string; count: number }>;
  trend_data: Array<{ date: string; count: number }>;
}

export default function ReportsCharts({
  serviceId,
  serviceName,
  requiresAppointment,
  requiresMedicalRecord,
  startDate,
  endDate,
  barangayId,
}: ReportsChartsProps) {
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats | null>(null);
  const [patientStats, setPatientStats] = useState<PatientStats | null>(null);
  const [diseaseStats, setDiseaseStats] = useState<DiseaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create AbortController to cancel in-flight requests when component unmounts or dependencies change
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchReportData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        if (barangayId) {
          params.append('barangay_id', barangayId.toString());
        }

        // Fetch appointments data (Pattern 1 & 2)
        if (requiresAppointment) {
          const apptResponse = await fetch(`/api/healthcare-admin/reports/appointments?${params}`, { signal });
          if (apptResponse.ok) {
            const apptData = await apptResponse.json();
            // Only update state if request wasn't aborted
            if (!signal.aborted) {
              setAppointmentStats(apptData.data);
            }
          }
        }

        // Fetch patients data (ALL patterns)
        const patientResponse = await fetch(`/api/healthcare-admin/reports/patients?${params}`, { signal });
        if (patientResponse.ok) {
          const patientData = await patientResponse.json();
          if (!signal.aborted) {
            setPatientStats(patientData.data);
          }
        }

        // Fetch disease data (Pattern 2 & 3)
        if (requiresMedicalRecord) {
          const diseaseResponse = await fetch(`/api/healthcare-admin/reports/diseases?${params}`, { signal });
          if (diseaseResponse.ok) {
            const diseaseData = await diseaseResponse.json();
            if (!signal.aborted) {
              setDiseaseStats(diseaseData.data);
            }
          }
        }
      } catch (err: any) {
        // Ignore AbortError - it's expected when component unmounts or filters change
        if (err.name === 'AbortError') {
          console.log('Fetch aborted - filters changed or component unmounted');
          return;
        }
        console.error('Error fetching report data:', err);
        if (!signal.aborted) {
          setError('Failed to load report data. Please try again.');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchReportData();

    // Cleanup: abort any in-flight requests when dependencies change or component unmounts
    return () => {
      abortController.abort();
    };
  }, [serviceId, startDate, endDate, barangayId, requiresAppointment, requiresMedicalRecord]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
        <p className="font-semibold">Error Loading Reports</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Chart Options
  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Appointments Summary (Pattern 1 & 2) */}
        {requiresAppointment && appointmentStats && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{appointmentStats.summary.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{appointmentStats.summary.completed}</p>
              <p className="text-xs text-gray-500 mt-1">{appointmentStats.completion_rate}% completion rate</p>
            </div>
          </>
        )}

        {/* Patients Summary (ALL patterns) */}
        {patientStats && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{patientStats.summary.total_patients}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{patientStats.summary.active}</p>
            </div>
          </>
        )}

        {/* Disease Summary (Pattern 2 & 3) */}
        {requiresMedicalRecord && diseaseStats && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Disease Cases</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{diseaseStats.summary.total_cases}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Unique Patients</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{diseaseStats.summary.unique_patients}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointment Status Breakdown - Bar Chart (Pattern 1 & 2) */}
        {requiresAppointment && appointmentStats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Status</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: appointmentStats.status_breakdown.map(item => item.status),
                  datasets: [
                    {
                      label: 'Count',
                      data: appointmentStats.status_breakdown.map(item => item.count),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',  // Completed - green
                        'rgba(59, 130, 246, 0.8)',  // Scheduled - blue
                        'rgba(239, 68, 68, 0.8)',   // Cancelled - red
                        'rgba(251, 146, 60, 0.8)',  // No Show - orange
                        'rgba(234, 179, 8, 0.8)',   // In Progress - yellow
                        'rgba(168, 85, 247, 0.8)',  // Verified - purple
                      ],
                      borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(251, 146, 60, 1)',
                        'rgba(234, 179, 8, 1)',
                        'rgba(168, 85, 247, 1)',
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={barChartOptions}
              />
            </div>
          </div>
        )}

        {/* Patients by Status - Pie Chart (ALL patterns) */}
        {patientStats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patients by Status</h3>
            <div className="h-64">
              <Pie
                data={{
                  labels: patientStats.status_breakdown.map(item => item.status),
                  datasets: [
                    {
                      label: 'Count',
                      data: patientStats.status_breakdown.map(item => item.count),
                      backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',  // Active - green
                        'rgba(156, 163, 175, 0.8)', // Inactive - gray
                        'rgba(239, 68, 68, 0.8)',   // Suspended - red
                      ],
                      borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(156, 163, 175, 1)',
                        'rgba(239, 68, 68, 1)',
                      ],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={pieChartOptions}
              />
            </div>
          </div>
        )}

        {/* Appointment Trend - Line Chart (Pattern 1 & 2) */}
        {requiresAppointment && appointmentStats && appointmentStats.trend_data.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments Trend</h3>
            <div className="h-64">
              <Line
                data={{
                  labels: appointmentStats.trend_data.map(item =>
                    new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  ),
                  datasets: [
                    {
                      label: 'Appointments',
                      data: appointmentStats.trend_data.map(item => item.count),
                      borderColor: 'rgba(59, 130, 246, 1)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.3,
                      fill: true,
                    },
                  ],
                }}
                options={lineChartOptions}
              />
            </div>
          </div>
        )}

        {/* Disease Cases by Type - Bar Chart (Pattern 2 & 3) */}
        {requiresMedicalRecord && diseaseStats && diseaseStats.disease_breakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disease Cases by Type</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: diseaseStats.disease_breakdown.map(item => {
                    // Format disease names: handle both standard types (hiv_aids) and custom names (Leptospirosis)
                    // If the disease_type contains underscores, it's a standard type that needs formatting
                    // If it doesn't, it's already a custom disease name from the API
                    if (item.disease_type.includes('_')) {
                      return getDiseaseDisplayName(item.disease_type, null);
                    }
                    return item.disease_type; // Already formatted custom disease name
                  }),
                  datasets: [
                    {
                      label: 'Cases',
                      data: diseaseStats.disease_breakdown.map(item => item.count),
                      backgroundColor: 'rgba(239, 68, 68, 0.8)',
                      borderColor: 'rgba(239, 68, 68, 1)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={barChartOptions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
