'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Binisaya' },
];

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en');

  const handleLanguageChange = async (localeCode: string) => {
    try {
      // Set locale cookie via API
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: localeCode }),
      });

      setCurrentLocale(localeCode);
      setIsOpen(false);

      // Reload page to apply new locale
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors
                  ${currentLocale === language.code ? 'bg-primary-teal/10 text-primary-teal font-medium' : 'text-gray-700'}
                `}
              >
                <div className="flex justify-between items-center">
                  <span>{language.nativeName}</span>
                  {currentLocale === language.code && (
                    <svg className="w-4 h-4 text-primary-teal" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-500">{language.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
