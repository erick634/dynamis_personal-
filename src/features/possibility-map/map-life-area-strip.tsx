import { ChevronDown, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { applyLifeAreaAgentSuggestion } from '@/features/intent-profile/apply-life-area-agent-suggestion';
import { fetchLifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-api';
import { LifeAreaAgentSuggestionPreview } from '@/features/intent-profile/life-area-agent-suggestion-preview';
import type { LifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-types';
import { LIFE_AREA_DETAILS } from '@/features/intent-profile/life-area-detail-content';
import {
  LIFE_AREA_DOT_COLOR,
  type LifeAreaId,
  type LifeAreaScore,
} from '@/features/intent-profile/life-area-scores';
import { resolveLifeAreaMotto } from '@/features/intent-profile/resolve-life-area-motto';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

type MapLifeAreaStripProps = {
  scores: LifeAreaScore[];
};

type SuggestionStatus = 'idle' | 'loading' | 'error' | 'empty';

export function MapLifeAreaStrip({ scores }: MapLifeAreaStripProps) {
  const { t, i18n } = useTranslation();
  const userId = useDemoUserId();
  const { profile } = useIntentProfile();

  const [openAreaId, setOpenAreaId] = useState<LifeAreaId | null>(null);
  const [suggestion, setSuggestion] = useState<LifeAreaAgentSuggestion | null>(null);
  const [status, setStatus] = useState<SuggestionStatus>('idle');

  useEffect(() => {
    if (!openAreaId) return;

    let cancelled = false;
    setStatus('loading');
    setSuggestion(null);

    const content = useLifeAreas.getState().getContent(openAreaId);
    const detail = LIFE_AREA_DETAILS[openAreaId];
    const summary = content.summary.trim() || t(detail.summaryKey);
    const motto = resolveLifeAreaMotto(openAreaId, content.motivationalPhrase, t);
    const goals = useLifeAreaGoals.getState().goalsByArea[openAreaId] ?? [];

    void fetchLifeAreaAgentSuggestion({
      userId,
      areaId: openAreaId,
      areaLabel: t(`you.balanceRadar.areas.${openAreaId}`),
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
    })
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setStatus('empty');
          return;
        }
        setSuggestion(next);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [openAreaId, i18n.language, profile?.activeFocus, t, userId]);

  if (scores.length === 0) return null;

  function toggleArea(areaId: LifeAreaId) {
    setOpenAreaId((prev) => (prev === areaId ? null : areaId));
  }

  function handleAccept() {
    if (!openAreaId || !suggestion) return;
    applyLifeAreaAgentSuggestion(openAreaId, suggestion, t);
    setSuggestion(null);
    setStatus('idle');
    setOpenAreaId(null);
  }

  function handleDismiss() {
    setSuggestion(null);
    setStatus('idle');
    setOpenAreaId(null);
  }

  return (
    <section className="mt-8 rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
        {t('possibilityMap.lifeAreas.title')}
      </h2>
      <p className="mt-1 font-body text-sm text-ink-3">{t('possibilityMap.lifeAreas.subtitle')}</p>

      <ul className="mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {scores.map((area) => {
          const isOpen = openAreaId === area.id;
          return (
            <li key={area.id} className={isOpen ? 'sm:col-span-2 lg:col-span-3' : undefined}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  toggleArea(area.id);
                }}
                className={[
                  'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                  isOpen
                    ? 'border-blue/40 bg-blue-soft/50'
                    : 'border-line-soft/80 bg-bg-soft/40 hover:border-blue/40 hover:bg-blue-soft/40',
                ].join(' ')}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: LIFE_AREA_DOT_COLOR[area.id] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm font-semibold text-ink">
                    {t(`you.balanceRadar.areas.${area.id}`)}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-bg-deep-cream">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${String(area.score)}%`,
                        backgroundColor: LIFE_AREA_DOT_COLOR[area.id],
                      }}
                    />
                  </span>
                </span>
                <span className="shrink-0 font-body text-xs font-semibold text-ink-3 tabular-nums">
                  {area.score}%
                </span>
                <ChevronDown
                  className={[
                    'size-4 shrink-0 text-ink-3 transition-transform',
                    isOpen ? 'rotate-180' : '',
                  ].join(' ')}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <div className="mt-2 rounded-2xl border border-blue/20 bg-blue-soft/25 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-blue">
                      <Sparkles className="size-3.5" aria-hidden />
                      {t('possibilityMap.lifeAreas.suggestionEyebrow')}
                    </p>
                    <Link
                      to={`/you/areas/${area.id}`}
                      className="font-body text-xs font-semibold text-ink-3 hover:text-blue"
                    >
                      {t('possibilityMap.lifeAreas.openArea')}
                    </Link>
                  </div>

                  {status === 'loading' ? (
                    <p className="mt-3 font-body text-sm text-ink-2">
                      {t('you.lifeArea.agentSuggestion.loading')}
                    </p>
                  ) : null}
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
                    <div className="mt-3">
                      <LifeAreaAgentSuggestionPreview
                        suggestion={suggestion}
                        onAccept={handleAccept}
                        onDismiss={handleDismiss}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
