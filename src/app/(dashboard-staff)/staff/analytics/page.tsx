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

export default function StaffAnalyticsPage() {
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
      roleId={5}
      pageTitle="Disease Analytics"
      pageDescription="View disease patterns, predictions, and outbreak alerts for Panabo City"
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
                  <p className="text-sm text-gray-600 mb-1">Affected Barangays</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.affected_barangays}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Most Affected</p>
                  <p className="text-lg font-bold text-gray-900">
                    {heatmapData.metadata.most_affected_barangay || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {heatmapData.metadata.highest_case_count || 0} cases
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Latest Case</p>
                  <p className="text-sm font-bold text-gray-900">
                    {heatmapData.metadata.latest_case_date
                      ? new Date(heatmapData.metadata.latest_case_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* Disease Selection Tabs */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary-teal" />
            <h3 className="text-sm font-medium text-gray-700">Select Disease Type</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {diseaseOptions.map((disease) => (
              <button
                key={disease.id}
                onClick={() => setSelectedDisease(disease.id as DiseaseType)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedDisease === disease.id
                    ? 'bg-primary-teal text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {disease.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outbreak Alerts */}
        <div className="mb-6">
          <OutbreakAlerts diseaseType={selectedDisease !== 'all' ? selectedDisease : undefined} />
        </div>

        {/* Disease Heatmap */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-teal" />
                Disease Distribution Heatmap
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Geographic distribution of {diseaseOptions.find(d => d.id === selectedDisease)?.label || 'disease'} cases across barangays
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Loading heatmap...</p>
            </div>
          ) : (
            <DiseaseHeatmap
              diseaseType={selectedDisease}
              data={heatmapData}
            />
          )}
        </div>

        {/* SARIMA Prediction Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-teal" />
                SARIMA Predictive Model
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Seasonal Auto-Regressive Integrated Moving Average predictions for {diseaseOptions.find(d => d.id === selectedDisease)?.label || 'disease'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Loading predictions...</p>
            </div>
          ) : (
            <SARIMAChart diseaseType={selectedDisease} />
          )}
        </div>

        {/* Information Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">About Disease Analytics</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• The heatmap visualizes disease distribution across all 42 barangays in Panabo City</p>
                <p>• Darker colors indicate higher case concentrations in specific areas</p>
                <p>• SARIMA predictions use historical data to forecast future disease trends</p>
                <p>• Outbreak alerts automatically detect unusual disease pattern spikes</p>
                <p>• Use this data to identify high-risk areas and allocate resources effectively</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
