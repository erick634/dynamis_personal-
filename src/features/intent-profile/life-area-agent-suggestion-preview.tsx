import { BookOpen, Link2, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { LifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-types';
import { formatTaskSchedule } from '@/features/intent-profile/format-task-schedule';

type LifeAreaAgentSuggestionPreviewProps = {
  suggestion: LifeAreaAgentSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
};

function resourceIcon(kind: 'book' | 'site' | 'youtube') {
  if (kind === 'book') return BookOpen;
  if (kind === 'youtube') return Play;
  return Link2;
}

export function LifeAreaAgentSuggestionPreview({
  suggestion,
  onAccept,
  onDismiss,
}: LifeAreaAgentSuggestionPreviewProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-line-soft/80 bg-white p-4">
      {suggestion.rationale ? (
        <p className="font-display text-sm text-ink-2 italic">{suggestion.rationale}</p>
      ) : null}

      {suggestion.goal ? (
        <div className="mt-3">
          <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {suggestion.goal.mode === 'existing'
              ? t('you.lifeArea.agentSuggestion.existingGoal')
              : t('you.lifeArea.agentSuggestion.newGoal')}
          </p>
          <p className="mt-1 font-body text-sm font-semibold text-ink">
            {suggestion.goal.mode === 'existing'
              ? (suggestion.goal.existingGoalTitle ?? suggestion.goal.title)
              : suggestion.goal.title}
          </p>
          {suggestion.goal.mode === 'new' ? (
            <p className="mt-0.5 font-body text-xs text-ink-3">
              {t('you.lifeArea.goals.horizonLabel', {
                horizon: t(`you.lifeArea.goals.horizon.${String(suggestion.goal.horizonMonths)}`),
              })}
            </p>
          ) : null}
          <ul className="mt-2 list-none space-y-1 p-0">
            {suggestion.goal.tasks.map((task) => (
              <li
                key={`${task.title}-${task.schedule.cadence}`}
                className="font-body text-xs text-ink-2"
              >
                · {task.title}{' '}
                <span className="text-ink-3">({formatTaskSchedule(task.schedule, t)})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggestion.resources.length > 0 ? (
        <div className="mt-3">
          <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {t('you.lifeArea.agentSuggestion.resources')}
          </p>
          <ul className="mt-2 list-none space-y-2 p-0">
            {suggestion.resources.map((resource) => {
              const Icon = resourceIcon(resource.kind);
              return (
                <li key={`${resource.kind}-${resource.url}`} className="flex items-start gap-2">
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-blue" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-body text-xs font-semibold text-ink">
                      {t(`you.lifeArea.agentSuggestion.resourceKind.${resource.kind}`)}:{' '}
                      {resource.title}
                    </p>
                    {resource.why ? (
                      <p className="font-body text-[11px] text-ink-3">{resource.why}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white"
        >
          {t('you.lifeArea.agentSuggestion.accept')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-2"
        >
          {t('you.lifeArea.agentSuggestion.dismiss')}
        </button>
      </div>
    </div>
  );
}
