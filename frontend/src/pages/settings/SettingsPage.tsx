import React, { useState } from 'react';
import { useAuth } from '../../store/useAuth';
import { authApi } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import {
  User as UserIcon,
  Bell,
  Lock,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, theme, toggleTheme } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [emailNotifs, setEmailNotifs] = useState(user?.email_notifications_enabled ?? true);
  const [studyReminder, setStudyReminder] = useState(user?.study_reminder_enabled ?? true);
  const [habitReminder, setHabitReminder] = useState(user?.habit_reminder_enabled ?? true);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(false);

    try {
      await updateUser({
        display_name: displayName,
        timezone,
        email_notifications_enabled: emailNotifs,
        study_reminder_enabled: studyReminder,
        habit_reminder_enabled: habitReminder,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { detail?: string } } };
      setPasswordError(
        errObj?.response?.data?.detail || 'Failed to change password. Verify your old password.'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white">
          Account &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage your profile, theme settings, and reminder notifications
        </p>
      </div>

      {/* Profile & Appearance Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950 text-primary-500 flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900 dark:text-white">
              Profile &amp; Display
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Personal details and interface theme
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile and preferences updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-200/60 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 text-surface-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Timezone
            </label>
            <Select<string>
              value={timezone}
              onChange={(val) => setTimezone(val)}
              options={[
                { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
                { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
                { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
                { value: 'Asia/Tashkent', label: 'Asia/Tashkent (UZT +5)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9)' },
              ]}
              size="md"
              className="w-full"
            />
          </div>

          {/* Theme switch row */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-100/70 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700">
            <div>
              <p className="font-bold text-xs text-surface-900 dark:text-white">
                Interface Color Mode
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Current mode: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface-200 dark:bg-surface-700 text-surface-800 dark:text-surface-200 hover:bg-surface-300"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-surface-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Notification toggles */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              <span>Reminders &amp; Email Notifications</span>
            </h4>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-surface-900 dark:text-white">
                  Email Notifications Enabled
                </p>
                <p className="text-[11px] text-surface-500 dark:text-surface-400">
                  Receive daily digests and reminders via email
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-surface-900 dark:text-white">
                  Study Reminders
                </p>
                <p className="text-[11px] text-surface-500 dark:text-surface-400">
                  Notify if you haven&apos;t logged study by evening
                </p>
              </div>
              <input
                type="checkbox"
                checked={studyReminder}
                onChange={(e) => setStudyReminder(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-surface-900 dark:text-white">
                  Habit Streaks &amp; Deadline Alerts
                </p>
                <p className="text-[11px] text-surface-500 dark:text-surface-400">
                  Alert when goals are nearing deadlines or streaks are at risk
                </p>
              </div>
              <input
                type="checkbox"
                checked={habitReminder}
                onChange={(e) => setHabitReminder(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isSavingProfile}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Password Change Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-800">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-surface-900 dark:text-white">
              Change Password
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Ensure your account stays protected
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <Button type="submit" isLoading={isChangingPassword}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};
