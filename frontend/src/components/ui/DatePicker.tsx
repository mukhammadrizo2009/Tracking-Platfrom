import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
  align?: 'auto' | 'left' | 'right';
}

const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select date...',
  minDate,
  maxDate,
  className = '',
  disabled = false,
  required = false,
  size = 'md',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toLocalDateString(today), [today]);

  // Current view month/year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Sync viewDate if value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3) {
        setViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Month days computation
  const monthData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long' });
    const firstDay = new Date(year, month, 1);
    
    // Monday = 0, Sunday = 6
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = toLocalDateString(d);
      const isDisabled =
        Boolean(minDate && dateStr < minDate) || Boolean(maxDate && dateStr > maxDate);

      days.push({
        dayNumber: i,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled,
      });
    }

    return {
      year,
      month,
      monthName,
      startWeekday,
      totalDays,
      days,
    };
  }, [viewDate, value, todayStr, minDate, maxDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    onChange(todayStr);
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Format display date: e.g. "Oct 26, 2026" or "2026-10-26"
  const formattedDisplay = useMemo(() => {
    if (!value) return '';
    try {
      const parts = value.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return value;
  }, [value]);

  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>('left');
  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Horizontal alignment
      if (align === 'right') {
        setPopoverAlign('right');
      } else if (align === 'left') {
        setPopoverAlign('left');
      } else {
        // Auto: check if inside modal/dialog first
        const modalContainer = containerRef.current.closest<HTMLElement>(
          '[role="dialog"], .fixed > div'
        );
        if (modalContainer) {
          const modalRect = modalContainer.getBoundingClientRect();
          // If container is in the right half of the modal or would bleed past modal's right edge
          if (
            rect.left + 290 > modalRect.right - 12 ||
            rect.left - modalRect.left > modalRect.width / 2 - 20
          ) {
            setPopoverAlign('right');
          } else {
            setPopoverAlign('left');
          }
        } else {
          // Viewport check
          if (rect.left > viewportWidth / 2 || rect.left + 300 > viewportWidth - 16) {
            setPopoverAlign('right');
          } else {
            setPopoverAlign('left');
          }
        }
      }

      // Vertical drop up/down:
      // Inside modal, ALWAYS drop down below the input to preserve modal header and title
      const isInsideModal = Boolean(
        containerRef.current.closest('[role="dialog"], .fixed > div, .fixed')
      );
      if (isInsideModal) {
        setDropUp(false);
      } else {
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > 360) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
    }
  }, [isOpen, align]);

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/50 hover:bg-surface-200/70 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses}`}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-surface-400 shrink-0" />
          {formattedDisplay ? (
            <span className="truncate">{formattedDisplay}</span>
          ) : (
            <span className="text-surface-400 dark:text-surface-400">{placeholder}</span>
          )}
        </span>

        {value && !required ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-0.5 rounded-md hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 shrink-0 ml-1"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : null}
      </button>

      {/* Floating Calendar Popover (Responsive smart positioning) */}
      {isOpen && (
        <div
          className={`absolute ${
            popoverAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 w-[270px] sm:w-[285px] max-w-[calc(100vw-32px)] p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl shadow-surface-950/20 dark:shadow-surface-950/70 animate-in fade-in zoom-in-95 duration-150 space-y-2 sm:space-y-2.5`}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-surface-100 dark:border-surface-700">
            <span className="font-bold text-xs sm:text-sm text-surface-900 dark:text-white">
              {monthData.monthName} {monthData.year}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Mo..Su) */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-surface-400 dark:text-surface-400 uppercase tracking-wider">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty padding cells */}
            {Array.from({ length: monthData.startWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-7 h-7 sm:w-7.5 sm:h-7.5" />
            ))}

            {/* Actual Days */}
            {monthData.days.map((day) => (
              <button
                key={day.dateStr}
                type="button"
                disabled={day.isDisabled}
                onClick={() => handleSelectDate(day.dateStr)}
                className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-all select-none cursor-pointer ${
                  day.isSelected
                    ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-extrabold shadow-md shadow-primary-500/30 scale-105'
                    : day.isToday
                    ? 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-50 dark:hover:bg-primary-950/40'
                    : 'text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white'
                } ${day.isDisabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
              >
                {day.dayNumber}
              </button>
            ))}
          </div>

          {/* Bottom Bar: Clear / Today Shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-100 dark:border-surface-700 text-xs">
            {!required ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 font-medium transition-colors"
              >
                Clear
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={handleSelectToday}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-500 font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
