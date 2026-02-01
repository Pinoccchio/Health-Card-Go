'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { useAuth } from '@/lib/auth/useAuth';
import ReportsCharts from '@/components/healthcare-admin/ReportsCharts';
import ReportsFilters from '@/components/healthcare-admin/ReportsFilters';
import ExportButtons from '@/components/healthcare-admin/ExportButtons';
import { Users, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';

type TabId = 'appointments' | 'patients' | 'diseases';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const ROWS_PER_PAGE = 10;

export default function HealthcareAdminReportsPage() {
  const { user } = useAuth();

  // Service info
  const [serviceName, setServiceName] = useState('');
  const [requiresAppointment, setRequiresAppointment] = useState(true);
  const [serviceLoading, setServiceLoading] = useState(true);

  // Filters — default to "All Time" so all data shows on initial load
  const [startDate, setStartDate] = useState('2000-01-01');
  const [endDate, setEndDate] = useState('2099-12-31');
  const [barangayId, setBarangayId] = useState<number | undefined>(undefined);

  // Applied filters (only update charts when Apply is clicked)
  const [appliedStartDate, setAppliedStartDate] = useState('2000-01-01');
  const [appliedEndDate, setAppliedEndDate] = useState('2099-12-31');
  const [appliedBarangayId, setAppliedBarangayId] = useState<number | undefined>(undefined);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('appointments');

  // Data from charts (for export + table)
  const reportDataRef = useRef<Record<string, any>>({});
  const [reportData, setReportData] = useState<Record<string, any>>({});

  // Table pagination
  const [tablePage, setTablePage] = useState(0);

  // Fetch service info
  useEffect(() => {
    if (!user?.assigned_service_id) {
      setServiceName('No Service Assigned');
      setServiceLoading(false);
      return;
    }

    const fetchService = async () => {
      try {
        const res = await fetch(`/api/services/${user.assigned_service_id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setServiceName(data.data.name);
          setRequiresAppointment(data.data.requires_appointment ?? true);

          // Set initial tab based on service pattern
          if (data.data.requires_appointment) {
            setActiveTab('appointments');
          } else {
            setActiveTab('patients');
          }
        } else {
          setServiceName('Service Not Found');
        }
      } catch {
        setServiceName('Unknown Service');
      } finally {
        setServiceLoading(false);
      }
    };

    fetchService();
  }, [user?.assigned_service_id]);

  // Handle data loaded from charts
  const handleDataLoaded = useCallback((tab: string, data: any) => {
    reportDataRef.current = { ...reportDataRef.current, [tab]: data };
    setReportData(prev => ({ ...prev, [tab]: data }));
  }, []);

  // Apply filters
  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedBarangayId(barangayId);
    setTablePage(0);
  };

  // Reset table page when tab changes
  useEffect(() => {
    setTablePage(0);
  }, [activeTab]);

  // Build available tabs based on service pattern
  const tabs: TabConfig[] = [];
  if (requiresAppointment) {
    tabs.push({ id: 'appointments', label: 'Appointments', icon: CalendarCheck });
  }
  tabs.push({ id: 'patients', label: 'Patients', icon: Users });

  // Current tab's data for export
  const currentTabData = reportData[activeTab] || null;

  // Table data
  const tableData: any[] = currentTabData?.table_data || [];
  const totalPages = Math.ceil(tableData.length / ROWS_PER_PAGE);
  const paginatedRows = tableData.slice(tablePage * ROWS_PER_PAGE, (tablePage + 1) * ROWS_PER_PAGE);

  // Column configs per tab
  const columnConfigs: Record<TabId, { key: string; label: string }[]> = {
    appointments: [
      { key: 'appointment_number', label: 'Queue #' },
      { key: 'appointment_date', label: 'Date' },
      { key: 'appointment_time', label: 'Time' },
      { key: 'patient_number', label: 'Patient #' },
      { key: 'patient_name', label: 'Patient Name' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Reason' },
    ],
    patients: [
      { key: 'patient_number', label: 'Patient #' },
      { key: 'patient_name', label: 'Patient Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact_number', label: 'Contact' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'status', label: 'Status' },
    ],
    diseases: [
      { key: 'disease_type', label: 'Disease' },
      { key: 'patient_name', label: 'Patient' },
      { key: 'barangay', label: 'Barangay' },
      { key: 'severity', label: 'Severity' },
      { key: 'diagnosis_date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ],
  };

  const columns = columnConfigs[activeTab] || [];

  // Status badge color helper
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed' || s === 'active') return 'bg-green-100 text-green-800';
    if (s === 'scheduled' || s === 'pending') return 'bg-blue-100 text-blue-800';
    if (s === 'cancelled' || s === 'inactive' || s === 'suspended') return 'bg-red-100 text-red-800';
    if (s === 'no_show' || s === 'no show') return 'bg-orange-100 text-orange-800';
    if (s === 'in_progress' || s === 'in progress') return 'bg-yellow-100 text-yellow-800';
    if (s === 'checked_in' || s === 'checked in') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (serviceLoading) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Reports & Analytics"
        pageDescription="View detailed reports and analytics for your assigned service"
      >
        <Container>
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Reports & Analytics"
      pageDescription={`Reports for ${serviceName}`}
    >
      <Container>
        <div className="space-y-6">
          {/* Header with export buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">{serviceName}</p>
            </div>
            <ExportButtons
              activeTab={activeTab}
              serviceName={serviceName}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              barangayId={appliedBarangayId}
              data={currentTabData}
            />
          </div>

          {/* Filters */}
          <ReportsFilters
            startDate={startDate}
            endDate={endDate}
            barangayId={barangayId}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onBarangayChange={setBarangayId}
            onApplyFilters={handleApplyFilters}
          />

          {/* Tab Navigation */}
          {tabs.length > 1 && (
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map(tab => {
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
          )}

          {/* Charts */}
          {user?.assigned_service_id && (
            <ReportsCharts
              serviceId={user.assigned_service_id}
              serviceName={serviceName}
              requiresAppointment={requiresAppointment}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              barangayId={appliedBarangayId}
              activeTab={activeTab}
              onDataLoaded={handleDataLoaded}
            />
          )}

          {/* Data Table */}
          {tableData.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'appointments' ? 'Appointment Records' :
                   activeTab === 'patients' ? 'Patient Records' : 'Disease Records'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {tableData.length} record{tableData.length !== 1 ? 's' : ''} found
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {columns.map(col => (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {col.key === 'status' ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row[col.key] || '')}`}>
                                {row[col.key] || 'N/A'}
                              </span>
                            ) : (
                              row[col.key] ?? 'N/A'
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {tablePage * ROWS_PER_PAGE + 1} to {Math.min((tablePage + 1) * ROWS_PER_PAGE, tableData.length)} of {tableData.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTablePage(p => Math.max(0, p - 1))}
                      disabled={tablePage === 0}
                      className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={tablePage >= totalPages - 1}
                      className="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state for table when no data */}
          {currentTabData && tableData.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No records found for the selected filters.</p>
            </div>
          )}
        </div>
      </Container>
    </DashboardLayout>
  );
}
