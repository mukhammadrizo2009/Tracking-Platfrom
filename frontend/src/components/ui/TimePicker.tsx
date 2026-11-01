import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface TimePickerProps {
  value: string; // HH:MM (24-hour format)
  onChange: (time: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = '23:00',
  onChange,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverAlign, setPopoverAlign] = useState<'left' | 'right'>('left');
  const [dropUp, setDropUp] = useState(false);

  const [hours, minutes] = (value || '23:00').split(':');
  const currentHour = parseInt(hours || '23', 10);
  const currentMinute = parseInt(minutes || '00', 10);

  // Auto-alignment
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.left > viewportWidth / 2 || rect.left + 260 > viewportWidth) {
        setPopoverAlign('right');
      } else {
        setPopoverAlign('left');
      }

      const isInsideModal = Boolean(
        containerRef.current.closest('[role="dialog"], .fixed > div, .fixed')
      );
      if (isInsideModal) {
        setDropUp(false);
      } else {
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 200 && spaceAbove > 300) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
    }
  }, [isOpen]);

  // Close on outside click
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

  const handleHourSelect = (h: number) => {
    const hStr = String(h).padStart(2, '0');
    const mStr = String(currentMinute).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  };

  const handleMinuteSelect = (m: number) => {
    const hStr = String(currentHour).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white font-mono font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/50 hover:bg-surface-200/70 dark:hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-surface-400 shrink-0" />
          <span>{value || 'Select time'}</span>
        </span>
        <span className="text-[10px] uppercase font-bold text-surface-400 font-sans">
          {currentHour >= 12 ? 'PM' : 'AM'}
        </span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            popoverAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 w-[260px] max-w-[calc(100vw-32px)] p-3 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl shadow-surface-950/15 dark:shadow-surface-950/70 animate-in fade-in zoom-in-95 duration-150 space-y-3`}
        >
          <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-700 pb-2">
            <span className="text-xs font-bold text-surface-900 dark:text-white">
              Select Time
            </span>
            <span className="text-xs font-mono font-extrabold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-lg">
              {value}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Hours column */}
            <div>
              <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 text-center">
                Hour
              </span>
              <div className="h-44 overflow-y-auto no-scrollbar space-y-1 p-1 rounded-xl bg-surface-100/70 dark:bg-surface-900/60">
                {Array.from({ length: 24 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleHourSelect(i)}
                    className={`w-full py-1 text-center rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      currentHour === i
                        ? 'bg-primary-600 text-white font-bold shadow-sm'
                        : 'text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white'
                    }`}
                  >
                    {String(i).padStart(2, '0')}:00
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div>
              <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 text-center">
                Minute
              </span>
              <div className="h-44 overflow-y-auto no-scrollbar space-y-1 p-1 rounded-xl bg-surface-100/70 dark:bg-surface-900/60">
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      handleMinuteSelect(m);
                      setIsOpen(false);
                    }}
                    className={`w-full py-1 text-center rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      currentMinute === m
                        ? 'bg-primary-600 text-white font-bold shadow-sm'
                        : 'text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white'
                    }`}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-1 text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
