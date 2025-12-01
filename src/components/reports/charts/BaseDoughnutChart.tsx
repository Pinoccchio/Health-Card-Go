'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
);

interface BaseDoughnutChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
    }[];
  };
  options?: ChartOptions<'doughnut'>;
  height?: number;
  centerText?: string;
}

export default function BaseDoughnutChart({
  data,
  options,
  height = 300,
  centerText
}: BaseDoughnutChartProps) {
  const defaultOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                const total = (data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);

                return {
                  text: `${label}: ${value.toLocaleString()} (${percentage}%)`,
                  fillStyle: (data.datasets[0].backgroundColor as string[])?.[i] || '#ccc',
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
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
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            label += `${value.toLocaleString()} (${percentage}%)`;
            return label;
          }
        }
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Doughnut data={data} options={mergedOptions} />
      {centerText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div className="text-2xl font-bold text-gray-900">{centerText}</div>
        </div>
      )}
    </div>
  );
}
