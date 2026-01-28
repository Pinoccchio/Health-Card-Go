'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Info,
  Loader2,
  CalendarPlus,
  CalendarMinus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  ServiceDateManagerProps,
  CalendarDayInfo,
  DateAvailabilityStatus,
  formatDateForAPI,
  isWeekend,
  isPastDate,
  getDateRange,
  filterWeekdays,
} from '@/types/service-availability';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MIN_BOOKING_DAYS_IN_ADVANCE = 7;

interface Holiday {
  holiday_date: string;
  holiday_name: string;
}

export function ServiceDateManager({
  serviceId,
  serviceName,
  isReadOnly = false,
  onDateToggled,
}: ServiceDateManagerProps) {
  const toast = useToast();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Fetch holidays
  useEffect(() => {
    async function fetchHolidays() {
      try {
        const response = await fetch('/api/holidays');
        if (response.ok) {
          const data = await response.json();
          setHolidays(data.holidays || []);
        }
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    }
    fetchHolidays();
  }, []);

  // Fetch available dates for the current month view
  const fetchAvailableDates = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch for 3 months around current view
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);

      const startStr = formatDateForAPI(startDate);
      const endStr = formatDateForAPI(endDate);

      const response = await fetch(
        `/api/services/${serviceId}/available-dates?start_date=${startStr}&end_date=${endStr}`
      );

      if (response.ok) {
        const data = await response.json();
        const dates = new Set<string>(
          (data.available_dates || []).map((d: { date: string }) => d.date)
        );
        setAvailableDates(dates);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch available dates');
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
      toast.error('Failed to fetch available dates');
    } finally {
      setLoading(false);
    }
  }, [serviceId, currentMonth, toast]);

  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    const days: CalendarDayInfo[] = [];

    // Add previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push(createDayInfo(date, false));
    }

    // Add current month's days
    for (let i = 1; i <= lastDate; i++) {
      const date = new Date(year, month, i);
      days.push(createDayInfo(date, true));
    }

    // Add next month's leading days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(createDayInfo(date, false));
    }

    return days;
  }, [currentMonth, availableDates, holidays]);

  function createDayInfo(date: Date, isCurrentMonth: boolean): CalendarDayInfo {
    const dateString = formatDateForAPI(date);

    let status: DateAvailabilityStatus;
    let holidayName: string | undefined;
    let canModify = false;

    // Calculate minimum bookable date (7 days from today)
    const minBookableDate = new Date();
    minBookableDate.setDate(minBookableDate.getDate() + MIN_BOOKING_DAYS_IN_ADVANCE);
    minBookableDate.setHours(0, 0, 0, 0);

    // Check if date is within the 7-day restriction period
    const isWithinRestrictionPeriod = date < minBookableDate;

    if (isPastDate(date)) {
      status = 'past';
    } else if (isWithinRestrictionPeriod) {
      // Dates within 7 days should be treated as non-modifiable (like past dates)
      status = 'past';
    } else if (isWeekend(date)) {
      status = 'weekend';
    } else {
      const holiday = holidays.find((h) => h.holiday_date === dateString);
      if (holiday) {
        status = 'holiday';
        holidayName = holiday.holiday_name;
      } else if (availableDates.has(dateString)) {
        status = 'available';
        canModify = !isReadOnly && isCurrentMonth;
      } else {
        status = 'blocked';
        canModify = !isReadOnly && isCurrentMonth;
      }
    }

    return {
      date,
      dateString,
      status,
      holidayName,
      canModify,
    };
  }

  // Toggle a single date
  const toggleDate = async (dayInfo: CalendarDayInfo) => {
    if (!dayInfo.canModify || actionLoading) return;

    setActionLoading(dayInfo.dateString);
    try {
      if (dayInfo.status === 'available') {
        // Block the date (DELETE)
        const response = await fetch(
          `/api/services/${serviceId}/available-dates?date=${dayInfo.dateString}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          setAvailableDates((prev) => {
            const newSet = new Set(prev);
            newSet.delete(dayInfo.dateString);
            return newSet;
          });
          toast.success(`${dayInfo.dateString} is now blocked`);
          onDateToggled?.(dayInfo.dateString, false);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to block date');
        }
      } else {
        // Open the date (POST)
        const response = await fetch(`/api/services/${serviceId}/available-dates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dayInfo.dateString }),
        });

        if (response.ok) {
          setAvailableDates((prev) => new Set([...prev, dayInfo.dateString]));
          toast.success(`${dayInfo.dateString} is now available`);
          onDateToggled?.(dayInfo.dateString, true);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to open date');
        }
      }
    } catch (error) {
      console.error('Error toggling date:', error);
      toast.error('Failed to update date');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleBulkOpen = async () => {
    if (selectedDates.size === 0) {
      toast.warning('No dates selected');
      return;
    }

    setActionLoading('bulk');
    try {
      const response = await fetch(`/api/services/${serviceId}/available-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: Array.from(selectedDates) }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableDates((prev) => new Set([...prev, ...data.results.opened]));
        toast.success(`Opened ${data.results.opened.length} dates`);

        if (data.results.skipped.length > 0) {
          toast.info(`${data.results.skipped.length} dates were skipped`);
        }

        setSelectedDates(new Set());
        setIsSelectionMode(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to open dates');
      }
    } catch (error) {
      console.error('Error in bulk open:', error);
      toast.error('Failed to open dates');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk close (block) selected dates
  const handleBulkClose = async () => {
    if (selectedDates.size === 0) {
      toast.warning('No dates selected');
      return;
    }

    setActionLoading('bulk');
    try {
      // Delete each selected date that is currently available
      const datesToClose = Array.from(selectedDates).filter((date) => availableDates.has(date));

      if (datesToClose.length === 0) {
        toast.info('No open dates selected to close');
        setSelectedDates(new Set());
        setIsSelectionMode(false);
        return;
      }

      let closedCount = 0;
      let failedCount = 0;

      for (const date of datesToClose) {
        try {
          const response = await fetch(
            `/api/services/${serviceId}/available-dates?date=${date}`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            closedCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      // Update local state
      setAvailableDates((prev) => {
        const newSet = new Set(prev);
        datesToClose.forEach((date) => newSet.delete(date));
        return newSet;
      });

      if (closedCount > 0) {
        toast.success(`Closed ${closedCount} date${closedCount !== 1 ? 's' : ''}`);
      }
      if (failedCount > 0) {
        toast.warning(`Failed to close ${failedCount} date${failedCount !== 1 ? 's' : ''}`);
      }

      setSelectedDates(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error in bulk close:', error);
      toast.error('Failed to close dates');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenAllWeekdays = async () => {
    // Get all weekdays in current month that aren't holidays
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const allDates = getDateRange(firstDay, lastDay);
    const weekdays = filterWeekdays(allDates);

    // Calculate minimum bookable date (7 days from today)
    const minBookableDate = new Date();
    minBookableDate.setDate(minBookableDate.getDate() + MIN_BOOKING_DAYS_IN_ADVANCE);
    minBookableDate.setHours(0, 0, 0, 0);

    const futureDates = weekdays
      .filter((d) => d >= minBookableDate) // Must be 7+ days out
      .filter((d) => {
        const dateStr = formatDateForAPI(d);
        return !holidays.some((h) => h.holiday_date === dateStr);
      })
      .map((d) => formatDateForAPI(d));

    if (futureDates.length === 0) {
      toast.warning('No dates to open in this month');
      return;
    }

    setActionLoading('bulk');
    try {
      const response = await fetch(`/api/services/${serviceId}/available-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: futureDates, reason: 'Bulk open for month' }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableDates((prev) => new Set([...prev, ...data.results.opened]));
        toast.success(`Opened ${data.results.opened.length} dates`);
        await fetchAvailableDates();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to open dates');
      }
    } catch (error) {
      console.error('Error in bulk open:', error);
      toast.error('Failed to open dates');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle date selection for bulk mode
  const handleDateClick = (dayInfo: CalendarDayInfo) => {
    if (!dayInfo.canModify) return;

    if (isSelectionMode) {
      setSelectedDates((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(dayInfo.dateString)) {
          newSet.delete(dayInfo.dateString);
        } else {
          newSet.add(dayInfo.dateString);
        }
        return newSet;
      });
    } else {
      toggleDate(dayInfo);
    }
  };

  // Get status color and icon
  const getStatusStyle = (status: DateAvailabilityStatus, isCurrentMonth: boolean) => {
    const base = isCurrentMonth ? '' : 'opacity-40';

    switch (status) {
      case 'available':
        return `${base} bg-green-100 text-green-800 hover:bg-green-200 border-green-300`;
      case 'blocked':
        return `${base} bg-red-100 text-red-800 hover:bg-red-200 border-red-300`;
      case 'weekend':
        return `${base} bg-gray-100 text-gray-400 cursor-not-allowed`;
      case 'holiday':
        return `${base} bg-amber-100 text-amber-800 cursor-not-allowed`;
      case 'past':
        return `${base} bg-gray-50 text-gray-300 cursor-not-allowed`;
      default:
        return base;
    }
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <CalendarDays className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Service Date Availability</h3>
              <p className="text-sm text-gray-500">{serviceName}</p>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAvailableDates()}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>

              <button
                onClick={handleOpenAllWeekdays}
                disabled={actionLoading === 'bulk'}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <CalendarPlus className="w-4 h-4" />
                Open All Weekdays
              </button>

              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedDates(new Set());
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isSelectionMode
                    ? 'text-white bg-teal-600 hover:bg-teal-700'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                )}
              >
                {isSelectionMode ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
              </button>
            </div>
          )}

          {isReadOnly && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">View Only</span>
            </div>
          )}
        </div>

        {isSelectionMode && selectedDates.size > 0 && (
          <div className="mt-3 flex items-center justify-between bg-teal-50 p-3 rounded-lg">
            <span className="text-sm text-teal-700">
              {selectedDates.size} date{selectedDates.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkClose}
                disabled={actionLoading === 'bulk'}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'bulk' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarMinus className="w-4 h-4" />
                )}
                Close Selected
              </button>
              <button
                onClick={handleBulkOpen}
                disabled={actionLoading === 'bulk'}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'bulk' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CalendarPlus className="w-4 h-4" />
                )}
                Open Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <h4 className="text-lg font-semibold text-gray-900">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>

          <button
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayInfo, index) => {
                const isCurrentMonth =
                  dayInfo.date.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDates.has(dayInfo.dateString);
                const isActionLoading = actionLoading === dayInfo.dateString;

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(dayInfo)}
                    disabled={!dayInfo.canModify || isActionLoading}
                    className={cn(
                      'relative p-2 h-12 rounded-lg border text-sm font-medium transition-all',
                      getStatusStyle(dayInfo.status, isCurrentMonth),
                      dayInfo.canModify && 'cursor-pointer',
                      isToday(dayInfo.date) && 'ring-2 ring-teal-500 ring-offset-1',
                      isSelected && 'ring-2 ring-blue-500 ring-offset-1 bg-blue-100',
                      isActionLoading && 'opacity-50'
                    )}
                    title={
                      dayInfo.holidayName ||
                      (dayInfo.status === 'weekend' ? 'Weekend' : undefined)
                    }
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      <>
                        <span>{dayInfo.date.getDate()}</span>
                        {dayInfo.status === 'available' && (
                          <Check className="absolute bottom-0.5 right-0.5 w-3 h-3 text-green-600" />
                        )}
                        {dayInfo.status === 'blocked' && isCurrentMonth && !isPastDate(dayInfo.date) && (
                          <X className="absolute bottom-0.5 right-0.5 w-3 h-3 text-red-600" />
                        )}
                        {dayInfo.status === 'holiday' && (
                          <AlertCircle className="absolute bottom-0.5 right-0.5 w-3 h-3 text-amber-600" />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center">
              <X className="w-3 h-3 text-red-600" />
            </div>
            <span className="text-gray-600">Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-100 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-100 border border-amber-300 rounded flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-gray-600">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 ring-2 ring-teal-500 rounded"></div>
            <span className="text-gray-600">Today</span>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          <Info className="inline w-3 h-3 mr-1" />
          Click on a date to toggle its availability. Green dates accept bookings, red dates are
          blocked. Weekends, holidays, and dates within {MIN_BOOKING_DAYS_IN_ADVANCE} days cannot be modified
          (patients must book at least {MIN_BOOKING_DAYS_IN_ADVANCE} days in advance).
        </div>
      </div>
    </div>
  );
}
