'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { DateCalendarHeader } from './DateCalendarHeader';
import { DateCell } from './DateCell';
import { cn } from '@/lib/utils';

interface DateCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  markedDates?: Map<string, number>; // Map of date string (YYYY-MM-DD) to appointment count
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DateCalendar({
  selectedDate,
  onDateSelect,
  markedDates = new Map(),
  minDate,
  maxDate,
  className,
}: DateCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    // Initialize to selected date's month
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });

  // Sync currentMonth when selectedDate changes externally
  useEffect(() => {
    const selectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    if (selectedMonth.getTime() !== currentMonth.getTime()) {
      setCurrentMonth(selectedMonth);
    }
  }, [selectedDate]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    const days: Date[] = [];

    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i));
    }

    // Add current month's days
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month's leading days to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentMonth]);

  // Helper to check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Helper to check if date is selected
  const isSelectedDate = (date: Date): boolean => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Helper to check if date is in current month
  const isCurrentMonthDate = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth();
  };

  // Helper to get appointment count for a date
  const getAppointmentCount = (date: Date): number => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return markedDates.get(dateKey) || 0;
  };

  // Helper to check if date is disabled
  const isDisabledDate = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  // Quick filter handlers
  const handleTodayClick = useCallback(() => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onDateSelect(today);
  }, [onDateSelect]);

  const handleTomorrowClick = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCurrentMonth(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
    onDateSelect(tomorrow);
  }, [onDateSelect]);

  const handleNextWeekClick = useCallback(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentMonth(new Date(nextWeek.getFullYear(), nextWeek.getMonth(), 1));
    onDateSelect(nextWeek);
  }, [onDateSelect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if calendar is focused
      if (!document.activeElement?.closest('[role="grid"]')) return;

      const newDate = new Date(selectedDate);

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newDate.setDate(newDate.getDate() - 1);
          onDateSelect(newDate);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newDate.setDate(newDate.getDate() + 1);
          onDateSelect(newDate);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newDate.setDate(newDate.getDate() - 7);
          onDateSelect(newDate);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newDate.setDate(newDate.getDate() + 7);
          onDateSelect(newDate);
          break;
        case 'Home':
          e.preventDefault();
          handleTodayClick();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, onDateSelect, handleTodayClick]);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4 shadow-sm', className)}>
      {/* Header with navigation */}
      <DateCalendarHeader
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onTodayClick={handleTodayClick}
        onTomorrowClick={handleTomorrowClick}
        onNextWeekClick={handleNextWeekClick}
      />

      {/* Calendar grid */}
      <div className="mt-4" role="grid" aria-label="Calendar" tabIndex={0}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-gray-600 py-2"
              role="columnheader"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => (
            <DateCell
              key={index}
              date={date}
              isSelected={isSelectedDate(date)}
              isToday={isToday(date)}
              isCurrentMonth={isCurrentMonthDate(date)}
              appointmentCount={getAppointmentCount(date)}
              onClick={() => {
                if (!isDisabledDate(date)) {
                  onDateSelect(date);
                  // Update current month if selecting date from different month
                  if (!isCurrentMonthDate(date)) {
                    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  }
                }
              }}
              disabled={isDisabledDate(date)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-teal-500 rounded-full"></div>
              <div className="w-1 h-1 bg-teal-500 rounded-full"></div>
            </div>
            <span>1-4 appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              5
            </div>
            <span>5-9 appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              10+
            </div>
            <span>10+ appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 ring-2 ring-[#20C997] ring-inset rounded-lg"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Selected date display */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Selected:</span>{' '}
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {getAppointmentCount(selectedDate) > 0 && (
            <span className="ml-2 text-teal-600 font-medium">
              ({getAppointmentCount(selectedDate)} appointment{getAppointmentCount(selectedDate) === 1 ? '' : 's'})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
