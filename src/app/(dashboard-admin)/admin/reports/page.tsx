'use client';

import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FileText, BarChart3, PieChart, TrendingUp, Download, Calendar } from 'lucide-react';

export default function AdminReportsPage() {
  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports & Analytics"
      pageDescription="Comprehensive reports and analytics for the entire healthcare system"
    >
      <Container size="full">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8 mb-6">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-16 h-16 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Advanced Reporting System Coming Soon
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            This page will provide comprehensive analytics and reporting across all system modules
            including appointments, patients, disease surveillance, and system performance metrics.
          </p>
        </div>

        {/* Planned Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <BarChart3 className="w-10 h-10 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Appointment Analytics</h3>
            <p className="text-sm text-gray-600">
              Detailed reports on appointment trends, completion rates, and service utilization
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <PieChart className="w-10 h-10 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Patient Statistics</h3>
            <p className="text-sm text-gray-600">
              Patient demographics, registration trends, and barangay distribution analysis
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <TrendingUp className="w-10 h-10 text-red-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Disease Surveillance Reports</h3>
            <p className="text-sm text-gray-600">
              Disease trends, outbreak summaries, and predictive analytics with SARIMA models
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <Calendar className="w-10 h-10 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Custom Date Ranges</h3>
            <p className="text-sm text-gray-600">
              Filter reports by specific date ranges for targeted analysis and comparison
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <Download className="w-10 h-10 text-orange-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Export Functionality</h3>
            <p className="text-sm text-gray-600">
              Download reports in PDF or CSV format for offline analysis and presentations
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-teal-500">
            <FileText className="w-10 h-10 text-teal-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">System Performance</h3>
            <p className="text-sm text-gray-600">
              Overall system metrics including user activity, response times, and capacity utilization
            </p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Report Types</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Appointments Report:</strong>
                <span className="text-gray-600"> Trends, status distribution, service breakdown, and completion rates</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Patient Demographics:</strong>
                <span className="text-gray-600"> Registration trends, age distribution, barangay analysis, and status overview</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Disease Surveillance:</strong>
                <span className="text-gray-600"> Disease distribution, severity levels, temporal trends, and barangay hotspots</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Feedback Analysis:</strong>
                <span className="text-gray-600"> Patient satisfaction ratings, service quality metrics, and improvement recommendations</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">System Overview:</strong>
                <span className="text-gray-600"> User activity, performance metrics, capacity planning, and system health indicators</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></span>
              <div>
                <strong className="text-gray-900">Custom Filters:</strong>
                <span className="text-gray-600"> Filter by barangay, service, date range, and other parameters for detailed analysis</span>
              </div>
            </li>
          </ul>
        </div>
      </Container>
    </DashboardLayout>
  );
}
