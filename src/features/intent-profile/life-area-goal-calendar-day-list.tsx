import { Check, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { GoalCalendarOccurrence } from '@/features/intent-profile/life-area-goal-calendar';
import { formatDurationMinutes } from '@/features/intent-profile/format-task-schedule';

type LifeAreaGoalCalendarDayListProps = {
  dateKey: string;
  items: GoalCalendarOccurrence[];
  locale: string;
  onSkipDate: (taskId: string, dateKey: string) => void;
  onRestoreDate: (taskId: string, dateKey: string) => void;
  onToggleComplete: (taskId: string, dateKey: string) => void;
  onEditTask: (taskId: string) => void;
};

export function LifeAreaGoalCalendarDayList({
  dateKey,
  items,
  locale,
  onSkipDate,
  onRestoreDate,
  onToggleComplete,
  onEditTask,
}: LifeAreaGoalCalendarDayListProps) {
  const { t } = useTranslation();
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`));

  return (
    <div className="mt-4 rounded-2xl border border-line-soft bg-bg/40 p-4">
      <p className="font-body text-xs font-semibold text-ink">{dateLabel}</p>
      {items.length === 0 ? (
        <p className="mt-2 font-body text-sm text-ink-3">
          {t('you.lifeArea.goals.calendar.emptyDay')}
        </p>
      ) : (
        <ul className="mt-2 list-none space-y-2 p-0">
          {items.map((item) => {
            const durationLabel = formatDurationMinutes(item.durationMinutes, t);
            return (
              <li
                key={`${item.taskId}-${item.dateKey}`}
                className="flex items-start gap-3 rounded-xl border border-line-soft bg-white px-3 py-2"
              >
                <button
                  type="button"
                  disabled={item.skipped}
                  onClick={() => {
                    onToggleComplete(item.taskId, item.dateKey);
                  }}
                  className={[
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                    item.completed
                      ? 'border-blue bg-blue text-white'
                      : 'border-line bg-white text-transparent',
                    item.skipped ? 'opacity-40' : '',
                  ].join(' ')}
                  aria-pressed={item.completed}
                  aria-label={t('you.lifeArea.goals.calendar.toggleComplete')}
                >
                  <Check className="size-3" strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'font-body text-sm font-medium',
                      item.skipped || item.completed ? 'text-ink-2 line-through' : 'text-ink',
                    ].join(' ')}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 font-body text-[11px] text-ink-3">
                    {item.time
                      ? t('you.lifeArea.goals.schedule.atTime', { time: item.time })
                      : t('you.lifeArea.goals.schedule.noTime')}
                    {durationLabel ? ` · ${durationLabel}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.skipped) onRestoreDate(item.taskId, item.dateKey);
                      else onSkipDate(item.taskId, item.dateKey);
                    }}
                    className="mt-1 font-body text-[11px] font-semibold text-blue hover:underline"
                  >
                    {item.skipped
                      ? t('you.lifeArea.goals.calendar.restoreDay')
                      : t('you.lifeArea.goals.calendar.skipDay')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onEditTask(item.taskId);
                  }}
                  className="shrink-0 text-ink-3 hover:text-ink"
                  aria-label={t('you.lifeArea.goals.edit.editTask')}
                >
                  <Pencil className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
