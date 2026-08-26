import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditTaskDialog } from '@/features/intent-profile/edit-task-dialog';
import { formatGoalHorizon, toDateKey } from '@/features/intent-profile/format-task-schedule';
import { LifeAreaGoalCalendarDialog } from '@/features/intent-profile/life-area-goal-calendar-dialog';
import {
  countCompletedOccurrences,
  countRequiredOccurrences,
  goalProgressPercent,
  isGoalComplete,
} from '@/features/intent-profile/life-area-goal-progress';
import { LifeAreaGoalTaskRow } from '@/features/intent-profile/life-area-goal-task-row';
import { nextGoalPriority } from '@/features/intent-profile/goal-priority';
import { GoalPriorityBadge } from '@/features/intent-profile/goal-priority-control';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type {
  GoalTaskInput,
  LifeAreaGoalTask,
  LifeAreaUserGoal,
} from '@/features/intent-profile/life-area-goals-types';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';

type LifeAreaGoalItemProps = {
  areaId: LifeAreaId;
  goal: LifeAreaUserGoal;
  forceOpen: boolean;
  onRequestDeleteGoal: (goalId: string) => void;
};

export function LifeAreaGoalItem({
  areaId,
  goal,
  forceOpen,
  onRequestDeleteGoal,
}: LifeAreaGoalItemProps) {
  const { t } = useTranslation();
  const updateGoalTitle = useLifeAreaGoals((state) => state.updateGoalTitle);
  const setGoalCompleted = useLifeAreaGoals((state) => state.setGoalCompleted);
  const setGoalPriority = useLifeAreaGoals((state) => state.setGoalPriority);
  const addTask = useLifeAreaGoals((state) => state.addTask);
  const updateTask = useLifeAreaGoals((state) => state.updateTask);
  const removeTask = useLifeAreaGoals((state) => state.removeTask);
  const toggleTaskDate = useLifeAreaGoals((state) => state.toggleTaskDate);
  const skipTaskDate = useLifeAreaGoals((state) => state.skipTaskDate);
  const unskipTaskDate = useLifeAreaGoals((state) => state.unskipTaskDate);

  const [isOpen, setIsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(goal.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [taskDialog, setTaskDialog] = useState<
    { mode: 'add' } | { mode: 'edit'; task: LifeAreaGoalTask } | null
  >(null);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const todayKey = toDateKey();

  useEffect(() => {
    setTitleDraft(goal.title);
  }, [goal.title]);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  const open = isOpen || forceOpen;
  const percent = goalProgressPercent(goal);
  const complete = isGoalComplete(goal);
  const manuallyComplete = Boolean(goal.completedAt);
  const doneCount = countCompletedOccurrences(goal);
  const totalCount = countRequiredOccurrences(goal);

  const commitTitle = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && titleDraft.trim() !== goal.title) {
      updateGoalTitle(areaId, goal.id, titleDraft);
    } else {
      setTitleDraft(goal.title);
    }
  };

  return (
    <li className="rounded-2xl border border-line-soft bg-white px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
          }}
          className="mt-0.5 shrink-0 text-ink-3 hover:text-ink"
          aria-expanded={open}
          aria-label={t('you.lifeArea.goals.toggleTasks')}
        >
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(event) => {
                  setTitleDraft(event.target.value);
                }}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitTitle();
                  if (event.key === 'Escape') {
                    setTitleDraft(goal.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="w-full rounded-lg border border-line px-2 py-1 font-body text-sm font-semibold outline-none focus:border-blue/50"
              />
            ) : (
              <div className="min-w-0">
                <p
                  className={[
                    'font-body text-sm font-semibold leading-snug',
                    complete ? 'text-ink-2 line-through' : 'text-ink',
                  ].join(' ')}
                >
                  {goal.title}
                </p>
                <p className="mt-0.5 font-body text-[11px] text-ink-3">
                  {t('you.lifeArea.goals.horizonLabel', {
                    horizon: formatGoalHorizon(goal.horizonMonths, t),
                  })}
                </p>
                <div className="mt-1.5">
                  <GoalPriorityBadge
                    priority={goal.priority}
                    compact
                    onCycle={() => {
                      setGoalPriority(areaId, goal.id, nextGoalPriority(goal.priority));
                    }}
                  />
                </div>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setGoalCompleted(areaId, goal.id, !manuallyComplete);
                }}
                className={
                  manuallyComplete
                    ? 'text-success-deep hover:text-success'
                    : 'text-ink-3 hover:text-success-deep'
                }
                aria-label={
                  manuallyComplete
                    ? t('you.lifeArea.goals.markIncomplete')
                    : t('you.lifeArea.goals.markComplete')
                }
                title={
                  manuallyComplete
                    ? t('you.lifeArea.goals.markIncomplete')
                    : t('you.lifeArea.goals.markComplete')
                }
              >
                {manuallyComplete ? (
                  <CheckCircle2 className="size-3.5" aria-hidden />
                ) : (
                  <Circle className="size-3.5" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCalendarOpen(true);
                }}
                className="text-ink-3 hover:text-ink"
                aria-label={t('you.lifeArea.goals.calendar.open')}
                title={t('you.lifeArea.goals.calendar.open')}
              >
                <CalendarDays className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(true);
                }}
                className="text-ink-3 hover:text-ink"
                aria-label={t('you.lifeArea.goals.edit.editGoal')}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestDeleteGoal(goal.id);
                }}
                className="text-ink-3 hover:text-ink"
                aria-label={t('you.lifeArea.assets.remove')}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-[11px] font-semibold tabular-nums text-ink-3">
                {t('you.lifeArea.goals.progressLabel', {
                  percent,
                  done: doneCount,
                  total: totalCount,
                })}
              </span>
              {complete ? (
                <span className="font-body text-[11px] font-semibold text-success-deep">
                  {t('you.lifeArea.goals.completeBadge')}
                </span>
              ) : null}
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-deep-cream"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className={[
                  'block h-full rounded-full transition-[width] duration-300',
                  complete ? 'bg-success' : 'bg-blue',
                ].join(' ')}
                style={{ width: `${String(percent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="mt-3 border-t border-line-soft pt-3">
          <button
            type="button"
            onClick={() => {
              setIsCalendarOpen(true);
            }}
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-2 hover:text-ink"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {t('you.lifeArea.goals.calendar.open')}
          </button>
          <ul className="list-none space-y-0 divide-y divide-line-soft p-0">
            {goal.tasks.map((task) => (
              <LifeAreaGoalTaskRow
                key={task.id}
                task={task}
                canDelete={goal.tasks.length > 1}
                todayKey={todayKey}
                isExpanded={expandedTaskIds.has(task.id)}
                onToggleExpand={() => {
                  setExpandedTaskIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(task.id)) next.delete(task.id);
                    else next.add(task.id);
                    return next;
                  });
                }}
                onToggleDoneToday={() => {
                  toggleTaskDate(areaId, goal.id, task.id, todayKey);
                }}
                onEdit={() => {
                  setTaskDialog({ mode: 'edit', task });
                }}
                onRequestDelete={() => {
                  setPendingDeleteTaskId(task.id);
                }}
                onSkipToday={() => {
                  skipTaskDate(areaId, goal.id, task.id, todayKey);
                }}
                onRestoreToday={() => {
                  unskipTaskDate(areaId, goal.id, task.id, todayKey);
                }}
              />
            ))}
            <li className="pt-3">
              <button
                type="button"
                onClick={() => {
                  setTaskDialog({ mode: 'add' });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-blue"
              >
                <Plus className="size-3.5" />
                {t('you.lifeArea.goals.edit.addTask')}
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      <LifeAreaGoalCalendarDialog
        open={isCalendarOpen}
        goal={goal}
        onClose={() => {
          setIsCalendarOpen(false);
        }}
        onSkipDate={(taskId, dateKey) => {
          skipTaskDate(areaId, goal.id, taskId, dateKey);
        }}
        onRestoreDate={(taskId, dateKey) => {
          unskipTaskDate(areaId, goal.id, taskId, dateKey);
        }}
        onToggleComplete={(taskId, dateKey) => {
          toggleTaskDate(areaId, goal.id, taskId, dateKey);
        }}
        onEditTask={(taskId) => {
          const task = goal.tasks.find((item) => item.id === taskId);
          if (!task) return;
          setTaskDialog({ mode: 'edit', task });
        }}
      />

      <EditTaskDialog
        key={
          taskDialog
            ? taskDialog.mode === 'edit'
              ? taskDialog.task.id
              : `add-${goal.id}`
            : 'closed'
        }
        open={taskDialog !== null}
        mode={taskDialog?.mode === 'edit' ? 'edit' : 'add'}
        task={taskDialog?.mode === 'edit' ? taskDialog.task : null}
        onClose={() => {
          setTaskDialog(null);
        }}
        onSave={(payload: GoalTaskInput) => {
          if (taskDialog?.mode === 'edit') {
            updateTask(areaId, goal.id, taskDialog.task.id, payload);
          } else {
            addTask(areaId, goal.id, payload);
          }
        }}
      />

      {pendingDeleteTaskId ? (
        <div className="mt-3 rounded-xl border border-line-soft bg-bg/60 px-3 py-2">
          <p className="font-body text-xs text-ink-2">
            {t('you.lifeArea.goals.edit.deleteTaskConfirm')}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingDeleteTaskId(null);
              }}
              className="rounded-full border border-line px-3 py-1 font-body text-xs font-medium text-ink"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                removeTask(areaId, goal.id, pendingDeleteTaskId);
                setPendingDeleteTaskId(null);
              }}
              className="rounded-full bg-red px-3 py-1 font-body text-xs font-semibold text-white"
            >
              {t('you.lifeArea.goals.deleteConfirmAction')}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
