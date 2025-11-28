import { MapConfig, BarangayData } from '@/types';

/**
 * Calculate risk level based on case count
 * Low: ≤ 25 cases
 * Medium: 26-50 cases
 * High: 51-75 cases
 * Very High: > 75 cases
 */
function getRiskLevel(cases: number): BarangayData['riskLevel'] {
  if (cases <= 25) return 'low';
  if (cases <= 50) return 'medium';
  if (cases <= 75) return 'high';
  return 'very-high';
}

/**
 * Sample barangay data for Panabo City disease surveillance
 * Coordinates are approximate locations within Panabo City
 * Case counts are sample data for demonstration purposes
 */
const barangays: BarangayData[] = [
  {
    id: 1,
    name: 'A. O. Floirendo',
    coordinates: [7.3050, 125.6800],
    casesCount: 15,
    population: 3200,
    riskLevel: getRiskLevel(15),
  },
  {
    id: 2,
    name: 'Buenavista',
    coordinates: [7.3200, 125.6900],
    casesCount: 82,
    population: 5400,
    riskLevel: getRiskLevel(82),
  },
  {
    id: 3,
    name: 'Cacao',
    coordinates: [7.3100, 125.6750],
    casesCount: 38,
    population: 2800,
    riskLevel: getRiskLevel(38),
  },
  {
    id: 4,
    name: 'Datu Abdul Dadia',
    coordinates: [7.3250, 125.6850],
    casesCount: 67,
    population: 4100,
    riskLevel: getRiskLevel(67),
  },
  {
    id: 5,
    name: 'Gredu (Poblacion)',
    coordinates: [7.3167, 125.6833],
    casesCount: 94,
    population: 6800,
    riskLevel: getRiskLevel(94),
  },
  {
    id: 6,
    name: 'J.P. Laurel',
    coordinates: [7.3150, 125.6900],
    casesCount: 22,
    population: 2500,
    riskLevel: getRiskLevel(22),
  },
  {
    id: 7,
    name: 'Kasilak',
    coordinates: [7.3000, 125.6850],
    casesCount: 45,
    population: 3600,
    riskLevel: getRiskLevel(45),
  },
  {
    id: 8,
    name: 'Kauswagan',
    coordinates: [7.3300, 125.6800],
    casesCount: 58,
    population: 4200,
    riskLevel: getRiskLevel(58),
  },
  {
    id: 9,
    name: 'New Malaga',
    coordinates: [7.3080, 125.6920],
    casesCount: 31,
    population: 3100,
    riskLevel: getRiskLevel(31),
  },
  {
    id: 10,
    name: 'New Pandan',
    coordinates: [7.3220, 125.6780],
    casesCount: 19,
    population: 2200,
    riskLevel: getRiskLevel(19),
  },
  {
    id: 11,
    name: 'San Francisco',
    coordinates: [7.3120, 125.6880],
    casesCount: 73,
    population: 5200,
    riskLevel: getRiskLevel(73),
  },
  {
    id: 12,
    name: 'San Nicolas',
    coordinates: [7.3180, 125.6750],
    casesCount: 41,
    population: 3800,
    riskLevel: getRiskLevel(41),
  },
];

/**
 * Map configuration for Panabo City
 * Center coordinates point to Gredu (Poblacion) - the city center
 */
export const PANABO_MAP_CONFIG: MapConfig = {
  center: [7.3167, 125.6833],
  zoom: 13,
  barangays,
};

/**
 * Color mapping for risk levels
 */
export const RISK_COLORS = {
  low: '#22c55e',       // green-500
  medium: '#eab308',    // yellow-500
  high: '#f97316',      // orange-500
  'very-high': '#ef4444', // red-500
} as const;

/**
 * Risk level labels
 */
export const RISK_LABELS = {
  low: 'Low Risk (≤ 25 cases)',
  medium: 'Medium Risk (26-50 cases)',
  high: 'High Risk (51-75 cases)',
  'very-high': 'Very High Risk (> 75 cases)',
} as const;
