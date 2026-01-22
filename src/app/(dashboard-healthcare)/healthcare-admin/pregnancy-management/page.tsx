'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/auth';
import {
  Baby,
  Activity,
  PlusCircle,
  Calendar,
  MapPin,
  AlertTriangle,
  TrendingUp,
  FileText,
  Download,
  Filter,
  AlertCircle,
  Heart,
  Sparkles,
  Loader2,
  CheckCircle2,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import ServiceHistoricalImportModal from '@/components/healthcare-admin/ServiceHistoricalImportModal';
import ServiceSARIMAChart from '@/components/healthcare-admin/ServiceSARIMAChart';
import ServiceSARIMAMetrics from '@/components/healthcare-admin/ServiceSARIMAMetrics';

interface PregnancyRecord {
  id: string;
  disease_type: string;
  custom_disease_name?: string;
  diagnosis_date: string;
  severity?: string;
  status: string;
  barangay_id: number;
  patient_id?: string;
  notes?: string;
  created_at: string;
  barangays?: {
    name: string;
    code: string;
  };
  patients?: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active/Ongoing' },
  { value: 'under_treatment', label: 'Under Treatment' },
  { value: 'recovered', label: 'Recovered/Delivered' },
  { value: 'deceased', label: 'Deceased' },
];

export default function PregnancyManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<PregnancyRecord[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    barangay_id: 'all',
    severity: 'all',
    status: 'all',
    start_date: '',
    end_date: '',
  });

  // Summary stats
  const [summary, setSummary] = useState({
    total_cases: 0,
    active_cases: 0,
    under_treatment: 0,
    recovered: 0,
    deceased: 0,
    most_affected_barangay: null as string | null,
  });

  // Import and SARIMA state
  const [isAppointmentImportOpen, setIsAppointmentImportOpen] = useState(false);
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  useEffect(() => {
    // Check if the healthcare admin has pregnancy category
    if (user) {
      const isPregnancyAdmin = user.role_id === 2 && user.admin_category === 'pregnancy';
      const isSuperAdmin = user.role_id === 1;

      if (!isPregnancyAdmin && !isSuperAdmin) {
        setHasAccess(false);
        toast.error('You do not have permission to access this page. This page is only for Healthcare Admins with Pregnancy category.');
        router.push('/healthcare-admin/dashboard');
      } else {
        setHasAccess(true);
        fetchBarangays();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      fetchPregnancyRecords();
    }
  }, [filters, hasAccess]);

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/barangays');
      const data = await response.json();
      if (data.success) {
        setBarangays(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const fetchPregnancyRecords = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('disease_type', 'pregnancy_complications');

      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }
      if (filters.severity !== 'all') {
        params.append('severity', filters.severity);
      }
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
        calculateSummary(data.data || []);
      } else {
        toast.error('Failed to load pregnancy complication records');
      }
    } catch (err) {
      console.error('Error fetching pregnancy records:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: PregnancyRecord[]) => {
    const stats = {
      total_cases: data.length,
      active_cases: data.filter(r => r.status === 'active').length,
      under_treatment: data.filter(r => r.status === 'under_treatment').length,
      recovered: data.filter(r => r.status === 'recovered').length,
      deceased: data.filter(r => r.status === 'deceased').length,
      most_affected_barangay: null as string | null,
    };

    // Find most affected barangay
    const barangayCounts: Record<string, number> = {};
    data.forEach(record => {
      const barangayName = record.barangays?.name || 'Unknown';
      barangayCounts[barangayName] = (barangayCounts[barangayName] || 0) + 1;
    });

    const sortedBarangays = Object.entries(barangayCounts).sort((a, b) => b[1] - a[1]);
    if (sortedBarangays.length > 0) {
      stats.most_affected_barangay = `${sortedBarangays[0][0]} (${sortedBarangays[0][1]} cases)`;
    }

    setSummary(stats);
  };

  const handleGeneratePredictions = async () => {
    setIsGeneratingPredictions(true);
    setGenerationStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/services/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 17,
          months_forecast: 12,
          granularity: 'monthly',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerationStatus({ type: 'success', message: `Generated predictions for ${data.data?.total_predictions || 0} months` });
        setPredictionRefreshKey(prev => prev + 1);
        toast.success('Predictions generated successfully');
      } else {
        setGenerationStatus({ type: 'error', message: data.error || 'Failed to generate predictions' });
        toast.error(data.error || 'Failed to generate predictions');
      }
    } catch (error) {
      console.error('Generate predictions error:', error);
      setGenerationStatus({ type: 'error', message: 'An unexpected error occurred' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Pregnancy Complications Management"
        pageDescription="Manage pregnancy-related complications"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
              <p className="mt-2 text-sm text-gray-500">Checking access permissions...</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  // Show access denied message if no access
  if (hasAccess === false) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Pregnancy Complications Management"
        pageDescription="Access Denied"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="p-3 bg-red-100 rounded-full inline-block mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You do not have permission to access this page. This page is only available to Healthcare Admins with Pregnancy category.
              </p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Pregnancy Complications Management"
      pageDescription="Track and manage pregnancy-related complications"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Baby className="w-6 h-6 text-[#20C997]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pregnancy Complications Management</h1>
                <p className="text-sm text-gray-600">Monitor and track pregnancy-related health complications</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3">
            <a
              href="/templates/pregnancy-appointment-import-template.xlsx"
              download
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
              title="Download Excel Template"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button
              onClick={() => setIsAppointmentImportOpen(true)}
              className="px-4 py-2 bg-[#20C997] text-white rounded-md hover:bg-[#1AA179] transition-colors flex items-center gap-2 shadow-sm"
              title="Import Appointment Data"
            >
              <Upload className="w-4 h-4" />
              Import Appointment Data
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Total Cases</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total_cases}</p>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-medium text-red-700">Active Cases</h3>
              </div>
              <p className="text-2xl font-bold text-red-900">{summary.active_cases}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-medium text-yellow-700">Under Treatment</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{summary.under_treatment}</p>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-green-700">Recovered/Delivered</h3>
              </div>
              <p className="text-2xl font-bold text-green-900">{summary.recovered}</p>
            </div>

            <div className="bg-gray-50 rounded-lg shadow p-4 border border-gray-300">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Deceased</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.deceased}</p>
            </div>

            <div className="bg-pink-50 rounded-lg shadow p-4 border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-pink-600" />
                <h3 className="text-sm font-medium text-pink-700">Most Affected</h3>
              </div>
              <p className="text-sm font-bold text-pink-900 truncate">
                {summary.most_affected_barangay || 'N/A'}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filter Records</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Barangay</label>
                <select
                  value={filters.barangay_id}
                  onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                >
                  <option value="all">All Barangays</option>
                  {barangays.map(barangay => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                >
                  <option value="all">All Severity</option>
                  {SEVERITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                >
                  <option value="all">All Status</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Pregnancy Complication Cases</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading pregnancy complication records...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="p-12 text-center">
                  <Baby className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pregnancy complication cases found matching your filters</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Barangay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(record.diagnosis_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.patients ?
                            `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}` :
                            'Anonymous'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.barangays?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${record.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              record.severity === 'severe' ? 'bg-orange-100 text-orange-800' :
                              record.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'}`}>
                            {record.severity || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${record.status === 'active' ? 'bg-red-100 text-red-800' :
                              record.status === 'under_treatment' ? 'bg-yellow-100 text-yellow-800' :
                              record.status === 'recovered' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {STATUS_OPTIONS.find(s => s.value === record.status)?.label || record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SARIMA Predictions Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Prenatal Appointment Forecast (SARIMA)</h3>
                    <p className="text-sm text-gray-600">AI-powered predictions for prenatal checkup demand</p>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePredictions}
                  disabled={isGeneratingPredictions}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#20C997] text-white rounded-lg hover:bg-[#1AA179] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isGeneratingPredictions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Predictions
                    </>
                  )}
                </button>
              </div>
              {generationStatus.type !== 'idle' && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  generationStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {generationStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <p className={`text-sm ${generationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {generationStatus.message}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6">
              <ServiceSARIMAChart key={predictionRefreshKey} serviceId={17} />
              <div className="mt-6">
                <ServiceSARIMAMetrics key={predictionRefreshKey} serviceId={17} />
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Import Modal */}
        <ServiceHistoricalImportModal
          isOpen={isAppointmentImportOpen}
          onClose={() => setIsAppointmentImportOpen(false)}
          onImportSuccess={() => {
            toast.success('Appointment data imported successfully');
            setPredictionRefreshKey(prev => prev + 1);
          }}
          serviceId={17}
          serviceName="Prenatal Checkup"
        />
      </Container>
    </DashboardLayout>
  );
}