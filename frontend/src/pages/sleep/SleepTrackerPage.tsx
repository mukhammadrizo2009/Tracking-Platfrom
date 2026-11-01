import React, { useState, useEffect } from 'react';
import { sleepApi } from '../../api/endpoints';
import type { SleepLog } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DatePicker } from '../../components/ui/DatePicker';
import { TimePicker } from '../../components/ui/TimePicker';
import {
  Moon,
  Plus,
  Trash2,
  TrendingUp,
  Activity,
  Loader2,
  Clock,
  Edit2,
  Sparkles,
  Calendar,
  AlertCircle,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const SleepTrackerPage: React.FC = () => {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7' | '14' | '30' | 'all'>('14');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [inputMode, setInputMode] = useState<'duration' | 'times'>('duration');
  const [sleepDate, setSleepDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(30);
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLogs = async () => {
    try {
      const data = await sleepApi.listLogs();
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Helper to extract duration minutes safely
  const getDuration = (l: SleepLog): number => {
    if (typeof l.duration_minutes === 'number' && !isNaN(l.duration_minutes)) {
      return l.duration_minutes;
    }
    if (typeof l.total_sleep_minutes === 'number' && !isNaN(l.total_sleep_minutes)) {
      return l.total_sleep_minutes;
    }
    if (l.hours && typeof l.hours.hours === 'number') {
      return l.hours.hours * 60 + (l.hours.minutes || 0);
    }
    return 0;
  };

  const getNote = (l: SleepLog): string => {
    return (l.note || l.notes || '').trim();
  };

  // Sync Bedtime / WakeTime -> Hours / Minutes
  const handleTimeChange = (newBed: string, newWake: string) => {
    setBedtime(newBed);
    setWakeTime(newWake);
    if (!newBed || !newWake) return;
    try {
      const [bh, bm] = newBed.split(':').map(Number);
      const [wh, wm] = newWake.split(':').map(Number);
      let diff = wh * 60 + wm - (bh * 60 + bm);
      if (diff <= 0) diff += 1440; // overnight
      setHours(Math.floor(diff / 60));
      setMinutes(diff % 60);
    } catch {
      // ignore
    }
  };

  const handleOpenCreate = () => {
    setEditingLog(null);
    setSleepDate(new Date().toISOString().split('T')[0]);
    setHours(7);
    setMinutes(30);
    setBedtime('23:00');
    setWakeTime('06:30');
    setNotes('');
    setError(null);
    setInputMode('duration');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: SleepLog) => {
    setEditingLog(log);
    setSleepDate(log.date);
    const dur = getDuration(log);
    setHours(Math.floor(dur / 60));
    setMinutes(dur % 60);
    setNotes(getNote(log));
    setError(null);
    setInputMode('duration');
    setIsModalOpen(true);
  };

  const handleLogSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let totalMins = Number(hours) * 60 + Number(minutes);
    if (inputMode === 'times') {
      const [bh, bm] = bedtime.split(':').map(Number);
      const [wh, wm] = wakeTime.split(':').map(Number);
      let diff = wh * 60 + wm - (bh * 60 + bm);
      if (diff <= 0) diff += 1440;
      totalMins = diff;
    }

    if (totalMins <= 0 || totalMins > 1440) {
      setError('Sleep duration must be between 1 minute and 24 hours.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLog) {
        await sleepApi.updateLog(editingLog.id, {
          date: sleepDate,
          duration_minutes: totalMins,
          hours_input: Math.floor(totalMins / 60),
          minutes_input: totalMins % 60,
          note: notes.trim(),
        });
      } else {
        await sleepApi.logSleep({
          date: sleepDate,
          duration_minutes: totalMins,
          hours_input: Math.floor(totalMins / 60),
          minutes_input: totalMins % 60,
          note: notes.trim(),
          bedtime: inputMode === 'times' ? bedtime : undefined,
          wake_time: inputMode === 'times' ? wakeTime : undefined,
        });
      }
      setIsModalOpen(false);
      setEditingLog(null);
      setNotes('');
      fetchLogs();
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { detail?: string; date?: string[]; duration_minutes?: string[] } };
      };
      setError(
        errObj?.response?.data?.date?.[0] ||
          errObj?.response?.data?.duration_minutes?.[0] ||
          errObj?.response?.data?.detail ||
          'Failed to save sleep log. A record for this date may already exist.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: number) => {
    try {
      await sleepApi.deleteLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
    } catch {
      fetchLogs();
      setDeletingId(null);
    }
  };

  // Metrics calculation
  const totalMinutes = logs.reduce((acc, l) => acc + getDuration(l), 0);
  const avgMinutes = logs.length > 0 ? Math.round(totalMinutes / logs.length) : 0;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgRemainingMins = avgMinutes % 60;

  // Optimal nights (7h to 9h = 420m to 540m)
  const optimalCount = logs.filter((l) => {
    const d = getDuration(l);
    return d >= 420 && d <= 540;
  }).length;
  const consistencyRate = logs.length > 0 ? Math.round((optimalCount / logs.length) * 100) : 0;

  // Best/Max sleep record
  const maxSleepMins = logs.length > 0 ? Math.max(...logs.map(getDuration)) : 0;
  const maxHours = Math.floor(maxSleepMins / 60);
  const maxRemainingMins = maxSleepMins % 60;

  // Filter logs for chart
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const sliceCount =
    timeframe === '7' ? 7 : timeframe === '14' ? 14 : timeframe === '30' ? 30 : sortedLogs.length;
  const chartSourceLogs = sortedLogs.slice(-sliceCount);

  const chartData = chartSourceLogs.map((l) => {
    const dur = getDuration(l);
    const dObj = new Date(l.date + 'T00:00:00');
    const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dateLabel = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date: l.date.slice(5),
      label: `${dayLabel}, ${dateLabel}`,
      hours: Number((dur / 60).toFixed(1)),
      mins: dur,
      note: getNote(l),
    };
  });

  const getStatusBadge = (dur: number) => {
    if (dur >= 420 && dur <= 540) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Optimal (7-9h)
        </span>
      );
    } else if (dur < 420) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3 h-3" />
          Short (&lt;7h)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Sun className="w-3 h-3" />
          Extended (&gt;9h)
        </span>
      );
    }
  };

  const presetHours = [
    { label: '6h 30m', h: 6, m: 30 },
    { label: '7h 00m', h: 7, m: 0 },
    { label: '7h 30m', h: 7, m: 30 },
    { label: '8h 00m', h: 8, m: 0 },
    { label: '8h 30m', h: 8, m: 30 },
    { label: '9h 00m', h: 9, m: 0 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              Sleep &amp; Recovery Tracker
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Circadian Flow
            </span>
          </div>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Monitor nightly sleep patterns, recovery quality, and optimal recharge cycles
          </p>
        </div>

        <Button onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Log Night&apos;s Sleep
        </Button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Sleep */}
        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm hover:border-indigo-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-500 flex items-center justify-center shrink-0">
            <Moon className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">
              Average Sleep
            </p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">
              {logs.length > 0 ? `${avgHours}h ${avgRemainingMins}m` : '0h 00m'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
              Target: 7.5 — 8.5h
            </p>
          </div>
        </div>

        {/* Optimal Sleep Consistency */}
        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm hover:border-emerald-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">
              Consistency
            </p>
            <p className="text-2xl font-black text-emerald-500">
              {logs.length > 0 ? `${consistencyRate}%` : '—'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
              {optimalCount} of {logs.length} nights optimal
            </p>
          </div>
        </div>

        {/* Peak Rest */}
        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm hover:border-amber-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-500 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">
              Peak Rest
            </p>
            <p className="text-2xl font-black text-amber-500">
              {logs.length > 0 ? `${maxHours}h ${maxRemainingMins}m` : '0h 00m'}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
              Best recovery night
            </p>
          </div>
        </div>

        {/* Logged Nights */}
        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm hover:border-sky-500/40 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/70 text-sky-500 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-surface-400 font-semibold uppercase tracking-wider">
              Logged Nights
            </p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">
              {logs.length}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
              Lifetime recordings
            </p>
          </div>
        </div>
      </div>

      {/* Sleep Insights Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 dark:border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-surface-900 dark:text-white">
              {avgHours >= 7 && avgHours <= 9
                ? 'Your sleep schedule is in the Optimal Zone'
                : avgHours > 0 && avgHours < 7
                ? 'Slight sleep deficit detected'
                : logs.length === 0
                ? 'Start logging your sleep to track circadian recovery'
                : 'Sleep duration above standard target'}
            </h4>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {avgHours >= 7 && avgHours <= 9
                ? 'Great consistency! Maintaining 7.5 to 8.5 hours boosts cognitive recall and sustained alertness.'
                : avgHours > 0 && avgHours < 7
                ? 'Aim for an extra 45–60 minutes tonight to optimize deep REM memory consolidation.'
                : logs.length === 0
                ? 'Regular sleep patterns dramatically enhance study focus, mood stability, and daily habits.'
                : 'Ensure restful wakefulness and maintain a steady bed-and-wake routine each day.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Recommended: 7 — 9 hrs
          </span>
        </div>
      </div>

      {/* Sleep Duration History Chart */}
      <div className="p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-surface-900 dark:text-white flex items-center gap-2">
              <span>Sleep Duration Trends</span>
              <span className="text-xs font-normal text-surface-500 dark:text-surface-400">
                (Hours per Night)
              </span>
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Dashed line marks the ideal minimum recovery threshold (7.0h)
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800/80 p-1 rounded-2xl border border-surface-200 dark:border-surface-700/60 text-xs">
            {(['7', '14', '30', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  timeframe === t
                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                {t === 'all' ? 'All Time' : `${t} Days`}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-surface-400 gap-2">
              <Moon className="w-8 h-8 text-surface-300 dark:text-surface-600 animate-pulse" />
              <span>No sleep data logged for this period yet</span>
              <Button size="sm" variant="secondary" onClick={handleOpenCreate}>
                Log First Night
              </Button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax + 1))]}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const hrs = Math.floor(data.mins / 60);
                      const mns = data.mins % 60;
                      return (
                        <div className="p-3 rounded-2xl bg-surface-900 dark:bg-surface-800 text-white shadow-xl border border-surface-700 text-xs space-y-1.5 min-w-[160px]">
                          <p className="font-semibold text-surface-300">{data.label}</p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-surface-400">Duration:</span>
                            <span className="font-bold text-indigo-400 text-sm">
                              {hrs}h {mns}m
                            </span>
                          </div>
                          {data.note && (
                            <p className="text-[11px] text-surface-400 border-t border-surface-700/60 pt-1 italic">
                              &ldquo;{data.note}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={7.0}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Min target (7h)',
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#sleepGradient)"
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recorded Sleep Logs Table */}
      <div className="p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-surface-900 dark:text-white">
              Recorded Sleep Logs
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Review, edit, or adjust your logged nights
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
            {logs.length} Total Records
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
              No sleep records logged yet
            </p>
            <p className="text-xs text-surface-400 max-w-sm mx-auto">
              Log your first night to start unlocking recovery stats, weekly trends, and circadian insights.
            </p>
            <Button size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Log Today&apos;s Sleep
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-surface-400 uppercase font-semibold border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes / Quality</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {logs.map((l) => {
                  const dur = getDuration(l);
                  const hrs = Math.floor(dur / 60);
                  const mns = dur % 60;
                  const noteText = getNote(l);
                  const dObj = new Date(l.date + 'T00:00:00');
                  const weekday = dObj.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <tr
                      key={l.id}
                      className="hover:bg-surface-100/60 dark:hover:bg-surface-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-surface-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-surface-400" />
                          <span>{l.date}</span>
                          <span className="text-[11px] text-surface-400 font-normal">
                            ({weekday})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          <span>{hrs}h</span>
                          <span className="text-xs text-indigo-500/80">{mns}m</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(dur)}</td>
                      <td className="py-3.5 px-4 text-surface-600 dark:text-surface-300 max-w-xs truncate">
                        {noteText || <span className="text-surface-400 italic">No notes</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Edit sleep record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(l.id)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log / Edit Sleep Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLog(null);
        }}
        title={editingLog ? 'Edit Sleep Record' : "Log Night's Sleep"}
        description={
          editingLog
            ? `Update your sleep record for ${sleepDate}.`
            : 'Track how many hours you rested to maintain your circadian rhythm.'
        }
      >
        <form onSubmit={handleLogSleep} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Date
            </label>
            <DatePicker
              required
              value={sleepDate}
              onChange={(date) => setSleepDate(date)}
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl border border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => setInputMode('duration')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                inputMode === 'duration'
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Direct Duration (Hours &amp; Mins)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('times')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                inputMode === 'times'
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Bedtime &amp; Wake Time
            </button>
          </div>

          {inputMode === 'duration' ? (
            <div className="space-y-3">
              {/* Presets */}
              <div>
                <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1.5">
                  Quick Presets:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {presetHours.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setHours(p.h);
                        setMinutes(p.m);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        hours === p.h && minutes === p.m
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-indigo-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours & Minutes inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    required
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Math.min(23, Number(e.target.value))))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    required
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Bedtime (Fall Asleep)
                  </label>
                  <TimePicker
                    value={bedtime}
                    onChange={(time) => handleTimeChange(time, wakeTime)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                    Wake Time (Morning)
                  </label>
                  <TimePicker
                    value={wakeTime}
                    onChange={(time) => handleTimeChange(bedtime, time)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
                <span className="text-surface-600 dark:text-surface-300 font-medium">
                  Calculated Duration:
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {hours}h {minutes}m
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Notes &amp; Sleep Quality (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Slept deeply, read 20 mins before bed, no caffeine afternoon"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingLog(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingLog ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete Sleep Record"
        description="Are you sure you want to delete this sleep log? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => deletingId !== null && handleDeleteLog(deletingId)}
          >
            Delete Log
          </Button>
        </div>
      </Modal>
    </div>
  );
};
