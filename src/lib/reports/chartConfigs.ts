// Chart.js configuration utilities for reports

import { ChartData, ChartOptions } from '@/types/reports';
import type { ChartOptions as ChartJSOptions } from 'chart.js';

// Color palette for charts
export const CHART_COLORS = {
  primary: '#3b82f6', // blue-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  info: '#06b6d4', // cyan-500
  purple: '#a855f7', // purple-500
  pink: '#ec4899', // pink-500
  indigo: '#6366f1', // indigo-500
  gray: '#6b7280', // gray-500
};

export const DISEASE_COLORS: Record<string, string> = {
  hiv_aids: '#ef4444', // red
  dengue: '#f59e0b', // amber
  malaria: '#10b981', // green
  measles: '#06b6d4', // cyan
  rabies: '#a855f7', // purple
  pregnancy_complications: '#ec4899', // pink
  other: '#6b7280', // gray
};

export const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981', // green
  cancelled: '#ef4444', // red
  no_show: '#f59e0b', // amber
  pending: '#6b7280', // gray
  scheduled: '#3b82f6', // blue
  verified: '#06b6d4', // cyan
  in_progress: '#a855f7', // purple
};

// Default chart options
export const defaultLineChartOptions: Partial<ChartJSOptions<'line'>> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleFont: {
        size: 14,
        weight: 'bold',
      },
      bodyFont: {
        size: 13,
      },
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
    },
    y: {
      display: true,
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

export const defaultBarChartOptions: Partial<ChartJSOptions<'bar'>> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
    },
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false,
      },
    },
    y: {
      display: true,
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
};

export const defaultDoughnutChartOptions: Partial<ChartJSOptions<'doughnut'>> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right',
    },
    tooltip: {
      enabled: true,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      callbacks: {
        label: function (context) {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
};

// Appointment trend chart config
export function getAppointmentTrendChartData(
  trends: { date: string; total: number; completed: number; cancelled: number; no_show: number }[]
): ChartData {
  return {
    labels: trends.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Total Appointments',
        data: trends.map((t) => t.total),
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}20`,
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'Completed',
        data: trends.map((t) => t.completed),
        borderColor: CHART_COLORS.success,
        backgroundColor: `${CHART_COLORS.success}20`,
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'Cancelled',
        data: trends.map((t) => t.cancelled),
        borderColor: CHART_COLORS.danger,
        backgroundColor: `${CHART_COLORS.danger}20`,
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'No-Show',
        data: trends.map((t) => t.no_show),
        borderColor: CHART_COLORS.warning,
        backgroundColor: `${CHART_COLORS.warning}20`,
        borderWidth: 2,
        fill: true,
      },
    ],
  };
}

// Appointment status distribution chart config
export function getAppointmentStatusChartData(
  statusData: { status: string; count: number; percentage: number }[]
): ChartData {
  return {
    labels: statusData.map((s) => s.status.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Appointments by Status',
        data: statusData.map((s) => s.count),
        backgroundColor: statusData.map((s) => STATUS_COLORS[s.status] || CHART_COLORS.gray),
        borderWidth: 0,
      },
    ],
  };
}

// Service category breakdown chart config
export function getServiceCategoryChartData(
  services: { service_name: string; total: number; category: string }[]
): ChartData {
  return {
    labels: services.map((s) => s.service_name),
    datasets: [
      {
        label: 'Appointments by Service',
        data: services.map((s) => s.total),
        backgroundColor: [
          CHART_COLORS.primary,
          CHART_COLORS.success,
          CHART_COLORS.warning,
          CHART_COLORS.danger,
          CHART_COLORS.info,
          CHART_COLORS.purple,
          CHART_COLORS.pink,
          CHART_COLORS.indigo,
        ],
        borderWidth: 0,
      },
    ],
  };
}

// Disease distribution chart config
export function getDiseaseDistributionChartData(
  diseaseData: { disease_type: string; total: number; percentage: number }[]
): ChartData {
  return {
    labels: diseaseData.map((d) => d.disease_type.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        label: 'Cases by Disease Type',
        data: diseaseData.map((d) => d.total),
        backgroundColor: diseaseData.map((d) => DISEASE_COLORS[d.disease_type] || CHART_COLORS.gray),
        borderWidth: 0,
      },
    ],
  };
}

// Disease trend chart config
export function getDiseaseTrendChartData(
  trends: Record<string, string | number>[],
  diseaseTypes: string[]
): ChartData {
  const colors = [
    CHART_COLORS.danger,
    CHART_COLORS.warning,
    CHART_COLORS.success,
    CHART_COLORS.info,
    CHART_COLORS.purple,
    CHART_COLORS.pink,
  ];

  return {
    labels: trends.map((t) => new Date(t.date as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: diseaseTypes.map((type, index) => ({
      label: type.replace('_', ' ').toUpperCase(),
      data: trends.map((t) => (t[type] as number) || 0),
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}20`,
      borderWidth: 2,
      fill: true,
    })),
  };
}

// Patient registration trend chart config
export function getPatientRegistrationChartData(
  trends: { date: string; total_registered: number; approved: number; rejected: number }[]
): ChartData {
  return {
    labels: trends.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Total Registered',
        data: trends.map((t) => t.total_registered),
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}20`,
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'Approved',
        data: trends.map((t) => t.approved),
        borderColor: CHART_COLORS.success,
        backgroundColor: `${CHART_COLORS.success}20`,
        borderWidth: 2,
        fill: true,
      },
      {
        label: 'Rejected',
        data: trends.map((t) => t.rejected),
        borderColor: CHART_COLORS.danger,
        backgroundColor: `${CHART_COLORS.danger}20`,
        borderWidth: 2,
        fill: true,
      },
    ],
  };
}

// Feedback rating distribution chart config
export function getFeedbackRatingChartData(
  ratingData: { rating: number; count: number; percentage: number }[]
): ChartData {
  return {
    labels: ratingData.map((r) => `${r.rating} Star${r.rating !== 1 ? 's' : ''}`),
    datasets: [
      {
        label: 'Rating Distribution',
        data: ratingData.map((r) => r.count),
        backgroundColor: [CHART_COLORS.danger, CHART_COLORS.warning, CHART_COLORS.info, CHART_COLORS.success, CHART_COLORS.primary],
        borderWidth: 0,
      },
    ],
  };
}

// Feedback trend chart config
export function getFeedbackTrendChartData(
  trends: { date: string; avg_rating: number; count: number }[]
): ChartData {
  return {
    labels: trends.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Average Rating',
        data: trends.map((t) => t.avg_rating),
        borderColor: CHART_COLORS.primary,
        backgroundColor: `${CHART_COLORS.primary}20`,
        borderWidth: 2,
        fill: true,
      },
    ],
  };
}
