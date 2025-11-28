'use client';

import React from 'react';
import { Instagram, Facebook, Twitter, Linkedin, Mail, MapPin } from 'lucide-react';
import { FOOTER_COLUMNS, CONTACT_INFO } from '@/lib/config/landingConfig';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* HealthCare Column */}
          <div>
            <div className="flex items-center space-x-1 mb-4">
              <span className="text-xl font-bold text-[#20C997]">Health</span>
              <span className="text-xl font-bold text-[#FF8542]">Care</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              We are honored to be a part of your healthcare journey and committed to delivering
              compassionate, personalized, and top-notch care every step of the way.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Trust us with your health, and let us work together to achieve the best possible
              outcomes for you and your loved ones.
            </p>
          </div>

          {/* About Us Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">{FOOTER_COLUMNS[0].title}</h3>
            <ul className="space-y-3">
              {FOOTER_COLUMNS[0].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">{FOOTER_COLUMNS[1].title}</h3>
            <ul className="space-y-3">
              {FOOTER_COLUMNS[1].links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-600 hover:text-[#20C997] transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Us Column */}
          <div>
            <h3 className="text-[#20C997] font-bold text-lg mb-4">Contact Us</h3>
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
              Contactus. Copyright © 2025
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
