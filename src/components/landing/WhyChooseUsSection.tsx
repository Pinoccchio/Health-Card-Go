'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container, FeatureItem } from '@/components/ui';
import { WHY_CHOOSE_CONTENT, FEATURES } from '@/lib/config/landingConfig';

const itemVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.2,
      ease: 'easeOut',
    },
  }),
};

export function WhyChooseUsSection() {
  return (
    <section id="why-choose-us" className="py-20 bg-gray-50">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/why-choose-us-section.jpg"
                alt="Community healthcare"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </motion.div>

          {/* Features Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                {WHY_CHOOSE_CONTENT.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {WHY_CHOOSE_CONTENT.subtitle}
              </p>
            </motion.div>

            <div className="space-y-6">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <FeatureItem
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
