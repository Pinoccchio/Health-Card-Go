'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FileText, BarChart3, PieChart, TrendingUp, Download } from 'lucide-react';

export default function HealthcareAdminReportsPage() {
  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Reports & Analytics"
      pageDescription="View detailed reports and analytics for your assigned service"
    >
      <Container size="full">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-16 h-16 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Reports & Analytics Coming Soon
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            This page will provide comprehensive reports and analytics for your assigned service,
            including appointment trends, patient statistics, and service utilization metrics.
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <BarChart3 className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Appointments by Service</h3>
            <p className="text-sm text-gray-600">
              Bar chart showing appointment distribution across different services
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <PieChart className="w-10 h-10 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Patients by Status</h3>
            <p className="text-sm text-gray-600">
              Pie chart displaying patient distribution by status (active, pending, etc.)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <TrendingUp className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Appointment Trends</h3>
            <p className="text-sm text-gray-600">
              Line chart showing appointment trends over time with forecasting
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <Download className="w-10 h-10 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Export Functionality</h3>
            <p className="text-sm text-gray-600">
              Download reports in CSV or PDF format for offline analysis
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Features</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Service-Specific Filtering:</strong>
                <span className="text-gray-600"> Reports filtered by your assigned service</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Date Range Selection:</strong>
                <span className="text-gray-600"> Customize reports by selecting specific date ranges</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">SARIMA Analytics:</strong>
                <span className="text-gray-600"> Advanced forecasting with confidence intervals and error metrics</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Historical Data Entry:</strong>
                <span className="text-gray-600"> Import and manage historical data for better predictions</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Tabular Data View:</strong>
                <span className="text-gray-600"> Detailed tables with search, sort, and filter capabilities</span>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </DashboardLayout>
  );
}
