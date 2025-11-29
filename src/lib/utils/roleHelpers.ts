import { RoleId } from '@/types/auth';

/**
 * Mapping of role IDs to their respective dashboard paths
 */
export const ROLE_DASHBOARDS: Record<RoleId, string> = {
  1: '/admin/dashboard',
  2: '/healthcare-admin/dashboard',
  3: '/doctor/dashboard',
  4: '/patient/dashboard',
};

/**
 * Get the dashboard path for a given role ID
 * @param roleId - The user's role ID (1-4)
 * @returns The path to the user's dashboard
 */
export function getDashboardPath(roleId: RoleId): string {
  return ROLE_DASHBOARDS[roleId];
}

/**
 * Get the human-readable name for a role ID
 * @param roleId - The role ID (1-4)
 * @returns The role name as a string
 */
export function getRoleName(roleId: RoleId): string {
  const roleNames: Record<RoleId, string> = {
    1: 'Super Admin',
    2: 'Healthcare Admin',
    3: 'Doctor',
    4: 'Patient',
  };
  return roleNames[roleId];
}

/**
 * Check if a user with a given role is authorized to access a route
 * @param roleId - The user's role ID
 * @param route - The route path to check
 * @returns True if authorized, false otherwise
 */
export function isAuthorizedForRoute(roleId: RoleId, route: string): boolean {
  // Define route prefixes for each role
  const roleRoutes: Record<RoleId, string> = {
    1: '/admin',
    2: '/healthcare-admin',
    3: '/doctor',
    4: '/patient',
  };

  const authorizedPrefix = roleRoutes[roleId];
  return route.startsWith(authorizedPrefix);
}

/**
 * Get all allowed route prefixes for a role
 * @param roleId - The user's role ID
 * @returns Array of allowed route prefixes
 */
export function getAllowedRoutes(roleId: RoleId): string[] {
  const routes: Record<RoleId, string[]> = {
    1: ['/admin'],
    2: ['/healthcare-admin'],
    3: ['/doctor'],
    4: ['/patient'],
  };
  return routes[roleId] || [];
}
