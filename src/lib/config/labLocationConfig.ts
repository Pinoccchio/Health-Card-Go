/**
 * Laboratory Location Configuration
 *
 * Content matches ERRORS.md specifications exactly.
 */

export interface LabLocationInfo {
  location: 'inside_cho' | 'outside_cho';
  name: string;
  description: string;
}

/**
 * Laboratory Location Information
 */
export const LAB_LOCATIONS: LabLocationInfo[] = [
  {
    location: 'inside_cho',
    name: 'Inside CHO Laboratory',
    description: 'For testing conducted at the City Health Office (CHO), a laboratory request form will be issued detailing the associated costs.',
  },
  {
    location: 'outside_cho',
    name: 'Outside CHO Laboratory',
    description: 'For testing performed outside the CHO, confirmation of receipt of your laboratory results is required.',
  },
];

/**
 * Get specific lab location information
 */
export function getLabLocationInfo(location: 'inside_cho' | 'outside_cho'): LabLocationInfo | undefined {
  return LAB_LOCATIONS.find((loc) => loc.location === location);
}

/**
 * Get all lab locations
 */
export function getAllLabLocations(): LabLocationInfo[] {
  return LAB_LOCATIONS;
}
