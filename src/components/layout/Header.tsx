'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/ui';
import { NAV_ITEMS } from '@/lib/config/landingConfig';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { ROLE_NAMES } from '@/types/auth';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '/images/icons/flags/en-us.png' },
  { code: 'tl', name: 'Tagalog', flag: '/images/icons/flags/ph.png' },
  { code: 'ceb', name: 'Bisaya', flag: '/images/icons/flags/ph.png' },
];

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);

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

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu')) {
        setIsUserMenuOpen(false);
      }
      if (!target.closest('.language-menu')) {
        setIsLanguageMenuOpen(false);
      }
    };

    if (isUserMenuOpen || isLanguageMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isUserMenuOpen, isLanguageMenuOpen]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[1001] bg-primary-teal transition-all duration-300',
        isScrolled && 'shadow-md'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="#home" onClick={() => handleNavClick('#home')}>
            <Logo size="lg" variant="default" colorScheme="light" />
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
                className="text-sm font-medium text-white transition-colors duration-200 hover:text-cta-orange"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="relative language-menu">
              <button
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-all"
              >
                <Image
                  src={selectedLanguage.flag}
                  alt={selectedLanguage.name}
                  width={20}
                  height={20}
                  className="rounded"
                />
                <span>{selectedLanguage.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Language Dropdown */}
              {isLanguageMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-primary-teal/20 py-2 z-[9999]">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        setSelectedLanguage(language);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                        selectedLanguage.code === language.code
                          ? 'bg-primary-teal/10 text-primary-teal font-medium'
                          : 'text-gray-700 hover:bg-primary-teal/10 hover:text-primary-teal'
                      )}
                    >
                      <Image
                        src={language.flag}
                        alt={language.name}
                        width={20}
                        height={20}
                        className="rounded"
                      />
                      {language.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Actions */}
            {isAuthenticated && user ? (
              /* User Menu Dropdown */
              <div className="relative user-menu">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all hover:bg-white/10 text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-teal" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs opacity-70">
                      {ROLE_NAMES[user.role_id]}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-primary-teal/20 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                      <p className="text-xs text-primary-teal mt-1 font-medium">
                        {ROLE_NAMES[user.role_id]}
                      </p>
                    </div>

                    <div className="py-2">
                      <Link
                        href={
                          user.role_id === 1
                            ? '/admin/dashboard'
                            : user.role_id === 2
                              ? '/healthcare-admin/dashboard'
                              : user.role_id === 3
                                ? '/doctor/dashboard'
                                : '/patient/dashboard'
                        }
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary-teal/10 hover:text-primary-teal transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Dashboard
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Login Button */
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Login
                </Button>
              </Link>
            )}
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
                  className="text-white hover:text-cta-orange transition-colors py-2"
                >
                  {item.label}
                </a>
              ))}

              {/* Mobile Language Switcher */}
              <div className="pt-4 border-t border-white/20">
                <p className="text-xs text-white/70 mb-2 px-2">Language</p>
                <div className="space-y-2">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        setSelectedLanguage(language);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        selectedLanguage.code === language.code
                          ? 'bg-white/20 text-white'
                          : 'text-white/90 hover:bg-white/10'
                      )}
                    >
                      <Image
                        src={language.flag}
                        alt={language.name}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                      {language.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/20">
                {isAuthenticated && user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-3 py-2 bg-white/10 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-teal" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-white/70">
                          {ROLE_NAMES[user.role_id]}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={
                        user.role_id === 1
                          ? '/admin/dashboard'
                          : user.role_id === 2
                            ? '/healthcare-admin/dashboard'
                            : user.role_id === 3
                              ? '/doctor/dashboard'
                              : '/patient/dashboard'
                      }
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button variant="secondary" size="md" className="w-full">
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full"
                      onClick={handleLogout}
                      iconLeft={LogOut}
                    >
                      Logout
                    </Button>
                  </div>
                ) : (
                  <Link href="/login">
                    <Button variant="secondary" size="md" className="w-full">
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
