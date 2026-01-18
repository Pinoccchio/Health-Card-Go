import React from 'react';
import {
  HeroSection,
  ServicesSection,
  AboutSection,
  WhyChooseUsSection,
  AnnouncementsSection,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <WhyChooseUsSection />
      <AnnouncementsSection />
    </>
  );
}
