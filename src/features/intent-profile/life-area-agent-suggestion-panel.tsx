import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { applyLifeAreaAgentSuggestion } from '@/features/intent-profile/apply-life-area-agent-suggestion';
import { fetchLifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-api';
import { LifeAreaAgentSuggestionPreview } from '@/features/intent-profile/life-area-agent-suggestion-preview';
import type { LifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-types';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

const EMPTY_GOALS: LifeAreaUserGoal[] = [];

type LifeAreaAgentSuggestionPanelProps = {
  areaId: LifeAreaId;
  summary: string;
  motto: string;
};

export function LifeAreaAgentSuggestionPanel({
  areaId,
  summary,
  motto,
}: LifeAreaAgentSuggestionPanelProps) {
  const { t, i18n } = useTranslation();
  const userId = useDemoUserId();
  const { profile } = useIntentProfile();
  const goals = useLifeAreaGoals((state) => state.goalsByArea[areaId] ?? EMPTY_GOALS);
  const content = useLifeAreas((state) => state.getContent(areaId));

  const [suggestion, setSuggestion] = useState<LifeAreaAgentSuggestion | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');

  async function handleAsk() {
    if (status === 'loading') return;
    setStatus('loading');
    setSuggestion(null);
    try {
      const next = await fetchLifeAreaAgentSuggestion({
        userId,
        areaId,
        areaLabel: t(`you.balanceRadar.areas.${areaId}`),
        locale: i18n.language || 'en-US',
        summary,
        motto,
        profileFocus: profile?.activeFocus ?? '',
        existingGoals: goals.map((goal) => ({
          title: goal.title,
          tasks: goal.tasks.map((task) => task.title),
        })),
        existingLinks: content.links.map((link) => ({
          label: link.label,
          url: link.url,
        })),
      });
      if (!next) {
        setStatus('empty');
        return;
      }
      setSuggestion(next);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  function handleDismiss() {
    setSuggestion(null);
    setStatus('idle');
  }

  function handleAccept() {
    if (!suggestion) return;
    applyLifeAreaAgentSuggestion(areaId, suggestion, t);
    handleDismiss();
  }

  return (
    <section className="mt-6 rounded-2xl border border-blue/20 bg-blue-soft/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-blue" aria-hidden />
            {t('you.lifeArea.agentSuggestion.title')}
          </h2>
          <p className="mt-1 font-body text-xs text-ink-3">
            {t('you.lifeArea.agentSuggestion.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleAsk();
          }}
          disabled={status === 'loading'}
          className="rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white disabled:opacity-60"
        >
          {status === 'loading'
            ? t('you.lifeArea.agentSuggestion.loading')
            : t('you.lifeArea.agentSuggestion.ask')}
        </button>
      </div>

      {status === 'error' ? (
        <p className="mt-3 font-body text-sm text-ember">
          {t('you.lifeArea.agentSuggestion.error')}
        </p>
      ) : null}
      {status === 'empty' ? (
        <p className="mt-3 font-body text-sm text-ink-2">
          {t('you.lifeArea.agentSuggestion.empty')}
        </p>
      ) : null}

      {suggestion ? (
        <div className="mt-4">
          <LifeAreaAgentSuggestionPreview
            suggestion={suggestion}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        </div>
      ) : null}
    </section>
  );
}
