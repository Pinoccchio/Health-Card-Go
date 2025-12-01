'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Container, Card } from '@/components/ui';
import { SERVICES } from '@/lib/config/landingConfig';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export function ServicesSection() {
  const t = useTranslations('landing');

  return (
    <section id="services" className="py-20 bg-gray-50">
      <Container>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {t('services_section.title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('services_section.description')}
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {SERVICES.map((service) => (
            <motion.div key={service.id} variants={itemVariants}>
              <Card
                title={t(`services.${service.id}.title`)}
                description={t(`services.${service.id}.description`)}
                icon={service.icon}
                iconColor={service.iconColor}
                href={service.href}
                linkText="Learn More"
              />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
