import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditTaskDialog } from '@/features/intent-profile/edit-task-dialog';
import { formatTaskSchedule } from '@/features/intent-profile/format-task-schedule';
import { GoalPriorityBadge } from '@/features/intent-profile/goal-priority-control';
import type { GoalTaskInput } from '@/features/intent-profile/life-area-goals-types';
import type { PlanLifeAreaTaskRow } from '@/features/transformation-plan/plan-life-area-tasks';

type PlanLifeAreaTaskItemProps = {
  row: PlanLifeAreaTaskRow;
  onToggleDone: (row: PlanLifeAreaTaskRow) => void;
  onSaveTask: (row: PlanLifeAreaTaskRow, payload: GoalTaskInput) => void;
};

export function PlanLifeAreaTaskItem({ row, onToggleDone, onSaveTask }: PlanLifeAreaTaskItemProps) {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${row.focusDateKey}T12:00:00`));

  return (
    <li className="rounded-2xl border border-line-soft/80 bg-white px-4 py-3 shadow-soft">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={row.skipped}
          onClick={() => {
            onToggleDone(row);
          }}
          aria-pressed={row.completed}
          aria-label={
            row.completed
              ? t('transformationPlan.lifeAreaTasks.markNotDone', { title: row.taskTitle })
              : t('transformationPlan.lifeAreaTasks.markDone', { title: row.taskTitle })
          }
          className={[
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            row.completed
              ? 'border-success bg-success text-white'
              : 'border-line bg-white hover:border-blue',
            row.skipped ? 'opacity-40' : '',
          ].join(' ')}
        >
          {row.completed ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={[
                  'font-body text-sm font-semibold leading-snug',
                  row.completed || row.skipped ? 'text-ink-2 line-through' : 'text-ink',
                ].join(' ')}
              >
                {row.taskTitle}
              </p>
              <p className="mt-1 font-body text-[11px] text-ink-3">
                {t('transformationPlan.lifeAreaTasks.goalMeta', {
                  goal: row.goalTitle,
                  area: t(`you.balanceRadar.areas.${row.areaId}`),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
              }}
              className="shrink-0 text-ink-3 hover:text-ink"
              aria-label={t('transformationPlan.lifeAreaTasks.edit')}
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <GoalPriorityBadge priority={row.priority} compact />
            <span className="font-body text-[11px] text-ink-3">
              {formatTaskSchedule(row.schedule, t)}
            </span>
            <span className="rounded-full bg-bg-deep-cream px-2 py-0.5 font-body text-[10px] font-semibold text-ink-3">
              {dateLabel}
            </span>
            {row.periodTotal > 1 ? (
              <span className="rounded-full bg-blue-soft/70 px-2 py-0.5 font-body text-[10px] font-semibold text-blue">
                {t('transformationPlan.lifeAreaTasks.periodProgress', {
                  done: row.periodDone,
                  total: row.periodTotal,
                })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <EditTaskDialog
        key={isEditing ? row.taskId : 'closed'}
        open={isEditing}
        mode="edit"
        task={row.task}
        onClose={() => {
          setIsEditing(false);
        }}
        onSave={(payload) => {
          onSaveTask(row, payload);
          setIsEditing(false);
        }}
      />
    </li>
  );
}
