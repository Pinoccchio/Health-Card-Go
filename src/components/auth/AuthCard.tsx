'use client';

import { HTMLAttributes, forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export interface AuthCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export const AuthCard = forwardRef<HTMLDivElement, AuthCardProps>(
  (
    {
      className,
      children,
      title,
      subtitle,
      showLogo = true,
      showBackButton = false,
      backHref = '/',
      backLabel = 'Back to Home',
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'w-full max-w-2xl bg-white rounded-2xl shadow-xl p-10',
          className
        )}
        {...props}
      >
        {showBackButton && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mb-6"
          >
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-teal transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
          </motion.div>
        )}

        {showLogo && (
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Logo size="xl" variant="stacked" />
            </motion.div>
          </div>
        )}

        {title && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-2xl font-bold text-gray-900 text-center mb-2"
          >
            {title}
          </motion.h1>
        )}

        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-sm text-gray-600 text-center mb-6"
          >
            {subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {children}
        </motion.div>
      </motion.div>
    );
  }
);

AuthCard.displayName = 'AuthCard';
