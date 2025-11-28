import React from 'react';
import {
  HeroSection,
  ServicesSection,
  AboutSection,
  WhyChooseUsSection,
  HeatMapSection,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <WhyChooseUsSection />
      <HeatMapSection />
    </>
  );
}
