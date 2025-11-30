'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SARIMAChartProps {
  diseaseType: string;
  barangayId?: number;
}

export default function SARIMAChart({ diseaseType, barangayId }: SARIMAChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    loadPredictions();
  }, [diseaseType, barangayId]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (diseaseType !== 'all') {
        params.append('type', diseaseType);
      }
      if (barangayId) {
        params.append('barangay_id', barangayId.toString());
      }
      params.append('days_back', '30');
      params.append('days_forecast', '30');

      const response = await fetch(`/api/diseases/predictions?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const { historical, predictions } = result.data;

        // Combine labels from both historical and predictions
        const labels = [
          ...historical.map((d: any) => d.date),
          ...predictions.map((d: any) => d.date),
        ];

        // Create datasets
        const datasets = [
          // Actual cases (historical)
          {
            label: 'Actual Cases',
            data: [
              ...historical.map((d: any) => d.actual_cases),
              ...Array(predictions.length).fill(null), // null for future dates
            ],
            borderColor: 'rgb(34, 197, 94)', // green-600
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          // Predicted cases
          {
            label: 'Predicted Cases',
            data: [
              ...Array(historical.length).fill(null), // null for past dates
              ...predictions.map((d: any) => d.predicted_cases),
            ],
            borderColor: 'rgb(59, 130, 246)', // blue-600
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          // Upper confidence interval
          {
            label: 'Upper Confidence',
            data: [
              ...Array(historical.length).fill(null),
              ...predictions.map((d: any) => d.confidence_upper),
            ],
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderDash: [2, 2],
            fill: '+1',
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          // Lower confidence interval
          {
            label: 'Lower Confidence',
            data: [
              ...Array(historical.length).fill(null),
              ...predictions.map((d: any) => d.confidence_lower),
            ],
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderDash: [2, 2],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ];

        setChartData({ labels, datasets });
        setMetadata(result.metadata);
      } else {
        setError(result.error || 'Failed to load predictions');
      }
    } catch (err) {
      console.error('Error loading predictions:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
          filter: (item) => {
            // Hide confidence interval labels to reduce clutter
            return !item.text.includes('Confidence');
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          },
          label: (context) => {
            const label = context.dataset.label || '';
            if (label.includes('Confidence')) {
              return null; // Don't show confidence in tooltip
            }
            return `${label}: ${context.parsed.y} cases`;
          },
        },
        filter: (tooltipItem) => {
          // Only show actual and predicted in tooltip
          return !tooltipItem.dataset.label?.includes('Confidence');
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
          callback: function (value, index) {
            // Show every 5th label to reduce clutter
            if (index % 5 === 0) {
              const label = this.getLabelForValue(value as number);
              const date = new Date(label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return '';
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function (value) {
            return Math.round(value as number);
          },
        },
        title: {
          display: true,
          text: 'Number of Cases',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-2"></div>
          <p className="text-gray-600">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading predictions</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">No prediction data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Chart */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">Past 30 Days</p>
            <p className="font-semibold text-gray-900">{metadata.total_actual_cases} cases</p>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-gray-600">Next 30 Days</p>
            <p className="font-semibold text-blue-900">{metadata.total_predicted_cases} cases</p>
          </div>
          <div className="bg-teal-50 p-2 rounded">
            <p className="text-gray-600">Avg Confidence</p>
            <p className="font-semibold text-teal-900">{metadata.average_confidence}%</p>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <p className="text-gray-600">Model</p>
            <p className="font-semibold text-purple-900">{metadata.model_version}</p>
          </div>
        </div>
      )}

      {/* Legend explanation */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">SARIMA Forecast:</span> The blue dashed line shows predicted cases for the next 30 days.
          The shaded area represents the 95% confidence interval, indicating the range where actual values are likely to fall.
        </p>
      </div>
    </div>
  );
}
