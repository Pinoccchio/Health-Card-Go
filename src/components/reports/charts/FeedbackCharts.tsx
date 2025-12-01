'use client';

import BaseBarChart from './BaseBarChart';
import BaseDoughnutChart from './BaseDoughnutChart';
import BaseLineChart from './BaseLineChart';

interface FeedbackChartsProps {
  data: any;
}

export function FeedbackRatingDistributionChart({ data }: FeedbackChartsProps) {
  if (!data?.rating_distribution || data.rating_distribution.length === 0) {
    return <div className="text-center text-gray-500 py-12">No rating data available</div>;
  }

  const chartData = {
    labels: data.rating_distribution.map((d: any) => `${d.rating} Star${d.rating > 1 ? 's' : ''}`),
    datasets: [
      {
        label: 'Count',
        data: data.rating_distribution.map((d: any) => d.count || 0),
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
  if (!data?.by_service || data.by_service.length === 0) {
    return <div className="text-center text-gray-500 py-12">No service data available</div>;
  }

  const chartData = {
    labels: data.by_service.map((d: any) => d.service_name || 'Unknown'),
    datasets: [
      {
        label: 'Average Rating',
        data: data.by_service.map((d: any) => d.average_rating || 0),
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

  const wouldRecommend = data.summary.would_recommend_count || 0;
  const wouldNotRecommend = (data.summary.total_feedback || 0) - wouldRecommend;

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

  const percentage = data.summary.recommendation_percentage || 0;

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
  if (!data?.trend_data || data.trend_data.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  const chartData = {
    labels: data.trend_data.map((d: any) => d.date),
    datasets: [
      {
        label: 'Average Overall Rating',
        data: data.trend_data.map((d: any) => d.average_rating || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Average Doctor Rating',
        data: data.trend_data.map((d: any) => d.average_doctor_rating || 0),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Average Facility Rating',
        data: data.trend_data.map((d: any) => d.average_facility_rating || 0),
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

export function FeedbackByDoctorChart({ data }: FeedbackChartsProps) {
  if (!data?.by_doctor || data.by_doctor.length === 0) {
    return <div className="text-center text-gray-500 py-12">No doctor data available</div>;
  }

  // Sort by rating and take top 10
  const topDoctors = [...data.by_doctor]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 10);

  const chartData = {
    labels: topDoctors.map((d: any) => d.doctor_name || 'Unknown'),
    datasets: [
      {
        label: 'Average Rating',
        data: topDoctors.map((d: any) => d.average_rating || 0),
        backgroundColor: '#8b5cf6',
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Top 10 Doctors by Rating</h3>
      <BaseBarChart data={chartData} height={300} horizontal={true} />
    </div>
  );
}
