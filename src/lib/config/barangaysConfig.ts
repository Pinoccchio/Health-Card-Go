/**
 * Barangay Configuration
 *
 * List of barangays in Panabo City, Davao del Norte, Philippines
 * for the HealthCard system.
 */

import { Barangay } from '@/types/auth';

export const BARANGAYS: Barangay[] = [
  { id: 1, name: 'Datu Abdul Dadia', code: 'DAD' },
  { id: 2, name: 'Gredu (Poblacion)', code: 'GRE' },
  { id: 3, name: 'J.P. Laurel (Poblacion)', code: 'JPL' },
  { id: 4, name: 'Kasilak (Poblacion)', code: 'KAS' },
  { id: 5, name: 'Kauswagan (Poblacion)', code: 'KAU' },
  { id: 6, name: 'Mabunao (Poblacion)', code: 'MAB' },
  { id: 7, name: 'Malativas (Poblacion)', code: 'MAL' },
  { id: 8, name: 'Malijao (Poblacion)', code: 'MLJ' },
  { id: 9, name: 'New Malaga (Poblacion)', code: 'NML' },
  { id: 10, name: 'New Malitbog (Poblacion)', code: 'NMT' },
  { id: 11, name: 'New Pandan (Poblacion)', code: 'NPD' },
  { id: 12, name: 'New Visayas (Poblacion)', code: 'NVS' },
  { id: 13, name: 'Quezon (Poblacion)', code: 'QZN' },
  { id: 14, name: 'Salvacion (Poblacion)', code: 'SLV' },
  { id: 15, name: 'San Francisco (Poblacion)', code: 'SFR' },
  { id: 16, name: 'San Nicolas (Poblacion)', code: 'SNC' },
  { id: 17, name: 'San Pedro (Poblacion)', code: 'SPD' },
  { id: 18, name: 'San Roque (Poblacion)', code: 'SRQ' },
  { id: 19, name: 'San Vicente (Poblacion)', code: 'SVT' },
  { id: 20, name: 'Santa Cruz (Poblacion)', code: 'SCR' },
  { id: 21, name: 'Santo Niño (Poblacion)', code: 'SNO' },
  { id: 22, name: 'A.O. Floirendo', code: 'AOF' },
  { id: 23, name: 'Belmonte', code: 'BEL' },
  { id: 24, name: 'Cagangohan', code: 'CAG' },
  { id: 25, name: 'Cacao', code: 'CAC' },
  { id: 26, name: 'Consolacion', code: 'CON' },
  { id: 27, name: 'Dapco', code: 'DAP' },
  { id: 28, name: 'Katualan', code: 'KTU' },
  { id: 29, name: 'Kiotoy', code: 'KIO' },
  { id: 30, name: 'Little Panay', code: 'LPN' },
  { id: 31, name: 'Lower Panaga (Roxas)', code: 'LPG' },
  { id: 32, name: 'Mabaus', code: 'MBS' },
  { id: 33, name: 'Maduao', code: 'MAD' },
  { id: 34, name: 'Manay', code: 'MNY' },
  { id: 35, name: 'Nanyo', code: 'NYO' },
  { id: 36, name: 'Northern Poblacion', code: 'NPO' },
  { id: 37, name: 'San Juan', code: 'SJN' },
  { id: 38, name: 'Santa Filomena', code: 'SFL' },
  { id: 39, name: 'Santo Tomas', code: 'STM' },
  { id: 40, name: 'Sindaton', code: 'SIN' },
  { id: 41, name: 'Southern Poblacion', code: 'SPO' },
  { id: 42, name: 'Upper Licanan', code: 'ULC' },
  { id: 43, name: 'Waterfall', code: 'WAT' },
  { id: 44, name: 'Outside Zone', code: 'OUT' }, // For non-Panabo residents
];

/**
 * Get barangay by ID
 */
export const getBarangayById = (id: number): Barangay | undefined => {
  return BARANGAYS.find((b) => b.id === id);
};

/**
 * Get barangay by name
 */
export const getBarangayByName = (name: string): Barangay | undefined => {
  return BARANGAYS.find((b) => b.name === name);
};

/**
 * Check if barangay is "Outside Zone"
 */
export const isOutsideZone = (barangayId: number): boolean => {
  return barangayId === 44;
};
