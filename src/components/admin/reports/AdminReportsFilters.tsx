'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui';
import { Filter } from 'lucide-react';

interface AdminReportsFiltersProps {
  startDate: string;
  endDate: string;
  serviceId?: number;
  barangayId?: number;
  status?: string;
  diseaseType?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onServiceChange: (serviceId?: number) => void;
  onBarangayChange: (barangayId?: number) => void;
  onStatusChange?: (status?: string) => void;
  onDiseaseTypeChange?: (diseaseType?: string) => void;
  onApplyFilters: () => void;
  activeTab: string;
}

interface Service {
  id: number;
  name: string;
}

interface Barangay {
  id: number;
  name: string;
}

export default function AdminReportsFilters({
  startDate,
  endDate,
  serviceId,
  barangayId,
  status,
  diseaseType,
  onStartDateChange,
  onEndDateChange,
  onServiceChange,
  onBarangayChange,
  onStatusChange,
  onDiseaseTypeChange,
  onApplyFilters,
  activeTab,
}: AdminReportsFiltersProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const supabase = createClient();

        // Fetch services
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        // Fetch barangays
        const { data: barangaysData } = await supabase
          .from('barangays')
          .select('id, name')
          .order('name');

        setServices(servicesData || []);
        setBarangays(barangaysData || []);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  const appointmentStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
    { value: 'checked_in', label: 'Checked In' },
    { value: 'in_progress', label: 'In Progress' },
  ];

  const diseaseTypes = [
    { value: '', label: 'All Diseases' },
    { value: 'hiv_aids', label: 'HIV/AIDS' },
    { value: 'dengue', label: 'Dengue' },
    { value: 'malaria', label: 'Malaria' },
    { value: 'measles', label: 'Measles' },
    { value: 'rabies', label: 'Rabies' },
    { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
    { value: 'other', label: 'Other' },
  ];

  const handleReset = () => {
    // Reset to default values (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    onStartDateChange(thirtyDaysAgo.toISOString().split('T')[0]);
    onEndDateChange(today.toISOString().split('T')[0]);
    onServiceChange(undefined);
    onBarangayChange(undefined);
    if (onStatusChange) onStatusChange(undefined);
    if (onDiseaseTypeChange) onDiseaseTypeChange(undefined);

    // Trigger re-fetch
    setTimeout(() => onApplyFilters(), 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();

    switch (preset) {
      case 'today':
        start = today;
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        onEndDateChange(start.toISOString().split('T')[0]);
        onStartDateChange(start.toISOString().split('T')[0]);
        setTimeout(() => onApplyFilters(), 100);
        return;
      case 'last7days':
        start.setDate(start.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(start.getDate() - 30);
        break;
      case 'last90days':
        start.setDate(start.getDate() - 90);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        onEndDateChange(endLastMonth.toISOString().split('T')[0]);
        onStartDateChange(start.toISOString().split('T')[0]);
        setTimeout(() => onApplyFilters(), 100);
        return;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      case 'allTime':
        // Wide date range to include all historical data
        onStartDateChange('2000-01-01');
        onEndDateChange('2099-12-31');
        setTimeout(() => onApplyFilters(), 100);
        return;
      default:
        return;
    }

    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(today.toISOString().split('T')[0]);
    setTimeout(() => onApplyFilters(), 100);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        {/* Date Range Presets */}
        <div className="flex flex-wrap gap-2">
          <select
            onChange={(e) => handlePresetChange(e.target.value)}
            className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Quick Date Range</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="last90days">Last 90 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
            <option value="allTime">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Service Filter (for appointments and feedback tabs) */}
        {(activeTab === 'appointments' || activeTab === 'feedback') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service
            </label>
            <select
              value={serviceId || ''}
              onChange={(e) => onServiceChange(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Barangay Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barangay
          </label>
          <select
            value={barangayId || ''}
            onChange={(e) => onBarangayChange(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Barangays</option>
            {barangays.map((barangay) => (
              <option key={barangay.id} value={barangay.id}>
                {barangay.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter (appointments tab only) */}
        {activeTab === 'appointments' && onStatusChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status || ''}
              onChange={(e) => onStatusChange(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {appointmentStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Disease Type Filter (diseases tab only) */}
        {activeTab === 'diseases' && onDiseaseTypeChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disease Type
            </label>
            <select
              value={diseaseType || ''}
              onChange={(e) => onDiseaseTypeChange(e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {diseaseTypes.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onApplyFilters}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Apply Filters
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
        >
          Reset to Default
        </Button>
      </div>

      {/* Filter Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Active Filters:</strong>{' '}
          {startDate} to {endDate}
          {serviceId && ` • Service: ${services.find(s => s.id === serviceId)?.name || serviceId}`}
          {barangayId && ` • Barangay: ${barangays.find(b => b.id === barangayId)?.name || barangayId}`}
          {status && ` • Status: ${status}`}
          {diseaseType && ` • Disease: ${diseaseTypes.find(d => d.value === diseaseType)?.label || diseaseType}`}
        </p>
      </div>
    </div>
  );
}
