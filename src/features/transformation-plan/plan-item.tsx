import { Check, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isReflectionTodayGoalId } from '@/features/transformation-plan/reflection-today-storage';
import type { DynamisGoal } from '@/types/energeia';

type PlanItemProps = {
  goal: DynamisGoal;
  onToggleRealized: (goalId: string, realized: boolean) => void;
  onTitleChange: (goalId: string, newTitle: string) => void;
};

export function PlanItem({ goal, onToggleRealized, onTitleChange }: PlanItemProps) {
  const { t } = useTranslation();
  const titleKey = `transformationPlan.items.${goal.id}.title`;
  const displayTitle = goal.title ?? t(titleKey);
  const isDone = goal.realized;
  const fromReflectionToday = isReflectionTodayGoalId(goal.id);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(displayTitle);
    }
  }, [displayTitle, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const dueLabel = goal.dueLabelKey ? t(`transformationPlan.schedule.${goal.dueLabelKey}`) : null;

  const priorityLabel = goal.priority === 'high' ? t('transformationPlan.tags.high') : null;
  const tagLabel = t(`transformationPlan.tags.${goal.tag}`);

  const startEditing = () => {
    setDraftTitle(displayTitle);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftTitle(displayTitle);
    setIsEditing(false);
  };

  const saveEditing = () => {
    const trimmed = draftTitle.trim();
    if (trimmed.length > 0 && trimmed !== displayTitle) {
      onTitleChange(goal.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <article className="flex items-start gap-4 rounded-[16px] border border-line-soft bg-white px-4 py-4 shadow-soft">
      <button
        type="button"
        onClick={() => {
          onToggleRealized(goal.id, !isDone);
        }}
        aria-label={
          isDone
            ? t('transformationPlan.item.markNotDone', { title: displayTitle })
            : t('transformationPlan.item.markDone', { title: displayTitle })
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
        <div className="flex items-start gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftTitle}
              onChange={(event) => {
                setDraftTitle(event.target.value);
              }}
              onBlur={saveEditing}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  saveEditing();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelEditing();
                }
              }}
              aria-label={t('transformationPlan.saveEdit')}
              className="min-w-0 flex-1 bg-transparent font-body text-sm leading-relaxed text-ink outline-none ring-0 focus:ring-1 focus:ring-blue-accent/40 rounded px-0.5 -mx-0.5"
            />
          ) : (
            <p
              className={[
                'min-w-0 flex-1 font-body text-sm leading-relaxed',
                isDone ? 'text-ink-3 line-through' : 'text-ink',
              ].join(' ')}
            >
              {displayTitle}
            </p>
          )}
          {!isEditing && !fromReflectionToday ? (
            <button
              type="button"
              onClick={startEditing}
              aria-label={t('transformationPlan.editTitle')}
              className="mt-0.5 shrink-0 rounded p-1 text-ink-3 transition-colors hover:bg-blue-soft hover:text-blue"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {fromReflectionToday ? (
            <span className="rounded-full bg-success/15 px-2.5 py-0.5 font-body text-xs font-semibold text-success-deep">
              {t('transformationPlan.tags.doneToday')}
            </span>
          ) : null}
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
