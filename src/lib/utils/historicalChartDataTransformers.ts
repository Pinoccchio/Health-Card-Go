import { format, subMonths, startOfMonth, getMonth, getYear, differenceInMonths } from 'date-fns';
import { getDiseaseColor } from './colorUtils';

// Type definitions for historical chart data
export interface HistoricalMonthlyData {
  month: string;
  date: Date;
  totalCases: number; // Sum of all case_count values for the month
}

export interface HistoricalMonthlyByDiseaseData {
  month: string;
  date: Date;
  [key: string]: number | string | Date; // Dynamic properties for each disease
}

export interface HistoricalBarangayData {
  id: number;
  name: string;
  totalCases: number; // Sum of all case_count values for the barangay
}

export interface HistoricalDiseaseTypeData {
  type: string;
  totalCases: number; // Sum of all case_count values for the disease type
  percentage: number;
  color: string;
}

interface Barangay {
  id: number;
  name: string;
  code?: string;
}

/**
 * Aggregate historical disease statistics by month
 * Sums case_count values for each month (last 12 months)
 *
 * Key difference from individual cases: We SUM case_count instead of counting records
 */
export function aggregateHistoricalByMonth(statistics: any[]): HistoricalMonthlyData[] {
  // Generate last 12 months
  const months: HistoricalMonthlyData[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    months.push({
      month: format(date, 'MMM'),
      date: startOfMonth(date),
      totalCases: 0,
    });
  }

  // Sum case_count by month
  statistics.forEach((stat) => {
    if (!stat.record_date || !stat.case_count) return;

    const recordDate = new Date(stat.record_date);
    const monthIndex = months.findIndex((m) =>
      getYear(m.date) === getYear(recordDate) &&
      getMonth(m.date) === getMonth(recordDate)
    );

    if (monthIndex !== -1) {
      // SUM the case_count (aggregate data)
      months[monthIndex].totalCases += stat.case_count;
    }
  });

  return months;
}

/**
 * Calculate number of months from earliest historical record to now
 * Used for "All Time" time range option
 */
function calculateHistoricalMonthsSinceEarliest(statistics: any[]): number {
  if (!statistics || statistics.length === 0) return 23; // Default to 24 months

  const dates = statistics
    .map(s => s.record_date ? new Date(s.record_date) : null)
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  if (dates.length === 0) return 23;

  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const months = differenceInMonths(new Date(), earliest);

  return Math.max(months, 23); // Minimum 24 months
}

/**
 * Aggregate historical disease statistics by month AND disease type
 * Returns data for specified time range with separate counts for each disease type
 *
 * Key difference from aggregateHistoricalByMonth: Creates separate property for EACH disease
 * instead of summing to a single totalCases value
 *
 * UPDATED: Now dynamically handles custom diseases - creates properties for each unique disease
 */
export function aggregateHistoricalByMonthAndDisease(
  statistics: any[],
  monthsBack: number | 'all' = 24
): HistoricalMonthlyByDiseaseData[] {
  // Calculate number of months to display
  const monthCount = monthsBack === 'all'
    ? calculateHistoricalMonthsSinceEarliest(statistics)
    : monthsBack - 1;

  // First pass: identify all unique disease keys (including custom diseases)
  const diseaseKeys = new Set<string>();
  statistics.forEach((stat) => {
    if (!stat.disease_type) return;

    // For custom diseases, use custom_disease_name as the key
    if (stat.disease_type === 'other' && stat.custom_disease_name) {
      diseaseKeys.add(stat.custom_disease_name);
    } else {
      diseaseKeys.add(stat.disease_type);
    }
  });

  // Generate month range with all disease types initialized to 0
  const months: HistoricalMonthlyByDiseaseData[] = [];
  for (let i = monthCount; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const monthData: HistoricalMonthlyByDiseaseData = {
      month: format(date, 'MMM yyyy'),
      date: startOfMonth(date),
    };

    // Initialize all disease keys to 0
    diseaseKeys.forEach((key) => {
      monthData[key] = 0;
    });

    months.push(monthData);
  }

  // Sum case_count by month AND disease type
  statistics.forEach((stat) => {
    if (!stat.record_date || !stat.case_count || !stat.disease_type) return;

    const recordDate = new Date(stat.record_date);
    const monthIndex = months.findIndex((m) =>
      getYear(m.date) === getYear(recordDate) &&
      getMonth(m.date) === getMonth(recordDate)
    );

    if (monthIndex !== -1) {
      // Determine the key for this disease (custom name or disease type)
      const diseaseKey = stat.disease_type === 'other' && stat.custom_disease_name
        ? stat.custom_disease_name
        : stat.disease_type;

      // Add case_count to the appropriate disease property
      if (diseaseKey && diseaseKey in months[monthIndex]) {
        (months[monthIndex] as any)[diseaseKey] =
          ((months[monthIndex] as any)[diseaseKey] || 0) + stat.case_count;
      }
    }
  });

  return months;
}

/**
 * Aggregate historical disease statistics by barangay
 * Sums case_count values for each barangay for specified time range
 *
 * Key difference from individual cases: We SUM case_count instead of counting records,
 * and show ALL barangays (not just top 10) since historical data is already aggregate
 */
export function aggregateHistoricalByBarangay(
  statistics: any[],
  barangayData: Barangay[],
  monthsBack: number | 'all' = 24
): HistoricalBarangayData[] {
  // Filter statistics by date range
  const cutoffDate = monthsBack === 'all'
    ? new Date(0) // Beginning of time
    : subMonths(new Date(), monthsBack);

  const filteredStats = statistics.filter(s => {
    if (!s.record_date) return false;
    return new Date(s.record_date) >= cutoffDate;
  });

  const barangayMap: Record<number, number> = {};
  const barangayNames: Record<number, string> = {};

  // Build barangay name lookup
  barangayData.forEach((b) => {
    barangayNames[b.id] = b.name;
    // Initialize all barangays with 0
    barangayMap[b.id] = 0;
  });

  // Sum case_count per barangay
  filteredStats.forEach((stat) => {
    const barangayId = stat.barangay_id;
    if (barangayId && stat.case_count) {
      barangayMap[barangayId] = (barangayMap[barangayId] || 0) + stat.case_count;
    }
  });

  // Convert to array, filter out zero counts, and sort by total descending
  return Object.entries(barangayMap)
    .map(([id, totalCases]) => ({
      id: parseInt(id, 10),
      name: barangayNames[parseInt(id, 10)] || 'Unknown',
      totalCases,
    }))
    .filter(b => b.totalCases > 0) // Only show barangays with data
    .sort((a, b) => b.totalCases - a.totalCases)
    .slice(0, 10); // Top 10 barangays with most historical cases
}

/**
 * Aggregate historical disease statistics by disease type
 * Sums case_count values for each disease type for specified time range
 * Handles custom diseases by grouping them separately by custom_disease_name
 *
 * Key difference from individual cases: We SUM case_count instead of counting records
 */
export function aggregateHistoricalByDiseaseType(
  statistics: any[],
  monthsBack: number | 'all' = 24
): HistoricalDiseaseTypeData[] {
  // Filter statistics by date range
  const cutoffDate = monthsBack === 'all'
    ? new Date(0) // Beginning of time
    : subMonths(new Date(), monthsBack);

  const filteredStats = statistics.filter(s => {
    if (!s.record_date) return false;
    return new Date(s.record_date) >= cutoffDate;
  });

  const diseaseMap: Record<string, { totalCases: number; customName?: string; rawType: string }> = {};

  // Sum case_count by disease type (separate custom diseases by name)
  filteredStats.forEach((stat) => {
    if (!stat.disease_type || !stat.case_count) return;

    const type = stat.disease_type;

    // For custom diseases, use custom_disease_name as the key to group them separately
    let key: string;
    let customName: string | undefined;

    if (type === 'other' && stat.custom_disease_name) {
      key = `custom_${stat.custom_disease_name}`;
      customName = stat.custom_disease_name;
    } else {
      key = type;
    }

    if (!diseaseMap[key]) {
      diseaseMap[key] = { totalCases: 0, customName, rawType: type };
    }
    diseaseMap[key].totalCases += stat.case_count;
  });

  const total = Object.values(diseaseMap).reduce((a, b) => a + b.totalCases, 0);

  return Object.entries(diseaseMap)
    .map(([key, data]) => ({
      type: formatDiseaseType(data.rawType, data.customName),
      totalCases: data.totalCases,
      percentage: total > 0 ? (data.totalCases / total) * 100 : 0,
      color: getDiseaseColor(data.rawType, data.customName),
    }))
    .sort((a, b) => b.totalCases - a.totalCases);
}

/**
 * Format disease type for display
 * Converts database format to human-readable format
 * For custom diseases (type='other'), uses custom_disease_name if provided
 */
export function formatDiseaseType(type: string, customDiseaseName?: string): string {
  // If it's a custom disease with a name, use that name
  if (type === 'other' && customDiseaseName) {
    return customDiseaseName;
  }

  const formatMap: Record<string, string> = {
    hiv_aids: 'HIV/AIDS',
    dengue: 'Dengue',
    malaria: 'Malaria',
    measles: 'Measles',
    rabies: 'Rabies',
    pregnancy_complications: 'Pregnancy Complications',
    other: 'Other Diseases',
  };

  return formatMap[type] || type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get date range from historical statistics
 * Useful for displaying coverage period
 */
export function getDateRange(statistics: any[]): { earliest: Date | null; latest: Date | null } {
  if (!statistics || statistics.length === 0) {
    return { earliest: null, latest: null };
  }

  const dates = statistics
    .map(s => s.record_date ? new Date(s.record_date) : null)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    earliest: dates.length > 0 ? dates[0] : null,
    latest: dates.length > 0 ? dates[dates.length - 1] : null,
  };
}
