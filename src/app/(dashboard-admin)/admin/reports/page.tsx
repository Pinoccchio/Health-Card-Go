'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import AdminReportsCharts from '@/components/admin/reports/AdminReportsCharts';
import AdminReportsFilters from '@/components/admin/reports/AdminReportsFilters';
import AdminExportButtons from '@/components/admin/reports/AdminExportButtons';
import AppointmentReportTable from '@/components/admin/reports/AppointmentReportTable';
import PatientReportTable from '@/components/admin/reports/PatientReportTable';
import DiseaseReportTable from '@/components/admin/reports/DiseaseReportTable';
import FeedbackReportTable from '@/components/admin/reports/FeedbackReportTable';
import {
  CalendarCheck,
  Users,
  Activity,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  ThumbsUp,
  Clock,
  Shield,
} from 'lucide-react';

type TabId = 'appointments' | 'patients' | 'diseases' | 'feedback';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'diseases', label: 'Diseases', icon: Activity },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

const API_ENDPOINTS: Record<TabId, string> = {
  appointments: '/api/admin/reports/appointments',
  patients: '/api/admin/reports/patients',
  diseases: '/api/admin/reports/diseases',
  feedback: '/api/admin/reports/feedback',
};

export default function AdminReportsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('appointments');

  // Filters — default to "All Time"
  const [startDate, setStartDate] = useState('2000-01-01');
  const [endDate, setEndDate] = useState('2099-12-31');
  const [serviceId, setServiceId] = useState<number | undefined>(undefined);
  const [barangayId, setBarangayId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [diseaseType, setDiseaseType] = useState<string | undefined>(undefined);

  // Applied filters (only update when Apply is clicked)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: '2000-01-01',
    endDate: '2099-12-31',
    serviceId: undefined as number | undefined,
    barangayId: undefined as number | undefined,
    status: undefined as string | undefined,
    diseaseType: undefined as string | undefined,
  });

  // Data per tab (cached)
  const dataRef = useRef<Record<string, any>>({});
  const [tabData, setTabData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data for the active tab
  const fetchData = useCallback(async (tab: TabId, filters: typeof appliedFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('start_date', filters.startDate);
      params.set('end_date', filters.endDate);
      if (filters.serviceId) params.set('service_id', String(filters.serviceId));
      if (filters.barangayId) params.set('barangay_id', String(filters.barangayId));
      if (filters.status && tab === 'appointments') params.set('status', filters.status);
      if (filters.diseaseType && tab === 'diseases') params.set('disease_type', filters.diseaseType);

      const res = await fetch(`${API_ENDPOINTS[tab]}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${tab} data`);
      }

      const data = await res.json();
      dataRef.current = { ...dataRef.current, [tab]: data };
      setTabData(prev => ({ ...prev, [tab]: data }));
    } catch (err) {
      console.error(`Error fetching ${tab} report:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when applied filters or active tab changes
  useEffect(() => {
    fetchData(activeTab, appliedFilters);
  }, [activeTab, appliedFilters, fetchData]);

  // Apply filters handler
  const handleApplyFilters = () => {
    // Clear cached data so all tabs re-fetch with new filters
    dataRef.current = {};
    setTabData({});
    setAppliedFilters({
      startDate,
      endDate,
      serviceId,
      barangayId,
      status,
      diseaseType,
    });
  };

  // Current tab data
  const currentData = tabData[activeTab] || null;

  // Summary cards per tab
  const renderSummaryCards = () => {
    if (!currentData?.summary) return null;
    const s = currentData.summary;

    let cards: { label: string; value: string | number; icon: React.ElementType; color: string; subLabel?: string }[] = [];

    switch (activeTab) {
      case 'appointments':
        cards = [
          { label: 'Total Appointments', value: s.total || 0, icon: CalendarCheck, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: s.completed || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Cancelled', value: s.cancelled || 0, icon: XCircle, color: 'text-red-600 bg-red-50' },
          { label: 'No Show', value: s.no_show || 0, icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', subLabel: `${currentData.completion_rate || '0.0'}% completion` },
        ];
        break;
      case 'patients':
        cards = [
          { label: 'Total Patients', value: s.total_patients || 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active', value: s.active || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Suspended', value: s.suspended || 0, icon: Shield, color: 'text-red-600 bg-red-50' },
          { label: 'Pending', value: s.pending || 0, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
        ];
        break;
      case 'diseases':
        cards = [
          { label: 'Total Cases', value: s.total_cases || 0, icon: Activity, color: 'text-blue-600 bg-blue-50' },
          { label: 'High Risk', value: s.high_risk || 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Medium Risk', value: s.medium_risk || 0, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
          { label: 'Low Risk', value: s.low_risk || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
        ];
        break;
      case 'feedback':
        cards = [
          { label: 'Total Feedback', value: s.total || 0, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
          { label: 'Avg Rating', value: `${s.average_rating || '0.0'}/5`, icon: Star, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Recommend Rate', value: `${s.would_recommend_rate || '0.0'}%`, icon: ThumbsUp, color: 'text-green-600 bg-green-50' },
          { label: 'Responded', value: s.responded_count || 0, icon: CheckCircle, color: 'text-purple-600 bg-purple-50', subLabel: `of ${s.total || 0} feedback` },
        ];
        break;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${card.color.split(' ')[1]}`}>
                  <Icon className={`w-5 h-5 ${card.color.split(' ')[0]}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  {card.subLabel && (
                    <p className="text-xs text-gray-400 mt-0.5">{card.subLabel}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render the appropriate table component
  const renderTable = () => {
    const tableData = currentData?.table_data || [];

    switch (activeTab) {
      case 'appointments':
        return <AppointmentReportTable data={tableData} loading={loading} />;
      case 'patients':
        return <PatientReportTable data={tableData} loading={loading} />;
      case 'diseases':
        return <DiseaseReportTable data={tableData} loading={loading} />;
      case 'feedback':
        return <FeedbackReportTable data={tableData} loading={loading} />;
    }
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports & Analytics"
      pageDescription="Comprehensive system-wide reports and analytics"
    >
      <Container>
        <div className="space-y-6">
          {/* Header with export buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">System-wide reports across all services</p>
            </div>
            <AdminExportButtons
              activeTab={activeTab}
              startDate={appliedFilters.startDate}
              endDate={appliedFilters.endDate}
              serviceId={appliedFilters.serviceId}
              barangayId={appliedFilters.barangayId}
              data={currentData}
            />
          </div>

          {/* Filters */}
          <AdminReportsFilters
            startDate={startDate}
            endDate={endDate}
            serviceId={serviceId}
            barangayId={barangayId}
            status={status}
            diseaseType={diseaseType}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onServiceChange={setServiceId}
            onBarangayChange={setBarangayId}
            onStatusChange={setStatus}
            onDiseaseTypeChange={setDiseaseType}
            onApplyFilters={handleApplyFilters}
            activeTab={activeTab}
          />

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => fetchData(activeTab, appliedFilters)}
                className="text-sm text-red-600 underline mt-1"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && !currentData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-5">
                    <div className="animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {currentData && renderSummaryCards()}

          {/* Charts */}
          {currentData && (
            <AdminReportsCharts data={currentData} type={activeTab} />
          )}

          {/* Data Table */}
          {currentData && renderTable()}

          {/* Empty state */}
          {currentData && (!currentData.table_data || currentData.table_data.length === 0) && !loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No records found for the selected filters.</p>
            </div>
          )}
        </div>
      </Container>
    </DashboardLayout>
  );
}
