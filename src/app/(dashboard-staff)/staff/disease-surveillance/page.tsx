'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { HistoricalDataForm } from '@/components/staff/HistoricalDataForm';
import { HistoricalStatsSummary } from '@/components/staff/HistoricalStatsSummary';
import { IndividualCasesSummary } from '@/components/staff/IndividualCasesSummary';
import { HistoricalStatisticsTable } from '@/components/staff/HistoricalStatisticsTable';
import { EditHistoricalRecordModal } from '@/components/staff/EditHistoricalRecordModal';
import { EditDiseaseCaseModal } from '@/components/staff/EditDiseaseCaseModal';
import { IndividualCasesReportGenerator } from '@/components/staff/IndividualCasesReportGenerator';
import { HistoricalStatisticsReportGenerator } from '@/components/staff/HistoricalStatisticsReportGenerator';
import { PatientSearchField } from '@/components/staff/PatientSearchField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/contexts/ToastContext';
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
  Database,
  User,
  Users,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface DiseaseRecord {
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
  anonymous_patient_data?: {
    name: string;
    age: number;
    gender: string;
    barangay_id?: number;
  };
}

const DISEASE_TYPES = [
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'other', label: 'Other (Custom Disease)' },
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

/**
 * Get display name for disease type
 * Shows custom_disease_name for 'other' type, otherwise shows standard label
 */
function getDiseaseDisplayName(diseaseType: string, customDiseaseName?: string): string {
  if (diseaseType === 'other' && customDiseaseName) {
    return customDiseaseName;
  }
  return DISEASE_TYPES.find(d => d.value === diseaseType)?.label || diseaseType;
}

export default function StaffDiseaseSurveillancePage() {
  const [records, setRecords] = useState<DiseaseRecord[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiseaseRecord | null>(null);
  const [isHistoricalFormOpen, setIsHistoricalFormOpen] = useState(false);
  const [isIndividualCasesReportOpen, setIsIndividualCasesReportOpen] = useState(false);
  const [isHistoricalStatsReportOpen, setIsHistoricalStatsReportOpen] = useState(false);

  // Toast notifications
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'individual-cases' | 'historical-statistics'>('individual-cases');

  // Historical statistics state
  const [historicalStatistics, setHistoricalStatistics] = useState<any[]>([]);
  const [historicalSummary, setHistoricalSummary] = useState<any>({
    totalRecords: 0,
    totalCases: 0,
    earliestDate: null,
    latestDate: null,
    mostCommonDisease: null,
    diseaseTypeCounts: {},
  });
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalFilters, setHistoricalFilters] = useState({
    disease_type: 'all',
    barangay_id: 'all',
    start_date: '',
    end_date: '',
  });
  const [editingHistoricalRecord, setEditingHistoricalRecord] = useState<any | null>(null);
  const [isEditHistoricalModalOpen, setIsEditHistoricalModalOpen] = useState(false);

  // Delete confirmation states for historical records
  const [showDeleteHistoricalDialog, setShowDeleteHistoricalDialog] = useState(false);
  const [historicalRecordToDelete, setHistoricalRecordToDelete] = useState<any | null>(null);
  const [deleteHistoricalLoading, setDeleteHistoricalLoading] = useState(false);

  // Individual cases action menu and CRUD states
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const [showDeleteCaseDialog, setShowDeleteCaseDialog] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<DiseaseRecord | null>(null);
  const [deleteCaseLoading, setDeleteCaseLoading] = useState(false);
  const [editingCase, setEditingCase] = useState<DiseaseRecord | null>(null);
  const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');

  // Patient entry mode: 'patient' for known patient, 'anonymous' for walk-in
  const [entryMode, setEntryMode] = useState<'patient' | 'anonymous'>('patient');
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    age: number;
    gender: string;
    barangay_id: number;
    barangay_name: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    disease_type: 'dengue',
    custom_disease_name: '',
    diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
    severity: 'mild',
    status: 'active',
    barangay_id: '',
    notes: '',
    // Patient information (for anonymous disease cases - only used when entryMode is 'anonymous')
    patient_name: '',
    patient_age: '',
    patient_gender: 'male',
  });

  useEffect(() => {
    fetchRecords();
    fetchBarangays();
  }, [diseaseFilter]);

  // Fetch historical statistics when tab is active or filters change
  useEffect(() => {
    if (activeTab === 'historical-statistics') {
      fetchHistoricalStatistics();
    }
  }, [activeTab, historicalFilters]);

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

      const params = new URLSearchParams({ limit: '100' });
      if (diseaseFilter !== 'all') {
        params.append('type', diseaseFilter);
      }

      const response = await fetch(`/api/diseases?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data || []);
      } else {
        toast.error('Failed to load disease records');
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalStatistics = async () => {
    try {
      setLoadingHistorical(true);

      const params = new URLSearchParams();
      if (historicalFilters.disease_type !== 'all') {
        params.append('disease_type', historicalFilters.disease_type);
      }
      if (historicalFilters.barangay_id !== 'all') {
        params.append('barangay_id', historicalFilters.barangay_id);
      }
      if (historicalFilters.start_date) {
        params.append('start_date', historicalFilters.start_date);
      }
      if (historicalFilters.end_date) {
        params.append('end_date', historicalFilters.end_date);
      }

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHistoricalStatistics(data.data || []);
        setHistoricalSummary(data.summary || {
          totalRecords: 0,
          totalCases: 0,
          earliestDate: null,
          latestDate: null,
          mostCommonDisease: null,
          diseaseTypeCounts: {},
        });
      } else {
        toast.error('Failed to load historical disease statistics');
      }
    } catch (err) {
      console.error('Error fetching historical statistics:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingHistorical(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validation: Check that we have either a selected patient or anonymous patient data
    if (entryMode === 'patient' && !selectedPatient) {
      toast.error('Please select a patient or switch to Walk-In mode');
      setSubmitting(false);
      return;
    }

    if (entryMode === 'anonymous' && (!formData.patient_name || !formData.patient_age)) {
      toast.error('Please fill in all patient information fields');
      setSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        disease_type: formData.disease_type,
        custom_disease_name: formData.disease_type === 'other' ? formData.custom_disease_name : undefined,
        diagnosis_date: formData.diagnosis_date,
        severity: formData.severity,
        status: formData.status,
        barangay_id: entryMode === 'patient' && selectedPatient
          ? selectedPatient.barangay_id
          : parseInt(formData.barangay_id),
        notes: formData.notes || undefined,
      };

      // Add patient_id for known patients OR anonymous_patient_data for walk-ins
      if (entryMode === 'patient' && selectedPatient) {
        payload.patient_id = selectedPatient.id;
      } else {
        payload.anonymous_patient_data = {
          name: formData.patient_name,
          age: parseInt(formData.patient_age),
          gender: formData.patient_gender,
          barangay_id: parseInt(formData.barangay_id),
        };
      }

      const response = await fetch('/api/diseases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Disease record created successfully');
        setFormData({
          disease_type: 'dengue',
          custom_disease_name: '',
          diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
          severity: 'mild',
          status: 'active',
          barangay_id: '',
          notes: '',
          patient_name: '',
          patient_age: '',
          patient_gender: 'male',
        });
        setSelectedPatient(null);
        fetchRecords();
      } else {
        toast.error(data.error || 'Failed to create disease record');
      }
    } catch (err) {
      console.error('Error creating record:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (record: DiseaseRecord) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const handleEditHistoricalRecord = (record: any) => {
    setEditingHistoricalRecord(record);
    setIsEditHistoricalModalOpen(true);
  };

  const handleDeleteHistoricalClick = (record: any) => {
    setHistoricalRecordToDelete(record);
    setShowDeleteHistoricalDialog(true);
  };

  const handleConfirmDeleteHistorical = async (reason?: string) => {
    if (!historicalRecordToDelete) return;

    setDeleteHistoricalLoading(true);
    try {
      const response = await fetch(`/api/diseases/historical/${historicalRecordToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Historical record deleted successfully');
        fetchHistoricalStatistics();
        setShowDeleteHistoricalDialog(false);
        setHistoricalRecordToDelete(null);
      } else {
        toast.error(data.error || 'Failed to delete historical record');
      }
    } catch (err) {
      console.error('Error deleting historical record:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setDeleteHistoricalLoading(false);
    }
  };

  // Individual case action handlers
  const toggleActionMenu = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openActionMenuId === id) {
      setOpenActionMenuId(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setActionMenuPosition({
        top: rect.top,
        left: rect.left - 224 - 8, // 224px menu width + 8px spacing
      });
      setOpenActionMenuId(id);
    }
  };

  const handleDeleteCaseClick = (record: DiseaseRecord) => {
    setCaseToDelete(record);
    setShowDeleteCaseDialog(true);
    setOpenActionMenuId(null);
  };

  const handleConfirmDeleteCase = async (reason?: string) => {
    if (!caseToDelete) return;

    setDeleteCaseLoading(true);
    try {
      const response = await fetch(`/api/diseases/${caseToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Disease case deleted successfully');
        fetchRecords();
        setShowDeleteCaseDialog(false);
        setCaseToDelete(null);
      } else {
        toast.error(data.error || 'Failed to delete disease case');
      }
    } catch (err) {
      console.error('Error deleting disease case:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setDeleteCaseLoading(false);
    }
  };

  const handleEditCase = (record: DiseaseRecord) => {
    setEditingCase(record);
    setIsEditCaseModalOpen(true);
    setOpenActionMenuId(null);
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
      render: (value: string, row: DiseaseRecord) => (
        <span className="font-medium text-gray-900">
          {getDiseaseDisplayName(value, row.custom_disease_name)}
        </span>
      ),
    },
    {
      header: 'Patient',
      accessor: 'patient_info',
      sortable: false,
      render: (_: any, row: DiseaseRecord) => {
        // Registered patient
        if (row.patients && row.patients.profiles) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-teal/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-teal" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {row.patients.profiles.first_name} {row.patients.profiles.last_name}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {row.patients.patient_number}
                </div>
              </div>
            </div>
          );
        }

        // Anonymous walk-in patient
        if (row.anonymous_patient_data) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {row.anonymous_patient_data.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    WALK-IN
                  </span>
                  <span className="text-xs text-gray-500">
                    {row.anonymous_patient_data.age}y • {row.anonymous_patient_data.gender.charAt(0).toUpperCase() + row.anonymous_patient_data.gender.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        // No patient data
        return (
          <span className="text-sm text-gray-400 italic">No patient info</span>
        );
      },
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
        <div className="relative inline-block text-left">
          <button
            onClick={(e) => toggleActionMenu(row.id, e)}
            className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="More actions"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {openActionMenuId === row.id && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setOpenActionMenuId(null)}
                aria-hidden="true"
              />

              {/* Dropdown Menu */}
              <div
                className="fixed z-[9999] w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                style={{
                  top: `${actionMenuPosition.top}px`,
                  left: `${actionMenuPosition.left}px`,
                }}
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleViewDetails(row);
                      setOpenActionMenuId(null);
                    }}
                    className="group flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    View Details
                  </button>
                  <button
                    onClick={() => handleEditCase(row)}
                    className="group flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    Edit Case
                  </button>
                  <button
                    onClick={() => handleDeleteCaseClick(row)}
                    className="group flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                    Delete Case
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('individual-cases')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'individual-cases'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Individual Cases
              </div>
            </button>
            <button
              onClick={() => setActiveTab('historical-statistics')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'historical-statistics'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Historical Statistics
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'individual-cases' ? (
          <div className="space-y-6">
            {/* Summary Statistics for Individual Cases */}
            <IndividualCasesSummary stats={stats} loading={loading} />

            {/* Action Bar for Individual Cases */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsIndividualCasesReportOpen(true)}
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors flex items-center gap-2 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Generate Individual Cases Report
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Disease Entry Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6 isolate">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-primary-teal" />
                <h3 className="text-lg font-semibold text-gray-900">New Disease Record</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Patient Entry Mode Toggle */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Patient Entry Mode</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEntryMode('patient')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        entryMode === 'patient'
                          ? 'bg-primary-teal text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      Known Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode('anonymous')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        entryMode === 'anonymous'
                          ? 'bg-primary-teal text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Walk-In
                    </button>
                  </div>
                </div>

                {/* Patient Information Section */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    {entryMode === 'patient' ? 'Select Patient' : 'Patient Information'}
                  </h4>

                  {entryMode === 'patient' ? (
                    <PatientSearchField
                      selectedPatient={selectedPatient}
                      onSelectPatient={setSelectedPatient}
                      disabled={submitting}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Patient Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.patient_name}
                          onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                          placeholder="Full name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                          required={entryMode === 'anonymous'}
                          maxLength={100}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Age <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.patient_age}
                            onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                            placeholder="Age"
                            min="0"
                            max="150"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                            required={entryMode === 'anonymous'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={formData.patient_gender}
                            onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                            required={entryMode === 'anonymous'}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={formData.disease_type}
                    onChange={(e) => setFormData({ ...formData, disease_type: e.target.value, custom_disease_name: '' })}
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

                {/* Custom Disease Name Input - Only show when "Other" is selected */}
                {formData.disease_type === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Disease Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.custom_disease_name}
                      onChange={(e) => setFormData({ ...formData, custom_disease_name: e.target.value })}
                      placeholder="Enter disease name (e.g., Chickenpox, Tuberculosis)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                      required={formData.disease_type === 'other'}
                      maxLength={100}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Specify the disease name when "Other" is selected
                    </p>
                  </div>
                )}

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
                  {entryMode === 'patient' && selectedPatient ? (
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {selectedPatient.barangay_name}
                      <span className="text-xs text-gray-500 ml-auto">(from patient record)</span>
                    </div>
                  ) : (
                    <select
                      value={formData.barangay_id}
                      onChange={(e) => setFormData({ ...formData, barangay_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                      required={entryMode === 'anonymous'}
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map(barangay => (
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  )}
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
          </div>
        ) : (
          /* Historical Statistics Tab */
          <div className="space-y-6">
            {/* Action Bar for Historical Statistics */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsHistoricalFormOpen(true)}
                className="px-4 py-2 bg-white text-primary-teal border border-primary-teal rounded-md hover:bg-teal-50 transition-colors flex items-center gap-2 shadow-sm"
                title="Import Historical Data"
              >
                <Database className="w-4 h-4" />
                Import Historical Data
              </button>
              <button
                onClick={() => setIsHistoricalStatsReportOpen(true)}
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors flex items-center gap-2 shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Generate Historical Statistics Report
              </button>
            </div>

            {/* Summary Statistics */}
            <HistoricalStatsSummary summary={historicalSummary} loading={loadingHistorical} />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Filter Historical Data</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Disease Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={historicalFilters.disease_type}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Diseases</option>
                    {DISEASE_TYPES.filter(t => t.value !== 'other').map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barangay Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={historicalFilters.barangay_id}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={historicalFilters.start_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={historicalFilters.end_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Historical Statistics Table */}
            {loadingHistorical ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Loading historical statistics...</p>
              </div>
            ) : (
              <HistoricalStatisticsTable
                statistics={historicalStatistics}
                onEdit={handleEditHistoricalRecord}
                onDelete={handleDeleteHistoricalClick}
              />
            )}
          </div>
        )}

        {/* Disease Record Details Drawer */}
        {selectedRecord && (
          <Drawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            size="lg"
            title="Disease Record Details"
            subtitle={getDiseaseDisplayName(selectedRecord.disease_type, selectedRecord.custom_disease_name)}
          >
            <div className="p-6 space-y-6">
              {/* Patient Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Patient Information</h4>
                <div className="bg-gray-50 rounded-md p-4">
                  {selectedRecord.patients && selectedRecord.patients.profiles ? (
                    // Registered patient
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary-teal/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-teal" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedRecord.patients.profiles.first_name} {selectedRecord.patients.profiles.last_name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Registered Patient
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono mb-2">
                          Patient No: {selectedRecord.patients.patient_number}
                        </div>
                        <p className="text-xs text-gray-500">
                          This is a registered patient with a complete health record in the system.
                        </p>
                      </div>
                    </div>
                  ) : selectedRecord.anonymous_patient_data ? (
                    // Anonymous walk-in patient
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedRecord.anonymous_patient_data.name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            Walk-in Patient
                          </span>
                        </div>
                        <div className="space-y-1 mb-2">
                          <div className="text-xs text-gray-600">
                            Age: {selectedRecord.anonymous_patient_data.age} years old
                          </div>
                          <div className="text-xs text-gray-600">
                            Gender: {selectedRecord.anonymous_patient_data.gender.charAt(0).toUpperCase() + selectedRecord.anonymous_patient_data.gender.slice(1)}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          This is an anonymous walk-in patient. Limited demographic data available.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // No patient data
                    <div className="text-center py-3">
                      <p className="text-sm text-gray-400 italic">No patient information available</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Case Information</h4>
                <div className="bg-gray-50 rounded-md p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Disease Type:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getDiseaseDisplayName(selectedRecord.disease_type, selectedRecord.custom_disease_name)}
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

        {/* Historical Data Import Form */}
        <HistoricalDataForm
          isOpen={isHistoricalFormOpen}
          onClose={() => setIsHistoricalFormOpen(false)}
          onSuccess={() => {
            toast.success('Historical disease data imported successfully');
            fetchRecords();
            fetchHistoricalStatistics();
          }}
          barangays={barangays}
        />

        {/* Edit Historical Record Modal */}
        <EditHistoricalRecordModal
          isOpen={isEditHistoricalModalOpen}
          onClose={() => setIsEditHistoricalModalOpen(false)}
          onSuccess={() => {
            toast.success('Historical record updated successfully');
            fetchHistoricalStatistics();
          }}
          record={editingHistoricalRecord}
        />

        {/* Delete Historical Record Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteHistoricalDialog}
          onClose={() => {
            setShowDeleteHistoricalDialog(false);
            setHistoricalRecordToDelete(null);
          }}
          onConfirm={handleConfirmDeleteHistorical}
          title="Delete Historical Record"
          message={
            historicalRecordToDelete
              ? `Are you sure you want to delete this historical record?\n\nDisease: ${getDiseaseDisplayName(historicalRecordToDelete.disease_type, historicalRecordToDelete.custom_disease_name)}\nDate: ${format(new Date(historicalRecordToDelete.record_date), 'MMM d, yyyy')}\nCases: ${historicalRecordToDelete.case_count}\n\nThis action cannot be undone and will permanently remove this data from the system.`
              : ''
          }
          confirmText="Delete Record"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteHistoricalLoading}
        />

        {/* Delete Individual Case Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteCaseDialog}
          onClose={() => {
            setShowDeleteCaseDialog(false);
            setCaseToDelete(null);
          }}
          onConfirm={handleConfirmDeleteCase}
          title="Delete Disease Case"
          message={
            caseToDelete
              ? `Are you sure you want to delete this disease case?\n\nDisease: ${getDiseaseDisplayName(caseToDelete.disease_type, caseToDelete.custom_disease_name)}\nDate: ${format(new Date(caseToDelete.diagnosis_date), 'MMM d, yyyy')}\nPatient: ${
                  caseToDelete.patients?.profiles
                    ? `${caseToDelete.patients.profiles.first_name} ${caseToDelete.patients.profiles.last_name}`
                    : caseToDelete.anonymous_patient_data?.name || 'Unknown'
                }\n\nThis action cannot be undone and will permanently remove this case from the database.`
              : ''
          }
          confirmText="Delete Case"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteCaseLoading}
        />

        {/* Edit Disease Case Modal */}
        <EditDiseaseCaseModal
          isOpen={isEditCaseModalOpen}
          onClose={() => {
            setIsEditCaseModalOpen(false);
            setEditingCase(null);
          }}
          onSuccess={() => {
            toast.success('Disease case updated successfully');
            fetchRecords();
          }}
          record={editingCase}
        />

        {/* Individual Cases Report Generator */}
        <IndividualCasesReportGenerator
          isOpen={isIndividualCasesReportOpen}
          onClose={() => setIsIndividualCasesReportOpen(false)}
          barangays={barangays}
        />

        {/* Historical Statistics Report Generator */}
        <HistoricalStatisticsReportGenerator
          isOpen={isHistoricalStatsReportOpen}
          onClose={() => setIsHistoricalStatsReportOpen(false)}
          barangays={barangays}
        />
      </Container>
    </DashboardLayout>
  );
}
