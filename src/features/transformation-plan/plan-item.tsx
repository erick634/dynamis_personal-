import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DynamisGoal } from '@/types/energeia';

type PlanItemProps = {
  goal: DynamisGoal;
  onToggleRealized: (goalId: string, realized: boolean) => void;
};

export function PlanItem({ goal, onToggleRealized }: PlanItemProps) {
  const { t } = useTranslation();
  const titleKey = `transformationPlan.items.${goal.id}.title`;
  const isDone = goal.realized;

  const dueLabel = goal.dueLabelKey ? t(`transformationPlan.schedule.${goal.dueLabelKey}`) : null;

  const priorityLabel = goal.priority === 'high' ? t('transformationPlan.tags.high') : null;
  const tagLabel = t(`transformationPlan.tags.${goal.tag}`);

  return (
    <article className="flex items-start gap-4 rounded-[16px] border border-line-soft bg-white px-4 py-4 shadow-soft">
      <button
        type="button"
        onClick={() => {
          onToggleRealized(goal.id, !isDone);
        }}
        aria-label={
          isDone
            ? t('transformationPlan.item.markNotDone', { title: t(titleKey) })
            : t('transformationPlan.item.markDone', { title: t(titleKey) })
        }
        className={[
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isDone
            ? 'border-success bg-success text-white'
            : 'border-line bg-white hover:border-blue-accent',
        ].join(' ')}
      >
        {isDone ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={[
            'font-body text-sm leading-relaxed',
            isDone ? 'text-ink-3 line-through' : 'text-ink',
          ].join(' ')}
        >
          {t(titleKey)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {dueLabel ? (
            <span className="font-body text-xs font-medium text-ink-2">{dueLabel}</span>
          ) : null}
          {priorityLabel ? (
            <span className="rounded-full bg-red/15 px-2.5 py-0.5 font-body text-xs font-semibold text-red-deep">
              {priorityLabel}
            </span>
          ) : (
            <span className="rounded-full bg-blue-soft px-2.5 py-0.5 font-body text-xs font-semibold text-blue">
              {tagLabel}
            </span>
          )}
          {priorityLabel ? (
            <span className="rounded-full bg-blue-soft px-2.5 py-0.5 font-body text-xs font-semibold text-blue">
              {tagLabel}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
