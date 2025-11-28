'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';
import { NAV_ITEMS } from '@/lib/config/landingConfig';
import { cn } from '@/lib/utils';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);

    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white shadow-md'
          : 'bg-[#20C997]'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#home" className="flex items-center space-x-1" onClick={() => handleNavClick('#home')}>
            <span className={cn(
              "text-2xl font-bold transition-colors duration-300",
              isScrolled ? "text-[#20C997]" : "text-[#20C997]"
            )}>
              Health
            </span>
            <span className="text-2xl font-bold text-[#FF8542]">Care</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className={cn(
                  "text-sm font-medium transition-colors duration-200 hover:opacity-80",
                  isScrolled ? "text-gray-700" : "text-white"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Switcher */}
            <button className="flex items-center space-x-2 text-sm font-medium text-white hover:opacity-80 transition-opacity">
              <Image
                src="/images/icons/flags/en-us.png"
                alt="English"
                width={20}
                height={20}
                className="rounded"
              />
              <span className={cn(
                "transition-colors duration-300",
                isScrolled ? "text-gray-700" : "text-white"
              )}>English</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-colors duration-300",
                isScrolled ? "text-gray-700" : "text-white"
              )} />
            </button>

            {/* Login Button */}
            <Button variant="secondary" size="sm">
              Login
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-md text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-white/20">
            <div className="flex flex-col space-y-3">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  className="text-white hover:opacity-80 transition-opacity py-2"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/20">
                <Button variant="secondary" size="md" className="w-full">
                  Login
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
