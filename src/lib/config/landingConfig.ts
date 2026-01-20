import { type LucideIcon, Heart, Lightbulb, Building2, Stethoscope, Ambulance } from 'lucide-react';

// Navigation Menu Items
export interface NavItem {
  id: string; // Translation key identifier
  label: string; // Fallback English label
  href: string;
  external?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/#home' },
  { id: 'about', label: 'About Us', href: '/#about' },
  { id: 'services', label: 'Services', href: '/#services' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'announcements', label: 'Announcements', href: '/#announcements' },
];

// Service Cards
export interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  href: string;
}

export const SERVICES: ServiceCard[] = [
  {
    id: 'healthcard',
    title: 'Health Card',
    description: 'Accurate Diagnostics, Swift Results: Experience top-notch Laboratory Testing at our facility.',
    icon: Heart,
    iconColor: '#20C997',
    href: '/#services',
  },
  {
    id: 'hiv',
    title: 'HIV',
    description: 'Our thorough assessments and expert evaluations help you stay proactive about your health.',
    icon: Lightbulb,
    iconColor: '#20C997',
    href: '/#services',
  },
  {
    id: 'pregnancy',
    title: 'Pregnancy',
    description: 'Comprehensive prenatal care for expecting mothers. Expert guidance to ensure the health of both mother and baby.',
    icon: Building2,
    iconColor: '#20C997',
    href: '/#services',
  },
];

// Why Choose Us Features
export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: Feature[] = [
  {
    id: 'intensivecare',
    title: 'Intensive Care',
    description: 'Our Intensive Care Unit is equipped with advanced technology and staffed by team of professionals',
    icon: Stethoscope,
  },
  {
    id: 'ambulance',
    title: 'Free Ambulance Car',
    description: 'A compassionate initiative to prioritize your health and well-being without any financial burden.',
    icon: Ambulance,
  },
  {
    id: 'medicalsurgical',
    title: 'Medical and Surgical',
    description: 'Our Medical and Surgical services offer advanced healthcare solutions to address medical needs.',
    icon: Building2,
  },
];

// Footer Columns
export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'About Us',
    links: [
      { label: 'Home', href: '/' },
      { label: 'About Us', href: '/#about' },
      { label: 'Work With Us', href: '/#work' },
      { label: 'Our Blog', href: '/blog' },
      { label: 'Announcements', href: '/#announcements' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Services', href: '/#services' },
      { label: 'Pregnancy Checkup', href: '/#services' },
      { label: 'HIV', href: '/#services' },
      { label: 'Privacy Policy', href: '/#privacy' },
      { label: 'Our Stores', href: '/#stores' },
    ],
  },
  {
    title: 'Links',
    links: [
      { label: 'Terms & Conditions', href: '/#terms' },
      { label: 'Privacy Policy', href: '/#privacy' },
    ],
  },
];

// Contact Information
export interface ContactInfo {
  address: string;
  city: string;
  email: string;
}

export const CONTACT_INFO: ContactInfo = {
  address: 'Quezon St. City Health Office Compound Brgy. New',
  city: 'Pandan 8105 Panabo, Philippines',
  email: 'panabocityhealth@gmail.com',
};

// Social Media Links
export interface SocialLink {
  name: string;
  icon: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { name: 'Instagram', icon: 'instagram', href: '#' },
  { name: 'Facebook', icon: 'facebook', href: '#' },
  { name: 'Twitter', icon: 'twitter', href: '#' },
  { name: 'LinkedIn', icon: 'linkedin', href: '#' },
];

// Hero Section Content
export const HERO_CONTENT = {
  title: 'Providing an Exceptional Patient Experience',
  subtitle: 'Welcome, where exceptional patient experiences are our priority. With compassionate care, state-of-the-art facilities, and a patient-centered approach, we\'re dedicated to your well-being. Trust us with your health and experience the difference.',
  ctaText: 'Book an Appointment',
  ctaHref: '/#book',
};

// About Section Content
export const ABOUT_CONTENT = {
  title: 'About Us',
  paragraphs: [
    'Welcome to our healthcare website, your one-stop destination for reliable and comprehensive health care information. We are committed to promoting wellness and providing valuable resources to empower you on your health journey.',
    'Explore our extensive collection of expertly written articles and guides covering a wide range of health topics. From understanding common medical conditions to tips for maintaining a healthy lifestyle, our content is designed to educate, inspire, and support you in making informed choices for your health.',
    'Discover practical health tips and lifestyle advice to optimize your physical and mental well-being. We believe that small changes can lead to significant improvements in your quality of life, and we\'re here to guide you on your path to a healthier and happier you.',
  ],
};

// Why Choose Us Content
export const WHY_CHOOSE_CONTENT = {
  title: 'Why Choose Us',
  subtitle: 'With a steadfast commitment to your well-being, our team of highly trained healthcare professionals ensures that you receive nothing short of exceptional patient experiences.',
};
