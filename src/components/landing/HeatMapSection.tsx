'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui';

// Dynamic import of PanaboMap to avoid SSR issues with Leaflet
const PanaboMap = dynamic(
  () => import('./PanaboMap').then((mod) => ({ default: mod.PanaboMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-[#20C997]/10 animate-pulse">
            <svg
              className="w-6 h-6 text-[#20C997]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export function HeatMapSection() {
  const tHeatmap = useTranslations('landing.heatmap');
  const tHeatmapSection = useTranslations('landing.heatmap_section');

  return (
    <section id="heatmap" className="py-20 bg-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {tHeatmap('title')}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {tHeatmap('description')}
          </p>
        </motion.div>

        {/* Interactive Heat Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg"
        >
          {/* Map Legend */}
          <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-md">
            <h4 className="text-sm font-bold text-gray-800 mb-3">{tHeatmapSection('risk_level_title')}</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-xs text-gray-600">{tHeatmapSection('risk_low')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span className="text-xs text-gray-600">{tHeatmapSection('risk_medium')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span className="text-xs text-gray-600">{tHeatmapSection('risk_high')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-xs text-gray-600">{tHeatmapSection('risk_very_high')}</span>
              </div>
            </div>
          </div>

          {/* Interactive Panabo Map */}
          <PanaboMap />
        </motion.div>
      </Container>
    </section>
  );
}
