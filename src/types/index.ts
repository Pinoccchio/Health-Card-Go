// TypeScript Type Definitions for HealthCardGo

// Re-export from other type files
export type { Patient } from './auth';

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// Service Types
export interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: any; // LucideIcon
  iconColor: string;
  href: string;
}

// Feature Types
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: any; // LucideIcon
}

// Footer Types
export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

// Contact Types
export interface ContactInfo {
  address: string;
  city: string;
  email: string;
}

// Social Media Types
export interface SocialLink {
  name: string;
  icon: string;
  href: string;
}

// Map Types
export interface BarangayData {
  id: number;
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  casesCount: number;
  population?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very-high';
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  barangays: BarangayData[];
}

// Announcement Types
export type TargetAudience = 'all' | 'patients' | 'healthcare_admin' | 'super_admin' | 'staff' | 'education_admin';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  target_audience: TargetAudience;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
  is_new?: boolean; // True if posted within 48 hours (time-based indicator)
  is_read?: boolean; // True if user has read it (personalized tracking)
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  target_audience: TargetAudience;
  is_active: boolean;
}

export interface UserAnnouncementRead {
  id: string;
  user_id: string;
  announcement_id: string;
  read_at: string;
  created_at: string;
}
