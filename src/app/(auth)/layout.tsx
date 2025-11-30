import { ReactNode } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import '@/app/globals.css';
import { Logo } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: 'Authentication - HealthCardGo System',
  description:
    'Login or register for HealthCardGo - Healthcare Appointment Management System',
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Get locale from cookie
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

  // Load messages for the current locale
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-teal/10 via-white to-cta-orange/10">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5"></div>

      {/* Header */}
      <header className="relative z-10 w-full bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo size="lg" variant="default" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-teal transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} HealthCardGo. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="mailto:support@healthcardgo.com"
                className="inline-flex items-center gap-2 hover:text-primary-teal transition-colors duration-200"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">support@healthcardgo.com</span>
              </a>
              <a
                href="tel:+63123456789"
                className="inline-flex items-center gap-2 hover:text-primary-teal transition-colors duration-200"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">+63 123 456 789</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </NextIntlClientProvider>
  );
}
