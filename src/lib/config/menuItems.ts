import {
  LayoutDashboard,
  Calendar,
  Users,
  Activity,
  FileText,
  MapPin,
  MessageSquare,
  Megaphone,
  Heart,
  ClipboardList,
  Bell,
  UserCircle,
  Briefcase,
  UserPlus,
  Map,
  Shield,
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
    label: 'Medical Records',
    href: '/healthcare-admin/medical-records',
    icon: Heart,
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
    label: 'My Health Card',
    href: '/patient/health-card',
    icon: Heart,
  },
  {
    label: 'Medical Records',
    href: '/patient/medical-records',
    icon: FileText,
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
    label: 'Reports',
    href: '/staff/reports',
    icon: FileText,
  },
  {
    label: 'Analytics',
    href: '/staff/analytics',
    icon: Activity,
  },
];

/**
 * Get dynamic menu items for Healthcare Admin based on assigned service properties
 * Returns different menu items depending on whether the service requires appointments/medical records
 *
 * @param assignedServiceId - The service ID assigned to the Healthcare Admin
 * @returns Promise<MenuItem[]> - Array of menu items tailored to the service capabilities
 *
 * Service Property Logic:
 * - requires_appointment = true → Show "Appointments" tab
 * - requires_appointment = false → Show "Walk-in Queue" tab instead
 * - requires_medical_record = true → Show "Medical Records" tab
 * - requires_medical_record = false → Hide "Medical Records" tab
 * - Always show: Dashboard, Patients, Reports, Announcements
 */
export async function getHealthcareAdminMenuItems(
  assignedServiceId: number | null
): Promise<MenuItem[]> {
  // Base menu items (always shown)
  const baseItems: MenuItem[] = [
    {
      label: 'Dashboard',
      href: '/healthcare-admin/dashboard',
      icon: LayoutDashboard,
    },
  ];

  // If no service assigned, return minimal menu with warning
  if (!assignedServiceId) {
    console.warn('⚠️ Healthcare Admin has no assigned service - showing minimal menu');
    return baseItems;
  }

  try {
    // Fetch service properties from API
    const serviceRes = await fetch(`/api/services/${assignedServiceId}`);

    if (!serviceRes.ok) {
      console.error('❌ Failed to fetch service data:', serviceRes.statusText);
      return HEALTHCARE_ADMIN_MENU_ITEMS; // Fallback to static menu
    }

    const serviceData = await serviceRes.json();

    if (!serviceData.success || !serviceData.data) {
      console.error('❌ Invalid service data response:', serviceData);
      return HEALTHCARE_ADMIN_MENU_ITEMS; // Fallback to static menu
    }

    const service = serviceData.data;
    console.log('📋 Building menu for service:', service.name, {
      requires_appointment: service.requires_appointment,
      requires_medical_record: service.requires_medical_record,
    });

    const menuItems = [...baseItems];

    // Add appointment-specific or walk-in items
    if (service.requires_appointment) {
      menuItems.push({
        label: 'Appointments',
        href: '/healthcare-admin/appointments',
        icon: Calendar,
      });
    } else {
      // Walk-in service (Services 22, 23)
      menuItems.push({
        label: 'Walk-in Queue',
        href: '/healthcare-admin/walk-in',
        icon: UserPlus,
      });
    }

    // Always show Patients
    menuItems.push({
      label: 'Patients',
      href: '/healthcare-admin/patients',
      icon: Users,
    });

    // Conditionally add Medical Records
    if (service.requires_medical_record) {
      menuItems.push({
        label: 'Medical Records',
        href: '/healthcare-admin/medical-records',
        icon: Heart,
      });
    }

    // Only show Disease Map for services with medical records (Pattern 2 & 3)
    // Pattern 1 (health card) and Pattern 4 (education) don't track diseases
    if (service.requires_medical_record) {
      menuItems.push({
        label: 'Disease Map',
        href: '/healthcare-admin/disease-map',
        icon: Map,
      });
    }

    // Always show Reports and Announcements
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

    console.log('✅ Generated menu items:', menuItems.length, 'items');
    return menuItems;
  } catch (error) {
    console.error('❌ Error fetching service for menu generation:', error);
    // Fallback to static menu if API call fails
    return HEALTHCARE_ADMIN_MENU_ITEMS;
  }
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
