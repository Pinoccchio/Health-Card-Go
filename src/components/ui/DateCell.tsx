'use client';

import { cn } from '@/lib/utils';

interface DateCellProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  appointmentCount: number;
  onClick: () => void;
  disabled?: boolean;
}

export function DateCell({
  date,
  isSelected,
  isToday,
  isCurrentMonth,
  appointmentCount,
  onClick,
  disabled = false,
}: DateCellProps) {
  const dateNumber = date.getDate();

  // Determine appointment indicator style based on count
  const getAppointmentIndicator = () => {
    if (appointmentCount === 0) return null;

    if (appointmentCount >= 10) {
      return (
        <div className="absolute top-1 right-1 flex items-center justify-center">
          <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {appointmentCount > 99 ? '99+' : appointmentCount}
          </span>
        </div>
      );
    } else if (appointmentCount >= 5) {
      return (
        <div className="absolute top-1 right-1 flex items-center justify-center">
          <span className="w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {appointmentCount}
          </span>
        </div>
      );
    } else {
      return (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
          {[...Array(Math.min(appointmentCount, 4))].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-teal-500 rounded-full"></div>
          ))}
        </div>
      );
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'relative min-w-[44px] min-h-[44px] w-full aspect-square rounded-lg transition-all duration-150 touch-manipulation',
        'flex items-center justify-center text-sm font-medium',

        // Disabled state
        disabled && 'cursor-not-allowed opacity-30',

        // Current month vs other months
        isCurrentMonth ? 'text-gray-900' : 'text-gray-400',

        // Selected state
        isSelected && [
          'bg-[#20C997] text-white shadow-md',
          'hover:bg-[#1AA179]',
        ],

        // Not selected states
        !isSelected && [
          // Today (not selected)
          isToday && 'ring-2 ring-[#20C997] ring-inset font-bold',

          // Has appointments (not selected, not today)
          !isToday && appointmentCount > 0 && 'bg-teal-50 hover:bg-teal-100',

          // No appointments (not selected, not today)
          !isToday && appointmentCount === 0 && 'hover:bg-gray-100',
        ],

        // Focus styles
        'focus:outline-none focus:ring-2 focus:ring-[#20C997] focus:ring-offset-2',
      )}
      aria-label={`${date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}${appointmentCount > 0 ? `, ${appointmentCount} appointment${appointmentCount === 1 ? '' : 's'}` : ''}`}
      aria-selected={isSelected}
      aria-current={isToday ? 'date' : undefined}
    >
      {/* Date number */}
      <span className="relative z-10">{dateNumber}</span>

      {/* Appointment indicator */}
      {getAppointmentIndicator()}
    </button>
  );
}
