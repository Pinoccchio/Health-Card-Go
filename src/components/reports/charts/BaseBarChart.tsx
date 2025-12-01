'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BaseBarChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
  };
  options?: ChartOptions<'bar'>;
  height?: number;
  horizontal?: boolean;
}

export default function BaseBarChart({
  data,
  options,
  height = 300,
  horizontal = false
}: BaseBarChartProps) {
  const defaultOptions: ChartOptions<'bar'> = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              const value = horizontal ? context.parsed.x : context.parsed.y;
              label += value.toLocaleString();
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: !horizontal,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value) {
            return horizontal ? value.toLocaleString() : value;
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: horizontal,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value) {
            return horizontal ? value : value.toLocaleString();
          },
        },
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div style={{ height: `${height}px` }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
}
