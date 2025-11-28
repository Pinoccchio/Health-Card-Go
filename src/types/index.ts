// TypeScript Type Definitions for HealthCardGo

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
