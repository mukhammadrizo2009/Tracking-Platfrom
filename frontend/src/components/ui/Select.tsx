import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  align?: 'auto' | 'left' | 'right';
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  size = 'sm',
  icon,
  align = 'auto',
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left');
  const [dropUp, setDropUp] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  // Determine smart alignment and drop direction so dropdown never clips off screen
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (align === 'auto') {
        const modalContainer = containerRef.current.closest<HTMLElement>(
          '[role="dialog"], .fixed > div'
        );
        if (modalContainer) {
          const modalRect = modalContainer.getBoundingClientRect();
          if (
            rect.left + 180 > modalRect.right - 10 ||
            rect.left - modalRect.left > modalRect.width / 2 - 20
          ) {
            setDropdownAlign('right');
          } else {
            setDropdownAlign('left');
          }
        } else {
          // If the button's right edge is near the viewport right edge (within 160px) and button is on the right half
          if (rect.left > viewportWidth / 2 && rect.right + 40 > viewportWidth) {
            setDropdownAlign('right');
          } else {
            setDropdownAlign('left');
          }
        }
      } else {
        setDropdownAlign(align);
      }

      const isInsideModal = Boolean(
        containerRef.current.closest('[role="dialog"], .fixed > div, .fixed')
      );
      if (isInsideModal) {
        setDropUp(false);
      } else {
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 180 && spaceAbove > 260) {
          setDropUp(true);
        } else {
          setDropUp(false);
        }
      }
    }
  }, [isOpen, align]);

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

  // Keyboard navigation (Escape to close)
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

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/50 hover:bg-surface-200/70 dark:hover:bg-surface-750 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon && <span className="shrink-0 text-surface-400">{icon}</span>}
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-surface-400">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-surface-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-500' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu (Safe responsive positioning) */}
      {isOpen && (
        <div
          className={`absolute ${
            dropdownAlign === 'right' ? 'right-0' : 'left-0'
          } ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } z-50 w-max min-w-[140px] max-w-[calc(100vw-32px)] max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-700/80 shadow-xl shadow-surface-950/10 dark:shadow-surface-950/40 p-1 animate-in fade-in zoom-in-95 duration-150 space-y-0.5`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary-500 shrink-0 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
