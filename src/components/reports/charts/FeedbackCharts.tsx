'use client';

import BaseBarChart from './BaseBarChart';
import BaseDoughnutChart from './BaseDoughnutChart';
import BaseLineChart from './BaseLineChart';
import { ensureArray, safeNumber } from '@/lib/utils/reportHelpers';

interface FeedbackChartsProps {
  data: any;
}

export function FeedbackRatingDistributionChart({ data }: FeedbackChartsProps) {
  const ratingDistribution = ensureArray(data?.rating_distribution);

  if (ratingDistribution.length === 0) {
    return <div className="text-center text-gray-500 py-12">No rating data available</div>;
  }

  const chartData = {
    labels: ratingDistribution.map((d: any) => `${safeNumber(d.rating, 0)} Star${safeNumber(d.rating, 0) > 1 ? 's' : ''}`),
    datasets: [
      {
        label: 'Count',
        data: ratingDistribution.map((d: any) => safeNumber(d.count, 0)),
        backgroundColor: ['#ef4444', '#f59e0b', '#fbbf24', '#10b981', '#059669'],
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
      <BaseBarChart data={chartData} height={300} />
    </div>
  );
}

export function FeedbackByServiceChart({ data }: FeedbackChartsProps) {
  const byService = ensureArray(data?.by_service);

  if (byService.length === 0) {
    return <div className="text-center text-gray-500 py-12">No service data available</div>;
  }

  const chartData = {
    labels: byService.map((d: any) => d.service_name || 'Unknown'),
    datasets: [
      {
        label: 'Average Rating',
        data: byService.map((d: any) => safeNumber(d.average_rating, 0)),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Average Rating by Service</h3>
      <BaseBarChart data={chartData} height={300} horizontal={true} />
    </div>
  );
}

export function FeedbackRecommendationChart({ data }: FeedbackChartsProps) {
  if (!data?.summary) {
    return <div className="text-center text-gray-500 py-12">No summary data available</div>;
  }

  const wouldRecommend = safeNumber(data.summary.would_recommend_count, 0);
  const totalFeedback = safeNumber(data.summary.total_feedback, 0);
  const wouldNotRecommend = totalFeedback - wouldRecommend;

  const chartData = {
    labels: ['Would Recommend', 'Would Not Recommend'],
    datasets: [
      {
        data: [wouldRecommend, wouldNotRecommend],
        backgroundColor: ['#10b981', '#ef4444'],
        borderColor: ['#059669', '#dc2626'],
        borderWidth: 1,
      },
    ],
  };

  const percentage = safeNumber(data.summary.recommendation_percentage, 0);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Recommendation Rate</h3>
      <BaseDoughnutChart
        data={chartData}
        height={300}
        centerText={`${percentage.toFixed(0)}%`}
      />
    </div>
  );
}

export function FeedbackTrendChart({ data }: FeedbackChartsProps) {
  const trendData = ensureArray(data?.trend_data);

  // ✅ FIX: Check for insufficient data points
  if (trendData.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  if (trendData.length < 2) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p className="font-medium">Insufficient data for trend analysis</p>
        <p className="text-sm mt-2">
          {trendData.length} data point(s) available. Minimum 2 data points across different dates are required to display trends.
        </p>
        <p className="text-xs mt-2 text-gray-400">
          Date: {trendData[0]?.date} - Avg Rating: {safeNumber(trendData[0]?.average_rating, 0).toFixed(1)}
        </p>
      </div>
    );
  }

  const chartData = {
    labels: trendData.map((d: any) => d.date || ''),
    datasets: [
      {
        label: 'Average Overall Rating',
        data: trendData.map((d: any) => safeNumber(d.average_rating, 0)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Average Facility Rating',
        data: trendData.map((d: any) => safeNumber(d.average_facility_rating, 0)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Rating Trends Over Time</h3>
      <BaseLineChart data={chartData} height={350} />
    </div>
  );
}

