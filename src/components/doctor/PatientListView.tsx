'use client';

import { useState, useEffect } from 'react';
import { Search, QrCode, User, MapPin, Calendar, Eye } from 'lucide-react';
import { EnhancedTable } from '@/components/ui/EnhancedTable';

interface PatientListViewProps {
  onPatientClick: (patient: any) => void;
  onScanQRClick: () => void;
  statusFilter?: string;
}

export default function PatientListView({ onPatientClick, onScanQRClick, statusFilter = 'all' }: PatientListViewProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [barangays, setBarangays] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadBarangays();
  }, []);

  useEffect(() => {
    loadPatients();
  }, [pagination.page, searchTerm, selectedBarangay, statusFilter]);

  const loadBarangays = async () => {
    try {
      const res = await fetch('/api/barangays');
      if (res.ok) {
        const data = await res.json();
        setBarangays(data.data || []);
      }
    } catch (err) {
      console.error('Error loading barangays:', err);
    }
  };

  const loadPatients = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedBarangay) params.append('barangay_id', selectedBarangay);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const res = await fetch(`/api/patients/doctor-patients?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch patients');
      }

      const data = await res.json();
      setPatients(data.data || []);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const columns = [
    {
      header: 'Patient Name',
      accessor: 'patient_name',
      sortable: true,
      render: (_value: any, row: any) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {row.profiles?.first_name} {row.profiles?.last_name}
          </span>
        </div>
      ),
    },
    {
      header: 'Patient #',
      accessor: 'patient_number',
      sortable: true,
      render: (value: any) => (
        <span className="font-mono text-sm text-gray-600">{value}</span>
      ),
    },
    {
      header: 'Age',
      accessor: 'age',
      sortable: true,
      render: (_value: any, row: any) => (
        <span className="text-gray-900">
          {row.profiles?.date_of_birth ? calculateAge(row.profiles.date_of_birth) : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Barangay',
      accessor: 'barangay',
      sortable: true,
      render: (_value: any, row: any) => (
        <div className="flex items-center gap-1 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{row.profiles?.barangays?.name || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Last Visit',
      accessor: 'last_visit',
      sortable: true,
      render: (_value: any, row: any) => (
        row.last_visit ? (
          <div className="flex items-center gap-1 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{new Date(row.last_visit.date).toLocaleDateString()}</span>
          </div>
        ) : (
          <span className="text-gray-400">No visits</span>
        )
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (_value: any, row: any) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.profiles?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {row.profiles?.status || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      render: (_value: any, row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click event
            onPatientClick(row);
          }}
          className="inline-flex items-center px-3 py-1.5 bg-primary-teal text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Eye className="w-3 h-3 mr-1.5" />
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or patient number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
          />
        </div>

        {/* Barangay Filter */}
        <select
          value={selectedBarangay}
          onChange={(e) => {
            setSelectedBarangay(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
        >
          <option value="">All Barangays</option>
          {barangays.map((barangay) => (
            <option key={barangay.id} value={barangay.id}>
              {barangay.name}
            </option>
          ))}
        </select>

        {/* QR Scanner Button */}
        <button
          onClick={onScanQRClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
        >
          <QrCode className="w-5 h-5" />
          Scan QR
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
        </div>
      )}

      {/* Patients Table */}
      {!loading && (
        patients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No patients found
          </div>
        ) : (
          <EnhancedTable
            data={patients}
            columns={columns}
            onRowClick={onPatientClick}
            className="mt-4"
          />
        )
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} patients
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
