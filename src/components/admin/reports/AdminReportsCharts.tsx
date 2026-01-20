'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AdminReportsChartsProps {
  data: any;
  type: 'appointments' | 'patients' | 'diseases' | 'feedback';
}

export default function AdminReportsCharts({ data, type }: AdminReportsChartsProps) {
  const chartColors = {
    blue: 'rgba(59, 130, 246, 0.8)',
    green: 'rgba(34, 197, 94, 0.8)',
    red: 'rgba(239, 68, 68, 0.8)',
    yellow: 'rgba(234, 179, 8, 0.8)',
    purple: 'rgba(168, 85, 247, 0.8)',
    orange: 'rgba(249, 115, 22, 0.8)',
    teal: 'rgba(20, 184, 166, 0.8)',
    pink: 'rgba(236, 72, 153, 0.8)',
  };

  const renderAppointmentsCharts = () => {
    if (!data) return null;

    // Status breakdown pie chart
    const statusData = {
      labels: data.status_breakdown?.map((s: any) => s.status.replace('_', ' ').toUpperCase()) || [],
      datasets: [{
        label: 'Appointments',
        data: data.status_breakdown?.map((s: any) => s.count) || [],
        backgroundColor: [
          chartColors.green,
          chartColors.blue,
          chartColors.red,
          chartColors.orange,
          chartColors.purple,
          chartColors.yellow,
        ],
      }],
    };

    // Trend line chart
    const trendData = {
      labels: data.trend_data?.map((t: any) => t.date) || [],
      datasets: [{
        label: 'Total Appointments',
        data: data.trend_data?.map((t: any) => t.count) || [],
        borderColor: chartColors.blue,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      }],
    };

    // Service breakdown bar chart
    const serviceData = {
      labels: data.service_breakdown?.map((s: any) => s.service) || [],
      datasets: [{
        label: 'Total',
        data: data.service_breakdown?.map((s: any) => s.total) || [],
        backgroundColor: chartColors.blue,
      }, {
        label: 'Completed',
        data: data.service_breakdown?.map((s: any) => s.completed) || [],
        backgroundColor: chartColors.green,
      }],
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Appointments by Status</h4>
          <Pie data={statusData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Appointments Trend</h4>
          <Line data={trendData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Appointments by Service</h4>
          <Bar data={serviceData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>
    );
  };

  const renderPatientsCharts = () => {
    if (!data) return null;

    // Status breakdown
    const statusData = {
      labels: data.status_breakdown?.map((s: any) => s.status.toUpperCase()) || [],
      datasets: [{
        label: 'Patients',
        data: data.status_breakdown?.map((s: any) => s.count) || [],
        backgroundColor: [
          chartColors.green,
          chartColors.yellow,
          chartColors.red,
          chartColors.orange,
        ],
      }],
    };

    // Barangay distribution (top 10)
    const barangayData = {
      labels: data.barangay_breakdown?.slice(0, 10).map((b: any) => b.barangay) || [],
      datasets: [{
        label: 'Patients',
        data: data.barangay_breakdown?.slice(0, 10).map((b: any) => b.count) || [],
        backgroundColor: chartColors.teal,
      }],
    };

    // Registration trend
    const trendData = {
      labels: data.trend_data?.map((t: any) => t.date) || [],
      datasets: [{
        label: 'New Registrations',
        data: data.trend_data?.map((t: any) => t.count) || [],
        borderColor: chartColors.green,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
      }],
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Patients by Status</h4>
          <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Registration Trend</h4>
          <Line data={trendData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Barangays</h4>
          <Bar data={barangayData} options={{ responsive: true, maintainAspectRatio: true, indexAxis: 'y' }} />
        </div>
      </div>
    );
  };

  const renderDiseasesCharts = () => {
    if (!data) return null;

    // Disease type breakdown
    const diseaseData = {
      labels: data.disease_breakdown?.map((d: any) => d.disease_type) || [],
      datasets: [{
        label: 'Cases',
        data: data.disease_breakdown?.map((d: any) => d.count) || [],
        backgroundColor: [
          chartColors.red,
          chartColors.orange,
          chartColors.yellow,
          chartColors.purple,
          chartColors.pink,
          chartColors.teal,
          chartColors.blue,
        ],
      }],
    };

    // Trend data
    const trendData = {
      labels: data.trend_data?.map((t: any) => t.date) || [],
      datasets: [{
        label: 'Cases',
        data: data.trend_data?.map((t: any) => t.count) || [],
        borderColor: chartColors.red,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
      }],
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Cases by Disease Type</h4>
          <Bar data={diseaseData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Disease Cases Trend</h4>
          <Line data={trendData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>
    );
  };

  const renderFeedbackCharts = () => {
    if (!data) return null;

    // Rating distribution
    const ratingData = {
      labels: data.rating_distribution?.map((r: any) => `${r.rating} Stars`) || [],
      datasets: [{
        label: 'Count',
        data: data.rating_distribution?.map((r: any) => r.count) || [],
        backgroundColor: [chartColors.red, chartColors.orange, chartColors.yellow, chartColors.green, chartColors.blue],
      }],
    };

    // Service breakdown
    const serviceData = {
      labels: data.service_breakdown?.map((s: any) => s.service) || [],
      datasets: [{
        label: 'Feedback Count',
        data: data.service_breakdown?.map((s: any) => s.count) || [],
        backgroundColor: chartColors.purple,
      }],
    };

    // Trend data
    const trendData = {
      labels: data.trend_data?.map((t: any) => t.date) || [],
      datasets: [{
        label: 'Feedback Submissions',
        data: data.trend_data?.map((t: any) => t.count) || [],
        borderColor: chartColors.purple,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
      }],
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Rating Distribution</h4>
          <Bar data={ratingData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Feedback Trend</h4>
          <Line data={trendData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Feedback by Service</h4>
          <Bar data={serviceData} options={{ responsive: true, maintainAspectRatio: true, indexAxis: 'y' }} />
        </div>
      </div>
    );
  };

  switch (type) {
    case 'appointments':
      return renderAppointmentsCharts();
    case 'patients':
      return renderPatientsCharts();
    case 'diseases':
      return renderDiseasesCharts();
    case 'feedback':
      return renderFeedbackCharts();
    default:
      return null;
  }
}
