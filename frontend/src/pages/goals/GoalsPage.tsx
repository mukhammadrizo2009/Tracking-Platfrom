import React, { useState, useEffect } from 'react';
import { goalsApi } from '../../api/endpoints';
import type { Goal } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);

  // New Goal Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<'learning' | 'career' | 'health' | 'finance' | 'personal' | 'other'>('learning');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalDesiredOutcome, setGoalDesiredOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<number | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Inline Task Add
  const [newTaskTitle, setNewTaskTitle] = useState<{ [goalId: number]: string }>({});

  const fetchGoals = async () => {
    try {
      const data = await goalsApi.list(filterStatus ? { status: filterStatus } : undefined);
      setGoals(data);
      if (data.length > 0 && expandedGoalId === null) {
        setExpandedGoalId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [filterStatus]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await goalsApi.create({
        title: goalTitle.trim(),
        category: goalCategory,
        target_date: goalTargetDate || null,
        description: goalDescription.trim(),
        desired_outcome: goalDesiredOutcome.trim(),
        status: 'active',
      });
      setIsModalOpen(false);
      setGoalTitle('');
      setGoalDescription('');
      setGoalDesiredOutcome('');
      setGoalTargetDate('');
      fetchGoals();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (taskId: number, currentCompleted: boolean) => {
    try {
      await goalsApi.updateTask(taskId, { is_completed: !currentCompleted });
      fetchGoals();
    } catch {
      fetchGoals();
    }
  };

  const handleAddTask = async (goalId: number) => {
    const title = newTaskTitle[goalId]?.trim();
    if (!title) return;

    try {
      await goalsApi.addTask({
        goal: goalId,
        title,
        is_completed: false,
      });
      setNewTaskTitle((prev) => ({ ...prev, [goalId]: '' }));
      fetchGoals();
    } catch {
      fetchGoals();
    }
  };

  const handleDeleteTask = (task: { id: number; title: string }) => {
    setTaskToDelete(task);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    try {
      await goalsApi.deleteTask(taskToDelete.id);
      fetchGoals();
      setTaskToDelete(null);
    } catch {
      fetchGoals();
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleDeleteGoal = (id: number) => {
    setGoalToDelete(id);
  };

  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeletingGoal(true);
    try {
      await goalsApi.delete(goalToDelete);
      setGoals((prev) => prev.filter((g) => g.id !== goalToDelete));
      setGoalToDelete(null);
    } catch {
      fetchGoals();
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const handleToggleGoalStatus = async (goal: Goal) => {
    const nextStatus = goal.status === 'completed' ? 'in_progress' : 'completed';
    try {
      await goalsApi.update(goal.id, { status: nextStatus });
      fetchGoals();
    } catch {
      fetchGoals();
    }
  };

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
            Goals &amp; Subtasks
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1">
            Break ambitious long-term objectives into actionable milestones
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-surface-200 dark:bg-surface-800 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'active'
                  ? 'bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'completed'
                  ? 'bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === ''
                  ? 'bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Goal
          </Button>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
          <Target className="w-12 h-12 text-surface-400 mx-auto mb-3" />
          <h3 className="font-bold text-base text-surface-900 dark:text-white">
            No goals found
          </h3>
          <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto">
            Set ambitious targets and break them down into concrete subtasks.
          </p>
          <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
            + Create First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const isExpanded = expandedGoalId === goal.id;
            const progress = goal.progress_percentage || 0;
            const completedCount = goal.tasks?.filter((t) => t.is_completed).length || 0;
            const totalTasks = goal.tasks?.length || 0;

            return (
              <div
                key={goal.id}
                className="rounded-3xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Main Card Header */}
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {goal.category && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                            {goal.category}
                          </span>
                        )}
                        {goal.deadline && (
                          <span className="text-[11px] font-semibold text-surface-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Target: {goal.deadline}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-surface-900 dark:text-white">
                        {goal.title}
                      </h3>

                      {goal.description && (
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleGoalStatus(goal)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          goal.status === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-300'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{goal.status === 'completed' ? 'Completed' : 'Mark Complete'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 rounded-xl text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
                        className="p-1.5 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-800/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-surface-500">
                        {completedCount} of {totalTasks} tasks completed
                      </span>
                      <span className="font-extrabold text-primary-600 dark:text-primary-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-200 dark:bg-surface-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subtasks Accordion Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 bg-surface-100/50 dark:bg-surface-950/40 border-t border-surface-200 dark:border-surface-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">
                      Subtasks &amp; Action Items
                    </h4>

                    {/* Task items list */}
                    <div className="space-y-2 mb-4">
                      {goal.tasks && goal.tasks.length > 0 ? (
                        goal.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-primary-400 transition-all group"
                          >
                            <div
                              onClick={() => handleToggleTask(task.id, task.is_completed)}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <div
                                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                                  task.is_completed
                                    ? 'bg-primary-500 text-white'
                                    : 'text-surface-400'
                                }`}
                              >
                                {task.is_completed ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </div>
                              <span
                                className={`text-xs sm:text-sm font-medium truncate ${
                                  task.is_completed
                                    ? 'line-through text-surface-400'
                                    : 'text-surface-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-rose-500 transition-opacity"
                              title="Delete subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-surface-400 py-2">
                          No subtasks added yet. Add tasks below to start tracking progress.
                        </p>
                      )}
                    </div>

                    {/* Add Subtask Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add a new subtask..."
                        value={newTaskTitle[goal.id] || ''}
                        onChange={(e) =>
                          setNewTaskTitle((prev) => ({ ...prev, [goal.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTask(goal.id);
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddTask(goal.id)}
                        disabled={!newTaskTitle[goal.id]?.trim()}
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Goal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Goal"
        description="Define an ambitious, measurable goal for your personal growth."
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Goal Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master System Design &amp; Distributed Systems"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Category
              </label>
              <Select<string>
                value={goalCategory}
                onChange={(val) => setGoalCategory(val as any)}
                options={[
                  { value: 'learning', label: 'Learning' },
                  { value: 'career', label: 'Career' },
                  { value: 'health', label: 'Health & Fitness' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'personal', label: 'Personal' },
                  { value: 'other', label: 'Other' },
                ]}
                size="md"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Target Deadline
              </label>
              <DatePicker
                value={goalTargetDate}
                onChange={(date) => setGoalTargetDate(date)}
                placeholder="Pick deadline..."
                size="md"
                align="right"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Description &amp; Strategy
            </label>
            <textarea
              rows={3}
              placeholder="How will you achieve this? What resources will you use?"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Desired Outcome (Definition of Done)
            </label>
            <input
              type="text"
              placeholder="e.g. Able to architect distributed caches and pass interviews"
              value={goalDesiredOutcome}
              onChange={(e) => setGoalDesiredOutcome(e.target.value)}
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
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Goal Modal */}
      <ConfirmModal
        isOpen={goalToDelete !== null}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleConfirmDeleteGoal}
        title="Delete Goal"
        description="Are you sure you want to delete this goal and all its milestones? This action cannot be undone."
        confirmText="Delete Goal"
        isLoading={isDeletingGoal}
      />

      {/* Delete Subtask Modal */}
      <ConfirmModal
        isOpen={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title="Delete Milestone Task"
        description={`Are you sure you want to delete "${taskToDelete?.title || 'this task'}"?`}
        confirmText="Delete Task"
        isLoading={isDeletingTask}
      />
    </div>
  );
};
