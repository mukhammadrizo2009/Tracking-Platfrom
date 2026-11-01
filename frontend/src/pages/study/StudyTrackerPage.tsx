import React, { useState, useEffect, useRef } from 'react';
import { studyApi, goalsApi } from '../../api/endpoints';
import { formatLocalDate } from '../../utils/date';
import type { StudySession, Goal } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  CheckCircle,
  Loader2,
  Flame,
} from 'lucide-react';

export const StudyTrackerPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Timer states
  const [mode, setMode] = useState<'pomodoro' | 'break' | 'stopwatch'>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins in seconds
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | ''>('');
  const [sessionSubject, setSessionSubject] = useState('');

  // Manual Log Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualSubject, setManualSubject] = useState('');
  const [manualDuration, setManualDuration] = useState<number | ''>(45);
  const [manualDate, setManualDate] = useState(() => formatLocalDate(new Date()));
  const [manualGoalId, setManualGoalId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const [sessionsRes, goalsRes] = await Promise.all([
        studyApi.listRecords(),
        goalsApi.list({ status: 'active' }),
      ]);
      setSessions(sessionsRes);
      setGoals(goalsRes);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Timer interval handling
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsRunning(false);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  const handleTimerComplete = async () => {
    if (mode === 'pomodoro') {
      const durationMins = 25;
      const today = formatLocalDate(new Date());
      try {
        await studyApi.createRecord({
          study_date: today,
          duration_minutes: durationMins,
          subject: sessionSubject.trim() || 'Pomodoro Deep Focus',
          goal: selectedGoalId ? Number(selectedGoalId) : null,
        });
        fetchData();
        alert('🎉 Great job! 25-minute Pomodoro session completed and logged.');
      } catch {
        // ignore
      }
      setMode('break');
      setTimeLeft(5 * 60);
    } else if (mode === 'break') {
      alert('☕ Break is over! Ready for the next focus session?');
      setMode('pomodoro');
      setTimeLeft(25 * 60);
    }
  };

  const handleStopStopwatch = async () => {
    setIsRunning(false);
    const durationMins = Math.max(1, Math.round(stopwatchSeconds / 60));
    const today = formatLocalDate(new Date());

    if (stopwatchSeconds >= 60) {
      try {
        await studyApi.createRecord({
          study_date: today,
          duration_minutes: durationMins,
          subject: sessionSubject.trim() || 'Deep Work Session',
          goal: selectedGoalId ? Number(selectedGoalId) : null,
        });
        fetchData();
      } catch {
        // ignore
      }
    }
    setStopwatchSeconds(0);
  };

  const handleModeChange = (newMode: 'pomodoro' | 'break' | 'stopwatch') => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'pomodoro') setTimeLeft(25 * 60);
    if (newMode === 'break') setTimeLeft(5 * 60);
    if (newMode === 'stopwatch') setStopwatchSeconds(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const durNum = Number(manualDuration);
    if (!manualSubject.trim() || !durNum || durNum <= 0) return;

    setIsSubmitting(true);
    try {
      await studyApi.createRecord({
        study_date: manualDate,
        duration_minutes: durNum,
        subject: manualSubject.trim(),
        goal: manualGoalId ? Number(manualGoalId) : null,
      });
      setIsModalOpen(false);
      setManualSubject('');
      setManualDuration(45);
      fetchData();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this study record?')) return;
    try {
      await studyApi.deleteRecord(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      fetchData();
    }
  };

  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
            Study &amp; Focus Tracker
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Track deep work hours with live Pomodoro or manual logs
          </p>
        </div>

        <Button
          onClick={() => {
            setManualDuration(45);
            setManualDate(formatLocalDate(new Date()));
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Log Study Session
        </Button>
      </div>

      {/* Main Focus Timer Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl shadow-surface-950/5 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Timer Mode Pills */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => handleModeChange('pomodoro')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'pomodoro'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                : 'bg-surface-200/80 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-300'
            }`}
          >
            Pomodoro (25m)
          </button>
          <button
            onClick={() => handleModeChange('break')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'break'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-surface-200/80 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-300'
            }`}
          >
            Short Break (5m)
          </button>
          <button
            onClick={() => handleModeChange('stopwatch')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              mode === 'stopwatch'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-surface-200/80 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-300'
            }`}
          >
            Stopwatch
          </button>
        </div>

        {/* Big Digital Display */}
        <div className="text-center my-6">
          <span className="font-mono text-6xl sm:text-8xl font-black tracking-tight bg-gradient-to-b from-surface-900 to-surface-700 dark:from-white dark:to-surface-300 bg-clip-text text-transparent select-none">
            {mode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(timeLeft)}
          </span>
          <p className="text-xs uppercase tracking-widest text-surface-400 font-semibold mt-2">
            {isRunning ? 'Focusing...' : 'Ready'}
          </p>
        </div>

        {/* Session Subject & Goal Tag Inputs */}
        <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <input
            type="text"
            placeholder="Focus subject (e.g. System Design)"
            value={sessionSubject}
            onChange={(e) => setSessionSubject(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          <Select<string | number>
            value={selectedGoalId}
            onChange={(val) => setSelectedGoalId(val ? Number(val) : '')}
            options={[
              { value: '', label: 'Tag a Goal (Optional)' },
              ...goals.map((g) => ({ value: g.id, label: g.title })),
            ]}
            size="sm"
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => setIsRunning(!isRunning)}
            className="px-8 shadow-lg shadow-primary-500/25"
            leftIcon={
              isRunning ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )
            }
          >
            {isRunning ? 'Pause' : 'Start Focus'}
          </Button>

          {mode === 'stopwatch' ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={handleStopStopwatch}
              disabled={stopwatchSeconds === 0}
              leftIcon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
            >
              Finish &amp; Save
            </Button>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(mode === 'pomodoro' ? 25 * 60 : 5 * 60);
              }}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-400 font-semibold uppercase">Total Tracked</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">
              {totalHours}h {remainingMins}m
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-500 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-400 font-semibold uppercase">Total Sessions</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">
              {sessions.length}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-400 font-semibold uppercase">Avg Session</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white">
              {sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0} min
            </p>
          </div>
        </div>
      </div>

      {/* Sessions History Table */}
      <div className="p-6 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <h3 className="font-bold text-base text-surface-900 dark:text-white mb-4">
          Study History &amp; Logs
        </h3>

        {sessions.length === 0 ? (
          <p className="text-xs text-surface-400 py-8 text-center">
            No study sessions recorded yet. Start the timer or log one manually!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-surface-400 uppercase font-semibold border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Subject / Topic</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-100/50 dark:hover:bg-surface-800/40">
                    <td className="py-3 px-4 font-mono text-surface-500">
                      {s.date || s.started_at || 'Today'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-surface-900 dark:text-white">
                      {s.description || s.subject_name || s.goal_title || s.notes || 'Focused Study'}
                    </td>
                    <td className="py-3 px-4 font-bold text-primary-600 dark:text-primary-400">
                      {Math.floor(s.duration_minutes / 60) > 0 &&
                        `${Math.floor(s.duration_minutes / 60)}h `}
                      {s.duration_minutes % 60}m
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRecord(s.id)}
                        className="p-1 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Study Session Manually"
        description="Add a study session you completed offline."
      >
        <form onSubmit={handleCreateManualSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Subject or Topic Description
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Consensus Algorithms"
              value={manualSubject}
              onChange={(e) => setManualSubject(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                required
                placeholder="45"
                value={manualDuration}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualDuration(val === '' ? '' : Number(val));
                }}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Date
              </label>
              <DatePicker
                required
                size="md"
                align="right"
                value={manualDate}
                onChange={(date) => setManualDate(date)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Link with Goal (Optional)
            </label>
            <Select<string | number>
              value={manualGoalId}
              onChange={(val) => setManualGoalId(val ? Number(val) : '')}
              options={[
                { value: '', label: 'No goal linked' },
                ...goals.map((g) => ({ value: g.id, label: g.title })),
              ]}
              size="md"
              className="w-full"
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
              Save Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
