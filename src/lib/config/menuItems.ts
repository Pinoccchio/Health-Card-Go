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
  DollarSign,
  Heart,
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
    label: 'Disease Monitoring',
    href: '/admin/disease-surveillance',
    icon: Activity,
  },
  {
    label: 'Laboratory Fees',
    href: '/admin/lab-fees',
    icon: DollarSign,
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
 * Disease monitoring staff - handles specific diseases (Dengue, Malaria, Measles, Animal Bite, Custom Disease)
 * Excludes HIV and Pregnancy complications (handled by Healthcare Admins)
 * NO appointment management, NO healthcard statistics
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
    label: 'Announcements',
    href: '/staff/announcements',
    icon: Megaphone,
  },
];

/**
 * Menu items for Education Admin (HEPA) (role_id: 6)
 * Announcement management only - no appointment booking
 */
export const EDUCATION_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/education-admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Announcements',
    href: '/education-admin/announcements',
    icon: Megaphone,
  },
  {
    label: 'Profile',
    href: '/education-admin/profile',
    icon: UserCircle,
  },
];

/**
 * Get dynamic menu items for Healthcare Admin based on assigned service properties
 * Returns menu items for Pattern 5: Dual Access (Appointments + Walk-in Queue)
 *
 * @param assignedServiceId - The service ID assigned to the Healthcare Admin
 * @param adminCategory - The admin category (healthcard, hiv, pregnancy, etc.)
 * @returns Promise<MenuItem[]> - Array of menu items tailored to the service capabilities
 *
 * PATTERN 5 - Dual Access (ALL 3 Services: 12, 16, 17):
 * - ALL services show BOTH "Appointments" AND "Walk-in Queue"
 * - Dashboard, Patients, Reports, Announcements (always shown)
 * - Disease Map removed (requires_medical_record = false for all services)
 * - HealthCard Statistics shown only for 'healthcard' admin category
 * - Total: 6-7 menu items depending on admin category
 */
export async function getHealthcareAdminMenuItems(
  assignedServiceId: number | null,
  adminCategory?: string | null
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
  ];

  // Add category-specific menu items based on admin category
  if (adminCategory === 'healthcard') {
    menuItems.push({
      label: 'HealthCard Statistics',
      href: '/healthcare-admin/healthcard-statistics',
      icon: CreditCard,
    });
    console.log('✅ Added HealthCard Statistics menu for healthcard admin');
  }

  // Add HIV Disease Management for HIV admins
  if (adminCategory === 'hiv') {
    menuItems.push({
      label: 'HIV Disease Management',
      href: '/healthcare-admin/hiv-management',
      icon: Shield,
    });
    console.log('✅ Added HIV Disease Management menu for HIV admin');
  }

  // Add Pregnancy Complications Management for pregnancy admins
  if (adminCategory === 'pregnancy') {
    menuItems.push({
      label: 'Pregnancy Management',
      href: '/healthcare-admin/pregnancy-management',
      icon: Heart,
    });
    console.log('✅ Added Pregnancy Complications Management menu for pregnancy admin');
  }

  // Add Reports and Announcements at the end
  menuItems.push(
    {
      label: 'Reports',
      href: '/healthcare-admin/reports',
      icon: FileText,
    },
    {
      label: 'Announcements',
      href: '/healthcare-admin/announcements',
      icon: Megaphone,
    }
  );

  console.log(`✅ Pattern 5 menu generated: ${menuItems.length} items (Appointments + Walk-in Queue${adminCategory === 'healthcard' ? ' + HealthCard Statistics' : ''})`);
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
    6: 'Education Admin (HEPA)',
  };
  return roleNames[roleId];
}
