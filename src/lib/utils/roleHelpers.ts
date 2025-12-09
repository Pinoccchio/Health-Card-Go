import { RoleId } from '@/types/auth';

/**
 * Mapping of role IDs to their respective dashboard paths
 */
export const ROLE_DASHBOARDS: Record<RoleId, string> = {
  1: '/admin/dashboard',
  2: '/healthcare-admin/dashboard',
  4: '/patient/dashboard',
  5: '/staff/dashboard',
};

/**
 * Get the dashboard path for a given role ID
 * @param roleId - The user's role ID (1, 2, 4, 5)
 * @returns The path to the user's dashboard
 */
export function getDashboardPath(roleId: RoleId): string {
  const path = ROLE_DASHBOARDS[roleId];
  if (!path) {
    console.error(`No dashboard path defined for role_id: ${roleId}`);
    return '/login'; // Fallback to login instead of undefined
  }
  return path;
}

/**
 * Get the human-readable name for a role ID
 * @param roleId - The role ID (1, 2, 4, 5)
 * @returns The role name as a string
 */
export function getRoleName(roleId: RoleId): string {
  const roleNames: Record<RoleId, string> = {
    1: 'Super Admin',
    2: 'Healthcare Admin',
    4: 'Patient',
    5: 'Staff',
  };
  return roleNames[roleId] || 'Unknown Role';
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
    4: '/patient',
    5: '/staff',
  };

  const authorizedPrefix = roleRoutes[roleId];
  return authorizedPrefix ? route.startsWith(authorizedPrefix) : false;
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
    4: ['/patient'],
    5: ['/staff'],
  };
  return routes[roleId] || [];
}
