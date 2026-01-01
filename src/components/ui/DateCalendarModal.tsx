'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DateCalendar } from './DateCalendar';
import { cn } from '@/lib/utils';

interface DateCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  markedDates?: Map<string, number>;
  minDate?: Date;
  maxDate?: Date;
}

export function DateCalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  markedDates,
  minDate,
  maxDate,
}: DateCalendarModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
    onClose(); // Auto-close modal after selection
  };

  return (
    <>
      {/* Backdrop with blur - covers entire viewport including sidebar/appbar */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Content with max-height and overflow */}
        <div
          className={cn(
            'relative bg-white rounded-lg shadow-2xl pointer-events-auto',
            'w-full max-w-2xl',
            'max-h-[90vh] overflow-y-auto', // Fixed height with scroll
            // Animation
            'animate-in fade-in zoom-in-95 duration-200'
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          {/* Sticky Header - stays visible when scrolling */}
          <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-gray-200 z-10">
            <h2 id="calendar-modal-title" className="text-lg font-semibold text-gray-900">
              Select Appointment Date
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close calendar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Calendar Content - scrollable */}
          <div className="p-4">
            <DateCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              markedDates={markedDates}
              minDate={minDate}
              maxDate={maxDate}
              className="border-0 shadow-none" // Remove extra border/shadow in modal
            />
          </div>
        </div>
      </div>
    </>
  );
}
