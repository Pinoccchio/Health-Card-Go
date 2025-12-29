import { format, subMonths, startOfMonth, getMonth, getYear, differenceInMonths } from 'date-fns';

// Type definitions for chart data
export interface MonthlyTrendData {
  month: string;
  date: Date;
  newCases: number;
  activeCases: number;
  recovered: number;
}

export interface BarangayData {
  id: number;
  name: string;
  count: number;
}

export interface DiseaseTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface Barangay {
  id: number;
  name: string;
  code?: string;
}

// Disease color mapping
const DISEASE_COLORS: Record<string, string> = {
  hiv_aids: '#ef4444',
  dengue: '#f59e0b',
  malaria: '#14b8a6',
  measles: '#8b5cf6',
  rabies: '#ec4899',
  pregnancy_complications: '#f97316',
  other: '#6b7280', // gray for custom diseases
};

/**
 * Generate labels for the last 12 months
 */
export function getLast12Months(): Array<{ label: string; date: Date }> {
  const months: Array<{ label: string; date: Date }> = [];

  for (let i = 11; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    months.push({
      label: format(date, 'MMM'),
      date: startOfMonth(date),
    });
  }

  return months;
}

/**
 * Calculate number of months from earliest disease record to now
 * Used for "All Time" time range option
 */
function calculateMonthsSinceEarliest(diseases: any[]): number {
  if (!diseases || diseases.length === 0) return 23; // Default to 24 months

  const dates = diseases
    .map(d => d.diagnosis_date ? new Date(d.diagnosis_date) : null)
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  if (dates.length === 0) return 23;

  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  const months = differenceInMonths(new Date(), earliest);

  return Math.max(months, 23); // Minimum 24 months
}

/**
 * Aggregate disease cases by month for trend analysis
 * Returns data for specified time range with counts for new, active, and recovered cases
 */
export function aggregateByMonth(
  diseases: any[],
  monthsBack: number | 'all' = 24
): MonthlyTrendData[] {
  // Calculate number of months to display
  const monthCount = monthsBack === 'all'
    ? calculateMonthsSinceEarliest(diseases)
    : monthsBack - 1;

  // Generate month range
  const months: MonthlyTrendData[] = [];
  for (let i = monthCount; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    months.push({
      month: format(date, 'MMM yyyy'),
      date: startOfMonth(date),
      newCases: 0,
      activeCases: 0,
      recovered: 0,
    });
  }

  // Count diseases by month and status
  diseases.forEach((disease) => {
    if (!disease.diagnosis_date) return;

    const diseaseDate = new Date(disease.diagnosis_date);
    const monthIndex = months.findIndex((m) =>
      getYear(m.date) === getYear(diseaseDate) &&
      getMonth(m.date) === getMonth(diseaseDate)
    );

    if (monthIndex !== -1) {
      const status = (disease.status || '').toLowerCase();

      if (status.includes('active') || status === 'ongoing_treatment') {
        months[monthIndex].activeCases++;
      } else if (status === 'recovered') {
        months[monthIndex].recovered++;
      } else {
        // Count as new case if not active or recovered
        months[monthIndex].newCases++;
      }
    }
  });

  return months;
}

/**
 * Aggregate disease cases by barangay
 * Returns top 10 barangays by case count for specified time range
 */
export function aggregateByBarangay(
  diseases: any[],
  barangayData: Barangay[],
  monthsBack: number | 'all' = 24
): BarangayData[] {
  // Filter diseases by date range
  const cutoffDate = monthsBack === 'all'
    ? new Date(0) // Beginning of time
    : subMonths(new Date(), monthsBack);

  const filteredDiseases = diseases.filter(d => {
    if (!d.diagnosis_date) return false;
    return new Date(d.diagnosis_date) >= cutoffDate;
  });

  const barangayMap: Record<number, number> = {};
  const barangayNames: Record<number, string> = {};

  // Build barangay name lookup
  barangayData.forEach((b) => {
    barangayNames[b.id] = b.name;
  });

  // Count cases per barangay
  filteredDiseases.forEach((disease) => {
    const barangayId = disease.barangay_id;
    if (barangayId) {
      barangayMap[barangayId] = (barangayMap[barangayId] || 0) + 1;
    }
  });

  // Convert to array and sort by count descending
  return Object.entries(barangayMap)
    .map(([id, count]) => ({
      id: parseInt(id, 10),
      name: barangayNames[parseInt(id, 10)] || 'Unknown',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 only
}

/**
 * Aggregate disease cases by disease type
 * Returns counts and percentages for each disease type for specified time range
 * Handles custom diseases by grouping them separately by custom_disease_name
 */
export function aggregateByDiseaseType(
  diseases: any[],
  monthsBack: number | 'all' = 24
): DiseaseTypeData[] {
  // Filter diseases by date range
  const cutoffDate = monthsBack === 'all'
    ? new Date(0) // Beginning of time
    : subMonths(new Date(), monthsBack);

  const filteredDiseases = diseases.filter(d => {
    if (!d.diagnosis_date) return false;
    return new Date(d.diagnosis_date) >= cutoffDate;
  });

  const diseaseMap: Record<string, { count: number; customName?: string; rawType: string }> = {};

  filteredDiseases.forEach((disease) => {
    const type = disease.disease_type || 'unknown';

    // For custom diseases, use custom_disease_name as the key to group them separately
    let key: string;
    let customName: string | undefined;

    if (type === 'other' && disease.custom_disease_name) {
      key = `custom_${disease.custom_disease_name}`;
      customName = disease.custom_disease_name;
    } else {
      key = type;
    }

    if (!diseaseMap[key]) {
      diseaseMap[key] = { count: 0, customName, rawType: type };
    }
    diseaseMap[key].count++;
  });

  const total = Object.values(diseaseMap).reduce((a, b) => a + b.count, 0);

  return Object.entries(diseaseMap)
    .map(([key, data]) => ({
      type: formatDiseaseType(data.rawType, data.customName),
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      color: DISEASE_COLORS[data.rawType] || DISEASE_COLORS.other,
    }))
    .sort((a, b) => b.count - a.count);
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
 * Get date range for filtering (last N days)
 */
export function getLastNDays(days: number = 365): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  return { start, end };
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
