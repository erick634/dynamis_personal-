import { Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { LifeAreaGoalSuggestion } from '@/features/intent-profile/use-life-area-goals';

type LifeAreaGoalSuggestionCardProps = {
  suggestion: LifeAreaGoalSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
};

export function LifeAreaGoalSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: LifeAreaGoalSuggestionCardProps) {
  const { t } = useTranslation();

  return (
    <aside className="mx-4 mb-3 rounded-2xl border border-blue/25 bg-blue-soft/40 p-4 sm:mx-0">
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {t('discovery.goalSuggestion.eyebrow')}
          </p>
          <p className="mt-1 font-body text-sm font-semibold text-ink">
            {t('discovery.goalSuggestion.title', {
              area: t(`you.balanceRadar.areas.${suggestion.areaId}`),
            })}
          </p>
          <p className="mt-1 font-display text-base text-ink italic">{suggestion.title}</p>
          <p className="mt-1 font-body text-xs text-ink-3">
            {t('you.lifeArea.goals.horizonLabel', {
              horizon: t(`you.lifeArea.goals.horizon.${String(suggestion.horizonMonths)}`),
            })}
          </p>
          <ul className="mt-2 list-none space-y-1 p-0">
            {suggestion.tasks.slice(0, 4).map((task) => (
              <li
                key={`${task.title}-${task.schedule.cadence}`}
                className="font-body text-xs text-ink-2"
              >
                · {task.title}{' '}
                <span className="text-ink-3">
                  ({t(`you.lifeArea.goals.cadence.${task.schedule.cadence}`)})
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white"
            >
              {t('discovery.goalSuggestion.accept')}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-2"
            >
              {t('discovery.goalSuggestion.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
