import React, { useState, useRef, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  setMonth,
  setYear,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  minDate,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync viewDate when value changes externally
  useEffect(() => {
    if (value) {
      setViewDate(value);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => setViewDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setViewDate((prev) => addMonths(prev, 1));

  // Calendar days generation (Monday to Sunday, matching user screenshot)
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Generate range of selectable years (current year - 1 to current year + 15)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-border bg-canvas px-3 text-body-sm text-text-primary cursor-pointer hover:border-border-strong transition-colors',
          isOpen && 'border-accent shadow-input-focus',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="h-4 w-4 text-text-muted shrink-0" />
          <span className={value ? 'text-text-primary truncate' : 'text-text-muted truncate'}>
            {value ? format(value, 'dd MMM yyyy') : placeholder}
          </span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="h-5 w-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            title="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="text-text-muted/40 font-mono text-[10px]">PICK</span>
        )}
      </div>

      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[290px] rounded-xl border border-border bg-surface shadow-elevated p-3 text-text-primary font-sans select-none animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div className="flex items-center gap-1.5 text-body-sm">
              <select
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate(setMonth(viewDate, parseInt(e.target.value, 10)))}
                className="bg-surface-raised border border-border rounded px-1.5 py-0.5 text-body-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer font-medium"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i} className="bg-surface text-text-primary">
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={(e) => setViewDate(setYear(viewDate, parseInt(e.target.value, 10)))}
                className="bg-surface-raised border border-border rounded px-1.5 py-0.5 text-body-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer font-medium"
              >
                {years.map((yr) => (
                  <option key={yr} value={yr} className="bg-surface text-text-primary">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="h-7 w-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors border border-border/60"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="h-7 w-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors border border-border/60"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-text-muted uppercase tracking-wider mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <div key={idx} className="h-7 flex items-center justify-center font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isSelected = value && isSameDay(day, value);
              const isCurrentDay = isToday(day);
              const isDisabled = minDate ? isBefore(day, startOfDay(minDate)) : false;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(day);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'h-8 w-full rounded-md text-[13px] flex items-center justify-center transition-all font-mono',
                    isSelected && 'bg-text-primary text-canvas font-semibold shadow-sm',
                    !isSelected && isCurrentMonth && !isDisabled && 'text-text-primary hover:bg-surface-raised hover:text-text-primary',
                    !isSelected && !isCurrentMonth && !isDisabled && 'text-text-muted/40 hover:bg-surface-raised/40 hover:text-text-muted',
                    !isSelected && isCurrentDay && 'border border-accent/40 font-medium text-accent',
                    isDisabled && 'text-text-muted/20 cursor-not-allowed pointer-events-none'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[12px] font-medium">
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setIsOpen(false);
              }}
              className="text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-surface-raised"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(now);
                setViewDate(now);
                setIsOpen(false);
              }}
              className="text-accent hover:text-accent font-medium transition-colors px-2 py-1 rounded hover:bg-accent-muted"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
