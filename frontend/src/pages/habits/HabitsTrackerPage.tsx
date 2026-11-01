import React, { useState, useEffect, useMemo } from 'react';
import { habitsApi } from '../../api/endpoints';
import type { Habit } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  CheckSquare,
  Plus,
  Flame,
  Trash2,
  Check,
  Minus,
  Loader2,
  Trophy,
  Calendar,
  CalendarDays,
  CalendarRange,
  BarChart3,
  Lock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'all';

// Safe local date formatting (YYYY-MM-DD) avoiding UTC shifts
const toLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const HabitsTrackerPage: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Optimistic local state: habitId -> status for today
  const [localStatus, setLocalStatus] = useState<Record<string, 'none' | 'partial' | 'done'>>({});

  // View state
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [monthlySelectedHabitId, setMonthlySelectedHabitId] = useState<number | null>(null);

  // All time view filters
  const [selectedHabitId, setSelectedHabitId] = useState<number | 'all'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'done' | 'partial'>('all');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null);
  const [isDeletingHabit, setIsDeletingHabit] = useState(false);

  const fetchHabits = async () => {
    try {
      const data = await habitsApi.list();
      setHabits(data);
      if (data.length > 0 && monthlySelectedHabitId === null) {
        setMonthlySelectedHabitId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  // Today reference
  const now = new Date();
  const todayStr = toLocalDateString(now);

  // Keep monthlySelectedHabitId synced if habits change
  useEffect(() => {
    if (habits.length > 0) {
      if (monthlySelectedHabitId === null || !habits.some((h) => h.id === monthlySelectedHabitId)) {
        setMonthlySelectedHabitId(habits[0].id);
      }
    }
  }, [habits, monthlySelectedHabitId]);

  // Auto-dismiss locked notice after 3 seconds
  useEffect(() => {
    if (lockedNotice) {
      const timer = setTimeout(() => setLockedNotice(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [lockedNotice]);

  // Compute 7 days for Weekly View based on weekOffset (0 = past 6 days ending today)
  const weeklyDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + weekOffset * 7 - (6 - i));
      const dateStr = toLocalDateString(d);
      return {
        dateStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
      };
    });
  }, [weekOffset, todayStr]);

  // Compute full Month Calendar structure for the Monthly View
  const calendarMonthInfo = useMemo(() => {
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();
    const monthName = selectedMonthDate.toLocaleDateString('en-US', { month: 'long' });
    const firstDay = new Date(year, month, 1);
    
    // Monday = 0, Sunday = 6
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isToday: boolean;
      isPast: boolean;
      isFuture: boolean;
    }> = [];

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = toLocalDateString(d);
      days.push({
        dayNumber: i,
        dateStr,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isFuture: dateStr > todayStr,
      });
    }

    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth();

    return {
      year,
      month,
      monthName,
      startWeekday,
      totalDays,
      days,
      isCurrentMonth,
    };
  }, [selectedMonthDate, todayStr]);

  // Compute 12 months for Yearly View
  const yearlyMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      return {
        year,
        month,
        monthName,
        totalDaysInMonth,
        prefix,
      };
    });
  }, []);

  // Helper to extract status for any habit on a specific date
  const getCellStatus = (habit: Habit, dateStr: string, isToday: boolean): 'none' | 'partial' | 'done' => {
    if (isToday) {
      const key = `${habit.id}_today`;
      return localStatus[key] ?? habit.today_status ?? 'none';
    }
    const completions = habit.completions ?? [];
    const found = completions.find((c) => (c.completion_date ?? c.date) === dateStr);
    return found?.status ?? 'none';
  };

  // Toggle handler: strictly restricts editing to TODAY
  const handleToggleCompletion = async (habitId: number, dateStr: string, isToday: boolean) => {
    if (!isToday) {
      setLockedNotice(
        `Past dates (${dateStr}) are locked in history and cannot be modified.`
      );
      return;
    }

    // Cycle none → partial → done → none optimistically
    const key = `${habitId}_today`;
    const current = localStatus[key] ?? habits.find((h) => h.id === habitId)?.today_status ?? 'none';
    const next: 'none' | 'partial' | 'done' =
      current === 'none' ? 'partial' : current === 'partial' ? 'done' : 'none';

    setLocalStatus((prev) => ({ ...prev, [key]: next }));

    try {
      await habitsApi.setStatusToday(habitId, next);
      fetchHabits();
    } catch {
      setLocalStatus((prev) => ({ ...prev, [key]: current }));
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    setIsSubmitting(true);
    try {
      await habitsApi.create({
        name: habitName.trim(),
        description: habitDesc.trim(),
      });
      setIsModalOpen(false);
      setHabitName('');
      setHabitDesc('');
      fetchHabits();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHabit = (id: number) => {
    setHabitToDelete(id);
  };

  const handleConfirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    setIsDeletingHabit(true);
    try {
      await habitsApi.delete(habitToDelete);
      setHabits((prev) => prev.filter((h) => h.id !== habitToDelete));
      setHabitToDelete(null);
    } catch {
      fetchHabits();
    } finally {
      setIsDeletingHabit(false);
    }
  };

  // Currently selected habit for the Monthly Calendar view
  const currentMonthlyHabit = useMemo(() => {
    return habits.find((h) => h.id === monthlySelectedHabitId) || habits[0] || null;
  }, [habits, monthlySelectedHabitId]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white flex items-center gap-2">
            <span>Daily Habit Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Build unshakeable consistency with daily streaks &amp; multi-period tracking
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto"
        >
          Add New Habit
        </Button>
      </div>

      {/* Locked Notice Alert */}
      {lockedNotice && (
        <div className="p-3.5 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-medium flex-1">{lockedNotice}</span>
          <button
            onClick={() => setLockedNotice(null)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-3.5 sm:p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden space-y-6">
        {/* Top Control Bar: Timeframe Switcher + Legend */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-200 dark:border-surface-800">
          {/* Timeframe Tabs (Mobile-friendly horizontal scroll) */}
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
            <div className="inline-flex items-center p-1 rounded-2xl bg-surface-200/70 dark:bg-surface-800/70 text-xs font-semibold gap-1">
              <button
                onClick={() => setTimeRange('weekly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all whitespace-nowrap ${
                  timeRange === 'weekly'
                    ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Weekly</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(7 Days)</span>
              </button>

              <button
                onClick={() => setTimeRange('monthly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all whitespace-nowrap ${
                  timeRange === 'monthly'
                    ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Monthly</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(Calendar)</span>
              </button>

              <button
                onClick={() => setTimeRange('yearly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all whitespace-nowrap ${
                  timeRange === 'yearly'
                    ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Yearly</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(365 Days)</span>
              </button>

              <button
                onClick={() => setTimeRange('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition-all whitespace-nowrap ${
                  timeRange === 'all'
                    ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm font-bold'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>All Time</span>
                <span className="text-[10px] opacity-75 hidden sm:inline">(Archive)</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-surface-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-md bg-surface-200 dark:bg-surface-700" />
              None
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex w-3.5 h-3.5 rounded-md bg-amber-400 items-center justify-center">
                <Minus className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
              Partial
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex w-3.5 h-3.5 rounded-md bg-emerald-500 items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </span>
              Done
            </span>
            <span className="flex items-center gap-1 text-[11px] text-surface-400 border-l border-surface-200 dark:border-surface-700 pl-2">
              <Lock className="w-3 h-3 text-surface-400" />
              Past dates read-only
            </span>
          </div>
        </div>

        {/* Empty state */}
        {habits.length === 0 ? (
          <div className="py-16 text-center">
            <CheckSquare className="w-12 h-12 text-surface-300 dark:text-surface-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
              No habits created yet.
            </p>
            <p className="text-xs text-surface-400 mt-1">
              Create your first habit to begin building your consistency.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              + Create First Habit
            </Button>
          </div>
        ) : (
          <>
            {/* VIEW 1: WEEKLY (7-Day Matrix) */}
            {timeRange === 'weekly' && (
              <div className="space-y-3">
                {/* Week Navigation Header */}
                <div className="flex items-center justify-between text-xs pb-1">
                  <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                    <button
                      onClick={() => setWeekOffset((p) => p - 1)}
                      className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-semibold text-surface-700 dark:text-surface-300 min-w-[90px] text-center">
                      {weekOffset === 0
                        ? 'Current Week'
                        : `${Math.abs(weekOffset)}w ${weekOffset < 0 ? 'ago' : 'ahead'}`}
                    </span>
                    <button
                      onClick={() => setWeekOffset((p) => p + 1)}
                      disabled={weekOffset >= 0}
                      className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Next week"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {weekOffset !== 0 && (
                      <button
                        onClick={() => setWeekOffset(0)}
                        className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-primary-600 dark:text-primary-400 ml-1"
                        title="Reset to current week"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-surface-400 hidden sm:inline">
                    Past days reflect recorded history. Click Today to toggle.
                  </span>
                </div>

                {/* Table with horizontal scroll on mobile */}
                <div className="overflow-x-auto -mx-3.5 sm:mx-0 px-3.5 sm:px-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-800 text-xs text-surface-400 font-semibold">
                        <th className="py-2.5 px-3 min-w-[140px] sm:min-w-[200px] sticky left-0 bg-surface-50 dark:bg-surface-900 z-10">
                          Habit
                        </th>
                        <th className="py-2.5 px-2 text-center min-w-[65px]">Streak</th>
                        {weeklyDays.map((d) => (
                          <th
                            key={d.dateStr}
                            className={`py-2 px-1 text-center min-w-[42px] sm:min-w-[52px] ${
                              d.isToday
                                ? 'text-primary-600 dark:text-primary-400 font-extrabold bg-primary-50/50 dark:bg-primary-950/20 rounded-xl'
                                : ''
                            }`}
                          >
                            <span className="block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                              {d.dayName}
                            </span>
                            <span className="text-xs font-semibold">{d.dayNumber}</span>
                            {d.isToday && (
                              <span className="block text-[8px] uppercase tracking-wider text-primary-500 font-extrabold">
                                Today
                              </span>
                            )}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right min-w-[40px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800 text-sm">
                      {habits.map((h) => {
                        return (
                          <tr
                            key={h.id}
                            className="hover:bg-surface-100/50 dark:hover:bg-surface-800/40 transition-colors"
                          >
                            <td className="py-3 px-3 sticky left-0 bg-surface-50 dark:bg-surface-900 z-10">
                              <p className="font-bold text-surface-900 dark:text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-xs">
                                {h.name}
                              </p>
                              {h.description && (
                                <p className="text-[11px] text-surface-400 truncate max-w-[130px] sm:max-w-xs mt-0.5">
                                  {h.description}
                                </p>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
                                <Flame className="w-3 h-3 fill-amber-400" />
                                <span>{h.current_streak}d</span>
                              </div>
                            </td>

                            {weeklyDays.map((d) => {
                              const cellStatus = getCellStatus(h, d.dateStr, d.isToday);

                              return (
                                <td
                                  key={d.dateStr}
                                  className={`py-3 px-1 text-center ${
                                    d.isToday ? 'bg-primary-50/20 dark:bg-primary-950/10' : ''
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCompletion(h.id, d.dateStr, d.isToday)}
                                    title={
                                      d.isToday
                                        ? `Today (${d.dateStr}): Click to cycle status (${cellStatus})`
                                        : `Past date (${d.dateStr}): ${cellStatus} (read-only)`
                                    }
                                    className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-xl flex items-center justify-center transition-all ${
                                      cellStatus === 'done'
                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                                        : cellStatus === 'partial'
                                        ? 'bg-amber-400 text-white shadow-sm shadow-amber-400/25'
                                        : 'bg-surface-200/70 dark:bg-surface-800/80 text-surface-400'
                                    } ${
                                      d.isToday
                                        ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-surface-900 hover:scale-105 active:scale-95 cursor-pointer'
                                        : 'cursor-default select-none opacity-85'
                                    }`}
                                  >
                                    {cellStatus === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    {cellStatus === 'partial' && <Minus className="w-3 h-3 stroke-[3]" />}
                                    {!d.isToday && cellStatus === 'none' && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-surface-600" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteHabit(h.id)}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete habit"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: MONTHLY (Authentic Calendar View) */}
            {timeRange === 'monthly' && (
              <div className="space-y-5">
                {/* Month Navigation & Habit Picker */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Month Picker Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                      <button
                        onClick={() =>
                          setSelectedMonthDate(
                            (p) => new Date(p.getFullYear(), p.getMonth() - 1, 1)
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300"
                        title="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 font-bold text-sm sm:text-base text-surface-900 dark:text-white min-w-[130px] sm:min-w-[150px] text-center">
                        {calendarMonthInfo.monthName} {calendarMonthInfo.year}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedMonthDate(
                            (p) => new Date(p.getFullYear(), p.getMonth() + 1, 1)
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300"
                        title="Next month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {!calendarMonthInfo.isCurrentMonth && (
                      <button
                        onClick={() => {
                          const d = new Date();
                          d.setDate(1);
                          setSelectedMonthDate(d);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-primary-600 dark:text-primary-400 hover:bg-surface-200 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Today</span>
                      </button>
                    )}
                  </div>

                  {/* Habit Pill Selector (Horizontal scrollable on mobile) */}
                  <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                    <div className="flex items-center gap-1.5">
                      {habits.map((h) => {
                        const isSelected = h.id === currentMonthlyHabit?.id;
                        return (
                          <button
                            key={h.id}
                            onClick={() => setMonthlySelectedHabitId(h.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                              isSelected
                                ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30 font-bold'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                            }`}
                          >
                            {h.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Active Habit Details & Monthly Stats Header */}
                {currentMonthlyHabit && (() => {
                  let monthDone = 0;
                  let monthPartial = 0;
                  calendarMonthInfo.days.forEach((d) => {
                    if (!d.isFuture) {
                      const status = getCellStatus(currentMonthlyHabit, d.dateStr, d.isToday);
                      if (status === 'done') monthDone++;
                      if (status === 'partial') monthPartial++;
                    }
                  });
                  const elapsedDays = calendarMonthInfo.days.filter((d) => !d.isFuture).length;
                  const monthRate =
                    elapsedDays > 0
                      ? Math.round(((monthDone + monthPartial * 0.5) / elapsedDays) * 100)
                      : 0;

                  const todayStatus = getCellStatus(currentMonthlyHabit, todayStr, true);

                  return (
                    <div className="space-y-4">
                      {/* Habit info banner */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-base text-surface-900 dark:text-white truncate">
                              {currentMonthlyHabit.name}
                            </h3>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
                              <Flame className="w-3 h-3 fill-amber-400" />
                              <span>{currentMonthlyHabit.current_streak}d streak</span>
                            </div>
                            <span className="text-xs text-surface-400 shrink-0">
                              (Best: {currentMonthlyHabit.best_streak}d)
                            </span>
                          </div>
                          {currentMonthlyHabit.description && (
                            <p className="text-xs text-surface-400 mt-1 truncate">
                              {currentMonthlyHabit.description}
                            </p>
                          )}
                        </div>

                        {/* Quick Today Toggle */}
                        {calendarMonthInfo.isCurrentMonth && (
                          <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-900/60 p-1.5 px-3 rounded-xl shrink-0 self-start sm:self-auto">
                            <span className="text-xs font-medium text-surface-500">Today:</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCompletion(currentMonthlyHabit.id, todayStr, true)
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                todayStatus === 'done'
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : todayStatus === 'partial'
                                  ? 'bg-amber-400 text-white shadow-sm'
                                  : 'bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-300'
                              }`}
                            >
                              {todayStatus === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {todayStatus === 'partial' && <Minus className="w-3 h-3 stroke-[3]" />}
                              <span className="capitalize">{todayStatus === 'none' ? 'Mark Today' : todayStatus}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Real Calendar Grid (7 columns: Mon..Sun) */}
                      <div className="p-3 sm:p-5 rounded-2xl bg-white dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800 shadow-sm space-y-2">
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-surface-400 pb-1 border-b border-surface-100 dark:border-surface-800">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                            <div key={dayName} className="py-1">
                              <span className="hidden sm:inline">{dayName}</span>
                              <span className="sm:hidden">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx]}</span>
                            </div>
                          ))}
                        </div>

                        {/* Calendar Day Cells */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                          {/* Empty padding cells before first day */}
                          {Array.from({ length: calendarMonthInfo.startWeekday }).map((_, idx) => (
                            <div
                              key={`pad-${idx}`}
                              className="h-12 sm:h-16 rounded-xl bg-surface-100/30 dark:bg-surface-800/20 opacity-30"
                            />
                          ))}

                          {/* Month Days */}
                          {calendarMonthInfo.days.map((day) => {
                            const status = getCellStatus(currentMonthlyHabit, day.dateStr, day.isToday);

                            return (
                              <div
                                key={day.dateStr}
                                className={`h-12 sm:h-16 p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-all ${
                                  day.isToday
                                    ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 shadow-sm'
                                    : day.isFuture
                                    ? 'border-transparent bg-surface-100/20 dark:bg-surface-800/20 opacity-35'
                                    : 'border-surface-200/60 dark:border-surface-700/60 bg-surface-50/50 dark:bg-surface-900/40'
                                }`}
                              >
                                <div className="flex items-center justify-between leading-none">
                                  <span
                                    className={`text-[11px] sm:text-xs font-semibold ${
                                      day.isToday
                                        ? 'text-primary-600 dark:text-primary-400 font-extrabold'
                                        : 'text-surface-600 dark:text-surface-400'
                                    }`}
                                  >
                                    {day.dayNumber}
                                  </span>
                                  {day.isToday && (
                                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-primary-500 hidden sm:inline">
                                      Today
                                    </span>
                                  )}
                                </div>

                                {/* Status inside cell */}
                                <div className="flex justify-center items-center pb-0.5">
                                  {day.isToday ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleCompletion(currentMonthlyHabit.id, day.dateStr, true)
                                      }
                                      title={`Today (${day.dateStr}): Click to cycle status (${status})`}
                                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center transition-all ${
                                        status === 'done'
                                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                                          : status === 'partial'
                                          ? 'bg-amber-400 text-white shadow-sm shadow-amber-400/25'
                                          : 'bg-surface-200 dark:bg-surface-700 text-surface-400 hover:bg-surface-300'
                                      } ring-2 ring-primary-500 hover:scale-105 active:scale-95`}
                                    >
                                      {status === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      {status === 'partial' && <Minus className="w-3 h-3 stroke-[3]" />}
                                      {status === 'none' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-surface-400" />
                                      )}
                                    </button>
                                  ) : day.isPast ? (
                                    <div
                                      title={`Past date (${day.dateStr}): ${status} (read-only)`}
                                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center select-none ${
                                        status === 'done'
                                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                          : status === 'partial'
                                          ? 'bg-amber-400 text-white shadow-sm shadow-amber-400/20'
                                          : 'bg-surface-200/50 dark:bg-surface-800 text-surface-300 dark:text-surface-600'
                                      }`}
                                    >
                                      {status === 'done' && <Check className="w-3 h-3 stroke-[3]" />}
                                      {status === 'partial' && <Minus className="w-2.5 h-2.5 stroke-[3]" />}
                                      {status === 'none' && (
                                        <span className="w-1 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Monthly Stats Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Completion Rate
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-primary-600 dark:text-primary-400 mt-0.5 block">
                            {monthRate}%
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Completed Days
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                            {monthDone}{' '}
                            <span className="text-xs font-normal text-surface-400">
                              / {calendarMonthInfo.totalDays}d
                            </span>
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Partial Days
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                            {monthPartial}d
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Best Streak
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-surface-800 dark:text-surface-200 mt-0.5 block">
                            {currentMonthlyHabit.best_streak}d
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* VIEW 3: YEARLY (365 Days / 12 Months) */}
            {timeRange === 'yearly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-surface-500 pb-1">
                  <span className="font-semibold text-surface-800 dark:text-surface-200">
                    12-Month Habit Consistency Overview
                  </span>
                  <span className="text-[11px] text-surface-400 hidden sm:inline">
                    Yearly trends and month-by-month progress
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {habits.map((h) => {
                    const completions = h.completions ?? [];
                    const oneYearAgo = new Date(now);
                    oneYearAgo.setDate(now.getDate() - 365);
                    const oneYearAgoStr = toLocalDateString(oneYearAgo);

                    const pastYearCompletions = completions.filter(
                      (c) => (c.completion_date ?? c.date) >= oneYearAgoStr
                    );
                    const donePastYear = pastYearCompletions.filter((c) => c.status === 'done').length;
                    const partialPastYear = pastYearCompletions.filter((c) => c.status === 'partial').length;
                    const yearlyRate = Math.round(((donePastYear + partialPastYear * 0.5) / 365) * 100);

                    const todayStatus = getCellStatus(h, todayStr, true);

                    return (
                      <div
                        key={h.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700/60 shadow-sm space-y-4 max-w-full overflow-hidden"
                      >
                        {/* Header & Quick Action (Clean mobile wrap) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-sm sm:text-base text-surface-900 dark:text-white truncate">
                                {h.name}
                              </h4>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0">
                                <Flame className="w-3 h-3 fill-amber-400" />
                                <span>{h.current_streak}d</span>
                              </div>
                              <span className="text-xs text-surface-400 shrink-0">
                                (Best: {h.best_streak}d)
                              </span>
                            </div>
                            {h.description && (
                              <p className="text-xs text-surface-400 mt-1 truncate">{h.description}</p>
                            )}
                          </div>

                          {/* Today toggle */}
                          <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-900/60 p-1.5 px-2.5 rounded-xl shrink-0 self-start sm:self-auto">
                            <span className="text-xs font-medium text-surface-500">Today:</span>
                            <button
                              type="button"
                              onClick={() => handleToggleCompletion(h.id, todayStr, true)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                todayStatus === 'done'
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : todayStatus === 'partial'
                                  ? 'bg-amber-400 text-white shadow-sm'
                                  : 'bg-surface-200 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-300'
                              }`}
                            >
                              {todayStatus === 'done' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {todayStatus === 'partial' && <Minus className="w-3 h-3 stroke-[3]" />}
                              <span className="capitalize">{todayStatus === 'none' ? 'Mark Today' : todayStatus}</span>
                            </button>
                          </div>
                        </div>

                        {/* Metric summary cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-100/60 dark:bg-surface-900/40 min-w-0">
                            <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider truncate">
                              Discipline
                            </span>
                            <span className="text-xs sm:text-base font-extrabold text-primary-600 dark:text-primary-400 mt-0.5 block truncate">
                              {yearlyRate}%
                            </span>
                          </div>
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-100/60 dark:bg-surface-900/40 min-w-0">
                            <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider truncate">
                              Completed
                            </span>
                            <span className="text-xs sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate whitespace-nowrap">
                              {donePastYear} <span className="text-[10px] sm:text-xs font-normal text-surface-400">/ 365d</span>
                            </span>
                          </div>
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-100/60 dark:bg-surface-900/40 min-w-0">
                            <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider truncate">
                              Partial
                            </span>
                            <span className="text-xs sm:text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block truncate">
                              {partialPastYear}d
                            </span>
                          </div>
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-100/60 dark:bg-surface-900/40 min-w-0">
                            <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider truncate">
                              Total Logs
                            </span>
                            <span className="text-xs sm:text-base font-extrabold text-surface-800 dark:text-surface-200 mt-0.5 block truncate">
                              {completions.length}d
                            </span>
                          </div>
                        </div>

                        {/* 12-Month Mini Charts (Responsive on mobile) */}
                        <div>
                          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">
                            12-Month Breakdown:
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1 sm:gap-1.5 text-center">
                            {yearlyMonths.map((m) => {
                              const monthDone = completions.filter(
                                (c) =>
                                  (c.completion_date ?? c.date).startsWith(m.prefix) &&
                                  c.status === 'done'
                              ).length;
                              const monthPartial = completions.filter(
                                (c) =>
                                  (c.completion_date ?? c.date).startsWith(m.prefix) &&
                                  c.status === 'partial'
                              ).length;
                              const monthPct = Math.round(
                                ((monthDone + monthPartial * 0.5) / m.totalDaysInMonth) * 100
                              );

                              return (
                                <div
                                  key={m.prefix}
                                  className="p-1.5 sm:p-2 rounded-xl bg-surface-100/50 dark:bg-surface-900/40 border border-surface-200/50 dark:border-surface-800/60"
                                >
                                  <span className="text-[9px] uppercase font-bold text-surface-400 block">
                                    {m.monthName}
                                  </span>
                                  <span className="text-xs font-bold text-surface-800 dark:text-surface-200 my-0.5 block">
                                    {monthDone}d
                                  </span>
                                  <div className="w-full bg-surface-200 dark:bg-surface-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        monthPct >= 70
                                          ? 'bg-emerald-500'
                                          : monthPct >= 35
                                          ? 'bg-amber-400'
                                          : 'bg-surface-400'
                                      }`}
                                      style={{ width: `${Math.min(monthPct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[8px] text-surface-400 mt-0.5 block">
                                    {monthPct}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 4: ALL TIME (Archive & Activity Log) */}
            {timeRange === 'all' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div>
                    <h3 className="font-bold text-sm text-surface-900 dark:text-white">
                      All Time History &amp; Activity Log
                    </h3>
                    <p className="text-xs text-surface-400 mt-0.5">
                      Full historical records of habit completions
                    </p>
                  </div>

                  {/* Filters using custom professional Select */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select<string | number>
                      value={selectedHabitId}
                      onChange={(val) => setSelectedHabitId(val === 'all' ? 'all' : Number(val))}
                      options={[
                        { value: 'all', label: 'All Habits' },
                        ...habits.map((h) => ({ value: h.id, label: h.name })),
                      ]}
                      size="sm"
                    />

                    <Select<string>
                      value={historyFilter}
                      onChange={(val) => setHistoryFilter(val as 'all' | 'done' | 'partial')}
                      options={[
                        { value: 'all', label: 'All Statuses' },
                        { value: 'done', label: 'Done Only' },
                        { value: 'partial', label: 'Partial Only' },
                      ]}
                      size="sm"
                    />
                  </div>
                </div>

                {/* History Table */}
                {(() => {
                  const filteredHabits =
                    selectedHabitId === 'all'
                      ? habits
                      : habits.filter((h) => h.id === selectedHabitId);

                  const allLogs: Array<{
                    id: number;
                    habitId: number;
                    habitName: string;
                    date: string;
                    status: 'done' | 'partial' | 'none';
                    isToday: boolean;
                  }> = [];

                  filteredHabits.forEach((h) => {
                    const completions = h.completions ?? [];
                    completions.forEach((c) => {
                      const dateStr = c.completion_date ?? c.date;
                      if (!dateStr) return;
                      if (historyFilter !== 'all' && c.status !== historyFilter) return;

                      allLogs.push({
                        id: c.id,
                        habitId: h.id,
                        habitName: h.name,
                        date: dateStr,
                        status: c.status,
                        isToday: dateStr === todayStr,
                      });
                    });
                  });

                  allLogs.sort((a, b) => (b.date > a.date ? 1 : -1));

                  return (
                    <div className="space-y-4">
                      {/* Metric Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Total Logs
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-surface-900 dark:text-white">
                            {allLogs.length}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Fully Completed
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                            {allLogs.filter((l) => l.status === 'done').length}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Partially Completed
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400">
                            {allLogs.filter((l) => l.status === 'partial').length}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60">
                          <span className="text-surface-400 block text-[10px] uppercase font-bold tracking-wider">
                            Active Habits
                          </span>
                          <span className="text-base sm:text-lg font-extrabold text-primary-600 dark:text-primary-400">
                            {filteredHabits.length}
                          </span>
                        </div>
                      </div>

                      {/* Log table: Responsive mobile cards + desktop table */}
                      {allLogs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-surface-400 bg-surface-100/50 dark:bg-surface-800/30 rounded-2xl">
                          No history logs found matching selected filters.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Mobile View: Clean, non-overflowing log cards (sm:hidden) */}
                          <div className="sm:hidden space-y-2">
                            {allLogs.slice(0, 50).map((log) => (
                              <div
                                key={`m_${log.habitId}_${log.date}`}
                                className="p-3 rounded-2xl bg-white dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700/60 shadow-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-surface-900 dark:text-white truncate">
                                    {log.habitName}
                                  </span>
                                  {log.status === 'done' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] shrink-0">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" /> Done
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold text-[10px] shrink-0">
                                      <Minus className="w-2.5 h-2.5 stroke-[3]" /> Partial
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-surface-500 dark:text-surface-400">
                                  <span className="font-mono text-surface-600 dark:text-surface-300">
                                    {log.date}
                                    {log.isToday && (
                                      <span className="ml-1 text-[10px] text-primary-500 font-bold">
                                        (Today)
                                      </span>
                                    )}
                                  </span>
                                  {log.isToday ? (
                                    <span className="text-[10px] text-primary-500 font-bold">
                                      Editable
                                    </span>
                                  ) : (
                                    <span className="text-[10px] inline-flex items-center gap-1 text-surface-400">
                                      <Lock className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop & Tablet View: Structured Table (hidden sm:block) */}
                          <div className="hidden sm:block overflow-x-auto border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden w-full">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-100/60 dark:bg-surface-800/60 text-surface-400 font-semibold">
                                  <th className="py-2.5 px-4">Date</th>
                                  <th className="py-2.5 px-4">Habit Name</th>
                                  <th className="py-2.5 px-3 text-center">Result</th>
                                  <th className="py-2.5 px-4 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                                {allLogs.slice(0, 50).map((log) => (
                                  <tr
                                    key={`${log.habitId}_${log.date}`}
                                    className="hover:bg-surface-100/50 dark:hover:bg-surface-800/40 transition-colors"
                                  >
                                    <td className="py-2.5 px-4 font-mono font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">
                                      {log.date}{' '}
                                      {log.isToday && (
                                        <span className="ml-1 text-[10px] text-primary-500 font-bold">
                                          (Today)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 font-semibold text-surface-900 dark:text-white truncate max-w-xs">
                                      {log.habitName}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      {log.status === 'done' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                          <Check className="w-3 h-3 stroke-[3]" /> Done
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                                          <Minus className="w-3 h-3 stroke-[3]" /> Partial
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                      {log.isToday ? (
                                        <span className="text-[11px] text-primary-500 font-semibold">
                                          Editable
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-surface-400 inline-flex items-center gap-1">
                                          <Lock className="w-3 h-3" /> Locked
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Habit Insights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-surface-900 dark:text-white">
              The Two-Day Rule
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
              Never miss twice in a row. Missing one day is an accident; missing two is the start
              of a new habit of skipping. Keep your streak alive today!
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary-50 dark:bg-primary-950 text-primary-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-surface-900 dark:text-white">
              Discipline &amp; History Principle
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
              Past records reflect genuine consistency and cannot be altered retrospectively.
              Build authentic discipline by tracking daily and staying true to your goals.
            </p>
          </div>
        </div>
      </div>

      {/* Add Habit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Habit"
        description="Define a clear and actionable behavior to build into your daily routine."
      >
        <form onSubmit={handleCreateHabit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Habit Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Read 15 pages of a technical book"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Description or Cue
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Right after morning coffee, with zero phone notifications"
              value={habitDesc}
              onChange={(e) => setHabitDesc(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Habit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={habitToDelete !== null}
        onClose={() => setHabitToDelete(null)}
        onConfirm={handleConfirmDeleteHabit}
        title="Delete Habit"
        description="Are you sure you want to delete this habit? All recorded streaks and completion history will be permanently deleted."
        confirmText="Delete Habit"
        isLoading={isDeletingHabit}
      />
    </div>
  );
};
