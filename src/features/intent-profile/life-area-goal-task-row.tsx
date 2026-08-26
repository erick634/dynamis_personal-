import { Check, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  formatDurationMinutes,
  formatTaskSchedule,
  isTaskActiveToday,
} from '@/features/intent-profile/format-task-schedule';
import { GoalPriorityBadge } from '@/features/intent-profile/goal-priority-control';
import type { LifeAreaGoalTask } from '@/features/intent-profile/life-area-goals-types';

type LifeAreaGoalTaskRowProps = {
  task: LifeAreaGoalTask;
  canDelete: boolean;
  todayKey: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleDoneToday: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onSkipToday: () => void;
  onRestoreToday: () => void;
};

export function LifeAreaGoalTaskRow({
  task,
  canDelete,
  todayKey,
  isExpanded,
  onToggleExpand,
  onToggleDoneToday,
  onEdit,
  onRequestDelete,
  onSkipToday,
  onRestoreToday,
}: LifeAreaGoalTaskRowProps) {
  const { t } = useTranslation();
  const durationLabel = formatDurationMinutes(task.durationMinutes, t);
  const skippedToday = task.skippedDates.includes(todayKey);
  const completedToday = task.completedDates.includes(todayKey);
  const dueToday = isTaskActiveToday(task.schedule);
  const compactSchedule = [
    t(`you.lifeArea.goals.cadence.${task.schedule.cadence}`),
    task.schedule.time
      ? t('you.lifeArea.goals.schedule.atTime', { time: task.schedule.time })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="py-2.5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-0.5 shrink-0 text-ink-3 hover:text-ink"
          aria-expanded={isExpanded}
          aria-label={t('you.lifeArea.goals.edit.toggleTaskDetails')}
        >
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <button
          type="button"
          disabled={!dueToday || skippedToday}
          onClick={onToggleDoneToday}
          className={[
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
            completedToday
              ? 'border-blue bg-blue text-white'
              : 'border-line bg-white text-transparent',
            !dueToday || skippedToday ? 'opacity-40' : '',
          ].join(' ')}
          aria-pressed={completedToday}
          aria-label={t('you.lifeArea.goals.toggleTaskDoneToday')}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
        <button type="button" onClick={onToggleExpand} className="min-w-0 flex-1 text-left">
          <p
            className={[
              'font-body text-sm leading-snug',
              completedToday || skippedToday ? 'text-ink-2 line-through' : 'text-ink',
            ].join(' ')}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <p className="font-body text-[11px] text-ink-3">{compactSchedule}</p>
            <GoalPriorityBadge priority={task.priority} compact />
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="text-ink-3 hover:text-ink"
            aria-label={t('you.lifeArea.goals.edit.editTask')}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={onRequestDelete}
            className="text-ink-3 hover:text-ink disabled:opacity-40"
            aria-label={t('you.lifeArea.goals.edit.deleteTask')}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-2 ml-11 space-y-1.5">
          <p className="font-body text-[11px] text-ink-3">
            {formatTaskSchedule(task.schedule, t)}
            {durationLabel ? ` · ${durationLabel}` : ''}
          </p>
          {completedToday ? (
            <p className="font-body text-[11px] font-semibold text-success-deep">
              {t('you.lifeArea.goals.edit.completedToday')}
            </p>
          ) : null}
          {skippedToday ? (
            <p className="font-body text-[11px] font-semibold text-ink-3">
              {t('you.lifeArea.goals.edit.skippedToday')}
            </p>
          ) : null}
          {dueToday ? (
            <button
              type="button"
              onClick={skippedToday ? onRestoreToday : onSkipToday}
              className="font-body text-[11px] font-semibold text-blue hover:underline"
            >
              {skippedToday
                ? t('you.lifeArea.goals.edit.restoreToday')
                : t('you.lifeArea.goals.edit.skipToday')}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
