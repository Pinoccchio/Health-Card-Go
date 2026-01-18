'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Instagram, Facebook, Twitter, Linkedin, Mail, MapPin } from 'lucide-react';
import { CONTACT_INFO } from '@/lib/config/landingConfig';

export function Footer() {
  const t = useTranslations('landing.footer');

  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* HealthCardGo Column */}
          <div>
            <div className="flex items-center space-x-1 mb-4">
              <span className="text-xl font-bold text-[#20C997]">HealthCard</span>
              <span className="text-xl font-bold text-[#FF8542]">Go</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              {t('description')}
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('trust')}
            </p>
          </div>

          {/* About Us Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">{t('aboutus')}</h3>
            <ul className="space-y-3">
              <li>
                <a href="/" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('home')}
                </a>
              </li>
              <li>
                <a href="#about" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('aboutus')}
                </a>
              </li>
              <li>
                <a href="#work" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('workwithus')}
                </a>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('ourblog')}
                </Link>
              </li>
              <li>
                <a href="#announcements" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  Announcements
                </a>
              </li>
            </ul>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">{t('services')}</h3>
            <ul className="space-y-3">
              <li>
                <a href="#services" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  Services
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('pregnancycheckup')}
                </a>
              </li>
              <li>
                <a href="#services" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  HIV
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('privacypolicy')}
                </a>
              </li>
              <li>
                <a href="#stores" className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm">
                  {t('ourstores')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Us Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">{t('contact')}</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-[#20C997] flex-shrink-0 mt-1" />
                <p className="text-gray-600 text-sm">
                  {CONTACT_INFO.address}
                  <br />
                  {CONTACT_INFO.city}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-[#20C997] flex-shrink-0" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm"
                >
                  {CONTACT_INFO.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="bg-[#20C997] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-white text-sm">
              {t('copyright')}
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-6">
              <a
                href="#"
                className="text-white hover:text-white/80 transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-white hover:text-white/80 transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-white hover:text-white/80 transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-white hover:text-white/80 transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
