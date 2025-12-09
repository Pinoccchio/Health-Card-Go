'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Activity, MapPin, TrendingUp, AlertTriangle, BarChart3, Bell } from 'lucide-react';

export default function AdminDiseaseSurveillancePage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Disease Surveillance"
      pageDescription="Real-time disease tracking and outbreak detection system"
    >
      <Container size="full">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-4">
            <Activity className="w-16 h-16 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Disease Surveillance System Coming Soon
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            This page will provide real-time disease tracking, outbreak detection, and predictive analytics
            for all 44 barangays in Panabo City using SARIMA forecasting models.
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <MapPin className="w-10 h-10 text-red-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Disease Heatmap</h3>
            <p className="text-sm text-gray-600">
              Interactive map showing disease distribution across all barangays with color-coded risk levels
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <TrendingUp className="w-10 h-10 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">SARIMA Predictions</h3>
            <p className="text-sm text-gray-600">
              Time-series forecasting using SARIMA models to predict disease outbreaks with confidence intervals
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <AlertTriangle className="w-10 h-10 text-yellow-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Outbreak Detection</h3>
            <p className="text-sm text-gray-600">
              Automated alerts when case counts exceed thresholds or show unusual patterns
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <BarChart3 className="w-10 h-10 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Disease Analytics</h3>
            <p className="text-sm text-gray-600">
              Statistical analysis of disease trends, severity levels, and barangay comparisons
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <Bell className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Real-time Notifications</h3>
            <p className="text-sm text-gray-600">
              Instant alerts to healthcare staff when new critical cases are reported
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <Activity className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Case Management</h3>
            <p className="text-sm text-gray-600">
              Track individual cases from diagnosis to recovery with status updates
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracked Diseases</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Dengue:</strong>
                <span className="text-gray-600"> Mosquito-borne viral infection with seasonal patterns</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">HIV/AIDS:</strong>
                <span className="text-gray-600"> Encrypted case tracking with strict confidentiality protocols</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Pregnancy Complications:</strong>
                <span className="text-gray-600"> Maternal health monitoring with risk assessment</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Malaria:</strong>
                <span className="text-gray-600"> Parasitic disease tracking with geographical correlation</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Measles:</strong>
                <span className="text-gray-600"> Highly contagious viral disease requiring rapid response</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Rabies:</strong>
                <span className="text-gray-600"> Animal bite cases with post-exposure prophylaxis tracking</span>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </DashboardLayout>
  );
}
