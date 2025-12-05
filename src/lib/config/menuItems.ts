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
    label: 'Announcements',
    href: '/healthcare-admin/announcements',
    icon: Megaphone,
  },
];

/**
 * Menu items for Doctor (role_id: 3)
 * Medical practice focused features
 */
export const DOCTOR_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/doctor/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Appointments',
    href: '/doctor/appointments',
    icon: Calendar,
  },
  {
    label: 'Medical Records',
    href: '/doctor/medical-records',
    icon: FileText,
  },
  {
    label: 'Patients',
    href: '/doctor/patients',
    icon: Users,
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
 * Get human-readable role name from role ID
 */
export function getRoleName(roleId: RoleId): string {
  const roleNames: Record<RoleId, string> = {
    1: 'Super Admin',
    2: 'Healthcare Admin',
    3: 'Doctor',
    4: 'Patient',
    5: 'Staff',
  };
  return roleNames[roleId];
}
