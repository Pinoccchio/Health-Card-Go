import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  FileText,
  MapPin,
  MessageSquare,
  Megaphone,
  ClipboardList,
  Bell,
  UserCircle,
  Briefcase,
  UserPlus,
  Map,
  Shield,
  CreditCard,
} from 'lucide-react';
import { MenuItem } from '@/components/dashboard';
import { RoleId } from '@/types/auth';

/**
 * Menu items for Super Admin (role_id: 1)
 * Full system access with all features
 */
export const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Appointments',
    href: '/admin/appointments',
    icon: Calendar,
  },
  {
    label: 'Patients',
    href: '/admin/patients',
    icon: Users,
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: UserCircle,
  },
  {
    label: 'Services',
    href: '/admin/services',
    icon: Briefcase,
  },
  {
    label: 'Disease Surveillance',
    href: '/admin/disease-surveillance',
    icon: Activity,
  },
  {
    label: 'Reports',
    href: '/admin/reports',
    icon: FileText,
  },
  {
    label: 'Barangays',
    href: '/admin/barangays',
    icon: MapPin,
  },
  {
    label: 'Announcements',
    href: '/admin/announcements',
    icon: Megaphone,
  },
  {
    label: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Shield,
  },
  {
    label: 'Feedback',
    href: '/admin/feedback',
    icon: MessageSquare,
  },
];

/**
 * Menu items for Healthcare Admin (role_id: 2)
 * Category-specific access based on admin_category field
 */
export const HEALTHCARE_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/healthcare-admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Appointments',
    href: '/healthcare-admin/appointments',
    icon: Calendar,
  },
  {
    label: 'Patients',
    href: '/healthcare-admin/patients',
    icon: Users,
  },
  {
    label: 'Disease Map',
    href: '/healthcare-admin/disease-map',
    icon: Map,
  },
  {
    label: 'Reports',
    href: '/healthcare-admin/reports',
    icon: FileText,
  },
  {
    label: 'Announcements',
    href: '/healthcare-admin/announcements',
    icon: Megaphone,
  },
];

/**
 * Menu items for Patient (role_id: 4)
 * Self-service patient portal features
 */
export const PATIENT_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/patient/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Book Appointment',
    href: '/patient/book-appointment',
    icon: Calendar,
  },
  {
    label: 'My Appointments',
    href: '/patient/appointments',
    icon: ClipboardList,
  },
  {
    label: 'Feedback',
    href: '/patient/feedback',
    icon: MessageSquare,
  },
  {
    label: 'Notifications',
    href: '/patient/notifications',
    icon: Bell,
  },
  {
    label: 'Announcements',
    href: '/patient/announcements',
    icon: Megaphone,
  },
  {
    label: 'Profile',
    href: '/patient/profile',
    icon: UserCircle,
  },
];

/**
 * Menu items for Staff (role_id: 5)
 * Disease surveillance staff - handles ALL diseases (Measles, Rabies, Malaria, Dengue, etc.)
 * NO appointment management
 */
export const STAFF_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/staff/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Disease Surveillance',
    href: '/staff/disease-surveillance',
    icon: Activity,
  },
  {
    label: 'HealthCard Statistics',
    href: '/staff/healthcard-statistics',
    icon: CreditCard,
  },
  {
    label: 'Reports',
    href: '/staff/reports',
    icon: FileText,
  },
  {
    label: 'Analytics',
    href: '/staff/analytics',
    icon: Activity,
  },
  {
    label: 'Announcements',
    href: '/staff/announcements',
    icon: Megaphone,
  },
];

/**
 * Get dynamic menu items for Healthcare Admin based on assigned service properties
 * Returns menu items for Pattern 5: Dual Access (Appointments + Walk-in Queue)
 *
 * @param assignedServiceId - The service ID assigned to the Healthcare Admin
 * @returns Promise<MenuItem[]> - Array of menu items tailored to the service capabilities
 *
 * PATTERN 5 - Dual Access (ALL 3 Services: 12, 16, 17):
 * - ALL services show BOTH "Appointments" AND "Walk-in Queue"
 * - Dashboard, Patients, Reports, Announcements (always shown)
 * - Disease Map removed (requires_medical_record = false for all services)
 * - Total: 6 menu items for all Healthcare Admins
 */
export async function getHealthcareAdminMenuItems(
  assignedServiceId: number | null
): Promise<MenuItem[]> {
  // If no service assigned, return minimal menu with warning
  if (!assignedServiceId) {
    console.warn('⚠️ Healthcare Admin has no assigned service - showing minimal menu');
    return [
      {
        label: 'Dashboard',
        href: '/healthcare-admin/dashboard',
        icon: LayoutDashboard,
      },
    ];
  }

  // Pattern 5: ALL services (12, 16, 17) have dual access
  // Show BOTH Appointments AND Walk-in Queue for all Healthcare Admins
  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      href: '/healthcare-admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Appointments',
      href: '/healthcare-admin/appointments',
      icon: Calendar,
    },
    {
      label: 'Walk-in Queue',
      href: '/healthcare-admin/walk-in',
      icon: UserPlus,
    },
    {
      label: 'Patients',
      href: '/healthcare-admin/patients',
      icon: Users,
    },
    {
      label: 'Reports',
      href: '/healthcare-admin/reports',
      icon: FileText,
    },
    {
      label: 'Announcements',
      href: '/healthcare-admin/announcements',
      icon: Megaphone,
    },
  ];

  console.log('✅ Pattern 5 menu generated:', menuItems.length, 'items (Appointments + Walk-in Queue)');
  return menuItems;
}

/**
 * Get human-readable role name from role ID
 */
export function getRoleName(roleId: RoleId): string {
  const roleNames: Record<RoleId, string> = {
    1: 'Super Admin',
    2: 'Healthcare Admin',
    4: 'Patient',
    5: 'Staff',
  };
  return roleNames[roleId];
}
