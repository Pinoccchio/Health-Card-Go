'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  metadata?: {
    createdOn?: string;
    registeredOn?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  metadata,
  size = 'xl',
  className,
}) => {
  // Handle ESC key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop with blur - MATCH ConfirmDialog pattern */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Container - MATCH ConfirmDialog pattern */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Box - CENTERED (not right-side) */}
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-xl w-full animate-in fade-in zoom-in-95 duration-200',
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Teal Header */}
          {title && (
            <div className="bg-[#20C997] text-white px-6 py-4 rounded-t-lg relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/90 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Title and Subtitle */}
              <h2 id="modal-title" className="text-xl font-semibold pr-12">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm opacity-90 mt-1">
                  {subtitle}
                </p>
              )}

              {/* Metadata Row (Created on, Registered On) */}
              {metadata && (metadata.createdOn || metadata.registeredOn) && (
                <div className="flex flex-wrap justify-between gap-4 mt-3 text-sm opacity-95">
                  {metadata.createdOn && (
                    <span>
                      <span className="font-medium">Created on:</span> {metadata.createdOn}
                    </span>
                  )}
                  {metadata.registeredOn && (
                    <span>
                      <span className="font-medium">Registered On:</span> {metadata.registeredOn}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Close button when no title */}
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Content Area - Scrollable with max height */}
          <div className="max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
