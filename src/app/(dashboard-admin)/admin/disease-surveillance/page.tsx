'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import SARIMAChart from '@/components/disease-surveillance/SARIMAChart';
import OutbreakAlerts from '@/components/disease-surveillance/OutbreakAlerts';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  BarChart3,
} from 'lucide-react';

type DiseaseType = 'all' | 'dengue' | 'hiv_aids' | 'pregnancy_complications' | 'malaria' | 'measles' | 'rabies';

export default function AdminDiseaseSurveillancePage() {
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>('dengue');
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();
  }, [selectedDisease]);

  const loadHeatmapData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedDisease !== 'all') {
        params.append('type', selectedDisease);
      }

      const response = await fetch(`/api/diseases/heatmap-data?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHeatmapData(data);
      } else {
        setError(data.error || 'Failed to load heatmap data');
      }
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const diseaseOptions = [
    { id: 'dengue', label: 'Dengue', color: 'red' },
    { id: 'hiv_aids', label: 'HIV/AIDS', color: 'purple' },
    { id: 'pregnancy_complications', label: 'Pregnancy', color: 'pink' },
    { id: 'malaria', label: 'Malaria', color: 'yellow' },
    { id: 'measles', label: 'Measles', color: 'orange' },
    { id: 'rabies', label: 'Rabies', color: 'gray' },
  ];

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Disease Surveillance"
      pageDescription="Monitor disease patterns and predictions across Panabo City barangays"
    >
      <Container size="full">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {!loading && heatmapData?.metadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.total_cases}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.total_active}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Critical Barangays</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.critical_barangays}</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Barangays Affected</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.total_barangays_affected}</p>
                </div>
                <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* Disease Type Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Select Disease Type</h3>
          <div className="flex flex-wrap gap-2">
            {diseaseOptions.map((disease) => {
              const isActive = selectedDisease === disease.id;
              return (
                <button
                  key={disease.id}
                  onClick={() => setSelectedDisease(disease.id as DiseaseType)}
                  className={`
                    px-4 py-2 rounded-full font-medium text-sm transition-all
                    ${isActive
                      ? 'bg-primary-teal text-white ring-2 ring-primary-teal shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {disease.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Outbreak Alerts */}
        <div className="mb-6">
          <OutbreakAlerts autoNotify={true} refreshInterval={300000} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heatmap */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Disease Heatmap</h3>
                <p className="text-sm text-gray-600">Geographic distribution of cases</p>
              </div>
              <MapPin className="w-6 h-6 text-primary-teal" />
            </div>

            {loading ? (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            ) : (
              <DiseaseHeatmap data={heatmapData?.data || []} diseaseType={selectedDisease} />
            )}
          </div>

          {/* SARIMA Predictions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">SARIMA Predictions</h3>
                <p className="text-sm text-gray-600">30-day forecast with confidence intervals</p>
              </div>
              <BarChart3 className="w-6 h-6 text-primary-teal" />
            </div>

            <SARIMAChart diseaseType={selectedDisease} />
          </div>
        </div>

        {/* Barangay Table */}
        {!loading && heatmapData?.data && heatmapData.data.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Barangay Statistics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barangay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cases
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Critical
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recovered
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {heatmapData.data.map((barangay: any) => (
                    <tr key={barangay.barangay_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {barangay.barangay_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${barangay.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                            barangay.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                            barangay.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}
                        `}>
                          {barangay.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {barangay.statistics.total_cases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                        {barangay.statistics.active_cases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                        {barangay.statistics.critical_cases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                        {barangay.statistics.recovered_cases}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
