'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface DateCalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onTodayClick?: () => void;
  onTomorrowClick?: () => void;
  onNextWeekClick?: () => void;
}

export function DateCalendarHeader({
  currentMonth,
  onMonthChange,
  onTodayClick,
  onTomorrowClick,
  onNextWeekClick,
}: DateCalendarHeaderProps) {
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  // Generate year options (current year -2 to +2)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Generate month options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(monthIndex);
    onMonthChange(newMonth);
  };

  const handleYearSelect = (year: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(year);
    onMonthChange(newMonth);
  };

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      {(onTodayClick || onTomorrowClick || onNextWeekClick) && (
        <div className="flex flex-wrap gap-2">
          {onTodayClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTodayClick}
              className="text-xs"
            >
              Today
            </Button>
          )}
          {onTomorrowClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTomorrowClick}
              className="text-xs"
            >
              Tomorrow
            </Button>
          )}
          {onNextWeekClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNextWeekClick}
              className="text-xs"
            >
              Next Week
            </Button>
          )}
        </div>
      )}

      {/* Month/Year navigation */}
      <div className="flex items-center justify-between gap-2">
        {/* Previous month button */}
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Month and Year selectors */}
        <div className="flex items-center gap-2">
          <select
            value={currentMonth.getMonth()}
            onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#20C997] focus:border-transparent cursor-pointer"
            aria-label="Select month"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={currentMonth.getFullYear()}
            onChange={(e) => handleYearSelect(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#20C997] focus:border-transparent cursor-pointer"
            aria-label="Select year"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Next month button */}
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
