// Report data generation utilities

import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

// Generate default date range (last 30 days)
export function getDefaultDateRange(): { start_date: string; end_date: string } {
  const end = new Date();
  const start = subDays(end, 30);

  return {
    start_date: format(startOfDay(start), 'yyyy-MM-dd'),
    end_date: format(endOfDay(end), 'yyyy-MM-dd'),
  };
}

// Validate and parse date range
export function parseDateRange(params: DateRangeParams): { start_date: string; end_date: string } {
  if (!params.start_date || !params.end_date) {
    return getDefaultDateRange();
  }

  try {
    const start = new Date(params.start_date);
    const end = new Date(params.end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return getDefaultDateRange();
    }

    return {
      start_date: format(startOfDay(start), 'yyyy-MM-dd'),
      end_date: format(endOfDay(end), 'yyyy-MM-dd'),
    };
  } catch {
    return getDefaultDateRange();
  }
}

// Calculate completion rate
export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * 10) / 10; // Round to 1 decimal
}

// Calculate no-show rate
export function calculateNoShowRate(noShow: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((noShow / total) * 100 * 10) / 10;
}

// Calculate cancellation rate
export function calculateCancellationRate(cancelled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 100 * 10) / 10;
}

// Calculate approval rate
export function calculateApprovalRate(approved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100 * 10) / 10;
}

// Calculate rejection rate
export function calculateRejectionRate(rejected: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((rejected / total) * 100 * 10) / 10;
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 10) / 10;
}

// Determine risk level based on case count
export function getRiskLevel(caseCount: number): 'low' | 'medium' | 'high' {
  if (caseCount <= 25) return 'low';
  if (caseCount <= 50) return 'medium';
  return 'high';
}

// Get risk level color
export function getRiskLevelColor(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low':
      return '#10b981'; // green
    case 'medium':
      return '#f59e0b'; // amber
    case 'high':
      return '#ef4444'; // red
  }
}

// Group data by date
export function groupByDate<T extends { date: string }>(data: T[]): Record<string, T[]> {
  return data.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Generate date range array
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let current = start;
  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

// Fill missing dates in trend data
export function fillMissingDates<T extends Record<string, string | number>>(
  trends: T[],
  startDate: string,
  endDate: string,
  defaultValues: Omit<T, 'date'>
): T[] {
  const dateRange = generateDateRange(startDate, endDate);
  const trendMap = new Map(trends.map((t) => [t.date as string, t]));

  return dateRange.map((date) => {
    if (trendMap.has(date)) {
      return trendMap.get(date)!;
    }
    return { date, ...defaultValues } as T;
  });
}

// Format time duration (minutes to readable format)
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === 0) return 'N/A';

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
}

// Sort by date ascending
export function sortByDateAsc<T extends { date: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Sort by date descending
export function sortByDateDesc<T extends { date: string }>(data: T[]): T[] {
  return [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get top N items
export function getTopN<T>(data: T[], n: number = 5): T[] {
  return data.slice(0, n);
}

// Calculate average
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

// Calculate sum
export function calculateSum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

// Format status text
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Format disease type text
export function formatDiseaseType(diseaseType: string): string {
  return diseaseType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Sanitize filter values
export function sanitizeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  });

  return sanitized;
}
