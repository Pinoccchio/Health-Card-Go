'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import {
  Activity,
  PlusCircle,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface DiseaseRecord {
  id: string;
  disease_type: string;
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
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

const DISEASE_TYPES = [
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
];

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'under_treatment', label: 'Under Treatment' },
];

export default function StaffDiseaseSurveillancePage() {
  const [records, setRecords] = useState<DiseaseRecord[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiseaseRecord | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    disease_type: 'dengue',
    diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
    severity: 'mild',
    status: 'active',
    barangay_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchRecords();
    fetchBarangays();
  }, [diseaseFilter]);

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

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({ limit: '100' });
      if (diseaseFilter !== 'all') {
        params.append('type', diseaseFilter);
      }

      const response = await fetch(`/api/diseases?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
      } else {
        setError('Failed to load disease records');
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/diseases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          barangay_id: parseInt(formData.barangay_id),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Disease record created successfully');
        setFormData({
          disease_type: 'dengue',
          diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
          severity: 'mild',
          status: 'active',
          barangay_id: '',
          notes: '',
        });
        fetchRecords();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to create disease record');
      }
    } catch (err) {
      console.error('Error creating record:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (record: DiseaseRecord) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const getSeverityBadge = (severity?: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      mild: { color: 'bg-yellow-100 text-yellow-800', icon: CheckCircle },
      moderate: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      severe: { color: 'bg-red-100 text-red-800', icon: XCircle },
      critical: { color: 'bg-purple-100 text-purple-800', icon: AlertTriangle },
    };

    const config = configs[severity?.toLowerCase() || 'mild'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {severity || 'Unknown'}
      </span>
    );
  };

  // Statistics
  const stats = {
    total: records.length,
    this_month: records.filter(r => {
      const recordDate = new Date(r.diagnosis_date);
      const now = new Date();
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    }).length,
    active: records.filter(r => r.status === 'active' || r.status === 'under_treatment').length,
  };

  // Table columns
  const tableColumns = [
    {
      header: 'Disease Type',
      accessor: 'disease_type',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-gray-900">
          {DISEASE_TYPES.find(d => d.value === value)?.label || value}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'diagnosis_date',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Calendar className="w-3 h-3 text-gray-400" />
          {format(new Date(value), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      header: 'Barangay',
      accessor: 'barangay',
      sortable: false,
      render: (_: any, row: DiseaseRecord) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <MapPin className="w-3 h-3 text-gray-400" />
          {row.barangays?.name || 'Unknown'}
        </div>
      ),
    },
    {
      header: 'Severity',
      accessor: 'severity',
      sortable: true,
      render: (value: string) => getSeverityBadge(value),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm capitalize text-gray-700">{value.replace('_', ' ')}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: DiseaseRecord) => (
        <button
          onClick={() => handleViewDetails(row)}
          className="text-sm text-primary-teal hover:text-primary-teal-dark font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Surveillance"
      pageDescription="Record and monitor disease cases across Panabo City"
    >
      <Container size="full">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Records</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
              </div>
              <Activity className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">This Month</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.this_month}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Active Cases</p>
                <p className="text-3xl font-bold text-orange-900 mt-2">{stats.active}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500 opacity-80" />
            </div>
          </ProfessionalCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Disease Entry Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-primary-teal" />
                <h3 className="text-lg font-semibold text-gray-900">New Disease Record</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={formData.disease_type}
                    onChange={(e) => setFormData({ ...formData, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {DISEASE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis Date
                  </label>
                  <input
                    type="date"
                    value={formData.diagnosis_date}
                    onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={formData.barangay_id}
                    onChange={(e) => setFormData({ ...formData, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {SEVERITY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Additional information about the case..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-teal text-white py-2 px-4 rounded-md hover:bg-primary-teal-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  {submitting ? 'Recording...' : 'Record Disease Case'}
                </button>
              </form>
            </div>
          </div>

          {/* Disease Records Table */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Disease Records</h3>

                {/* Disease Filter */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setDiseaseFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      diseaseFilter === 'all'
                        ? 'bg-primary-teal text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Diseases
                  </button>
                  {DISEASE_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setDiseaseFilter(type.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        diseaseFilter === type.value
                          ? 'bg-primary-teal text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading records...</p>
                </div>
              ) : (
                <EnhancedTable
                  columns={tableColumns}
                  data={records}
                  searchable
                  searchPlaceholder="Search by disease type, barangay..."
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  paginated
                  pageSize={10}
                />
              )}
            </div>
          </div>
        </div>

        {/* Disease Record Details Drawer */}
        {selectedRecord && (
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            size="lg"
            title="Disease Record Details"
            subtitle={DISEASE_TYPES.find(d => d.value === selectedRecord.disease_type)?.label || selectedRecord.disease_type}
          >
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Case Information</h4>
                <div className="bg-gray-50 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Disease Type:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {DISEASE_TYPES.find(d => d.value === selectedRecord.disease_type)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Diagnosis Date:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedRecord.diagnosis_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Barangay:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedRecord.barangays?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Severity:</span>
                    {getSeverityBadge(selectedRecord.severity)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {selectedRecord.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Recorded:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(selectedRecord.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>

              {selectedRecord.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                  <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700">
                    {selectedRecord.notes}
                  </div>
                </div>
              )}
            </div>
          </Drawer>
        )}
      </Container>
    </DashboardLayout>
  );
}
