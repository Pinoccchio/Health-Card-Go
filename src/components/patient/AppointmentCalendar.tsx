'use client';

/**
 * Appointment Calendar Component
 *
 * Custom calendar for appointment booking that visually blocks:
 * - Weekends (Saturday/Sunday)
 * - Philippine holidays (national + custom CHO holidays)
 * - Dates before minimum booking date (7 days from today)
 * - Dates not matching service-specific availability
 */

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, addDays, startOfDay } from 'date-fns';
import { getPhilippineHolidays, getCustomHolidays, Holiday } from '@/lib/utils/holidays';
import { getPhilippineTime } from '@/lib/utils/timezone';
import 'react-calendar/dist/Calendar.css';
import './AppointmentCalendar.css';

interface AppointmentCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  minDaysInAdvance?: number; // Default: 7 days
  serviceAvailableDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  markedDates?: Map<string, number>; // Date (YYYY-MM-DD) -> Appointment count
  className?: string;
}

export function AppointmentCalendar({
  selectedDate,
  onDateSelect,
  minDaysInAdvance = 7,
  serviceAvailableDays = [],
  markedDates,
  className = '',
}: AppointmentCalendarProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch holidays on component mount
  useEffect(() => {
    async function loadHolidays() {
      try {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        // Get Philippine holidays from library
        const libraryHolidays = [
          ...getPhilippineHolidays(currentYear),
          ...getPhilippineHolidays(nextYear),
        ];

        // Get custom holidays from database
        const customHolidays = await getCustomHolidays();

        // Merge and remove duplicates
        const allHolidays = [...libraryHolidays, ...customHolidays];
        const uniqueHolidays = new Map<string, Holiday>();

        allHolidays.forEach(holiday => {
          const dateKey = holiday.date.toISOString().split('T')[0];
          if (!uniqueHolidays.has(dateKey) || holiday.source === 'database') {
            uniqueHolidays.set(dateKey, holiday);
          }
        });

        setHolidays(Array.from(uniqueHolidays.values()));
      } catch (error) {
        console.error('Error loading holidays:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHolidays();
  }, []);

  // Calculate minimum booking date (7 days from today in Philippine time)
  const today = getPhilippineTime();
  const minDate = startOfDay(addDays(today, minDaysInAdvance));

  // Check if a date is disabled
  const isDateDisabled = ({ date }: { date: Date }): boolean => {
    const dayOfWeek = date.getDay();

    // Disable weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true;
    }

    // Disable dates before minimum booking date
    if (date < minDate) {
      return true;
    }

    // Disable holidays
    const dateString = format(date, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => format(new Date(h.date), 'yyyy-MM-dd') === dateString);
    if (isHoliday) {
      return true;
    }

    // Disable days not in service availability (if specified)
    if (serviceAvailableDays.length > 0) {
      const dayMap: Record<string, number> = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      const availableDayNumbers = serviceAvailableDays.map(day => dayMap[day]);
      if (!availableDayNumbers.includes(dayOfWeek)) {
        return true;
      }
    }

    return false;
  };

  // Custom tile content to mark holidays
  const getTileClassName = ({ date }: { date: Date }): string | null => {
    const dateString = format(date, 'yyyy-MM-dd');
    const isHoliday = holidays.some(h => format(new Date(h.date), 'yyyy-MM-dd') === dateString);

    if (isHoliday) {
      return 'holiday-tile';
    }

    return null;
  };

  // Get holiday name for a date
  const getHolidayName = (date: Date): string | undefined => {
    const dateString = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => format(new Date(h.date), 'yyyy-MM-dd') === dateString);
    return holiday?.name;
  };

  // Get appointment count badge for a date
  const getTileContent = ({ date }: { date: Date }): JSX.Element | null => {
    if (!markedDates) return null;

    const dateString = format(date, 'yyyy-MM-dd');
    const appointmentCount = markedDates.get(dateString) || 0;

    if (appointmentCount === 0) return null;

    // 10+ appointments: Red badge with number
    if (appointmentCount >= 10) {
      return (
        <div className="absolute top-1 right-1 flex items-center justify-center">
          <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {appointmentCount > 99 ? '99+' : appointmentCount}
          </span>
        </div>
      );
    }

    // 5-9 appointments: Orange badge with number
    if (appointmentCount >= 5) {
      return (
        <div className="absolute top-1 right-1 flex items-center justify-center">
          <span className="w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {appointmentCount}
          </span>
        </div>
      );
    }

    // 1-4 appointments: Teal dots at bottom
    return (
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
        {[...Array(Math.min(appointmentCount, 4))].map((_, i) => (
          <div key={i} className="w-1 h-1 bg-teal-500 rounded-full"></div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
        <p className="ml-3 text-sm text-gray-500">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className={`appointment-calendar ${className}`}>
      <Calendar
        onChange={(value) => onDateSelect(value as Date)}
        value={selectedDate || null}
        minDate={minDate}
        maxDate={addDays(today, 365)}
        tileDisabled={isDateDisabled}
        tileClassName={getTileClassName}
        tileContent={getTileContent}
        showNeighboringMonth={false}
        locale="en-US"
      />

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
        <h4 className="font-semibold text-gray-900 mb-2">Legend:</h4>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-teal rounded-md"></div>
          <span className="text-gray-700">Selected date</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 rounded-md font-bold flex items-center justify-center text-gray-900">
            {format(today, 'd')}
          </div>
          <span className="text-gray-700">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-md font-semibold flex items-center justify-center text-orange-900">
            15
          </div>
          <span className="text-gray-700">Holiday (not available)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white border border-gray-200 rounded-md flex items-center justify-center text-gray-300 line-through">
            20
          </div>
          <span className="text-gray-700">Not available (weekend or past date)</span>
        </div>
        {markedDates && markedDates.size > 0 && (
          <>
            <div className="border-t border-gray-300 my-2 pt-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">Appointment Indicators:</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-md relative flex items-center justify-center">
                <span className="text-gray-900">15</span>
                <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                  <div className="w-1 h-1 bg-teal-500 rounded-full"></div>
                  <div className="w-1 h-1 bg-teal-500 rounded-full"></div>
                  <div className="w-1 h-1 bg-teal-500 rounded-full"></div>
                </div>
              </div>
              <span className="text-gray-700">1-4 appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-md relative flex items-center justify-center">
                <span className="text-gray-900">16</span>
                <div className="absolute top-0.5 right-0.5">
                  <span className="w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    7
                  </span>
                </div>
              </div>
              <span className="text-gray-700">5-9 appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border border-gray-200 rounded-md relative flex items-center justify-center">
                <span className="text-gray-900">17</span>
                <div className="absolute top-0.5 right-0.5">
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    15
                  </span>
                </div>
              </div>
              <span className="text-gray-700">10+ appointments</span>
            </div>
          </>
        )}
      </div>

      {/* Selected date display */}
      {selectedDate && (
        <div className="mt-4 p-4 bg-primary-teal/10 border-2 border-primary-teal rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Selected date:</span>{' '}
            <span className="font-bold text-primary-teal">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </p>
          {getHolidayName(selectedDate) && (
            <p className="text-xs text-orange-700 mt-1">
              Note: This is a holiday ({getHolidayName(selectedDate)})
            </p>
          )}
        </div>
      )}

      {/* Service availability note */}
      {serviceAvailableDays.length > 0 && serviceAvailableDays.length < 5 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Service availability:</span> This service is only
            available on <span className="font-bold">{serviceAvailableDays.join(', ')}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
