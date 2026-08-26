import { Sprout } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { deriveProfileSignalsFromIntentProfile } from '@/features/discovery/derive-profile-signals';
import { LIFE_AREA_DETAILS } from '@/features/intent-profile/life-area-detail-content';
import { LifeAreaGoalInsightDialog } from '@/features/intent-profile/life-area-goal-insight-dialog';
import { assetsForGoal } from '@/features/intent-profile/goal-related-assets';
import {
  GROWING_GOAL_STATUS_CLASS,
  resolveGrowingGoalStatus,
} from '@/features/intent-profile/life-area-growing-status';
import {
  buildGoalProgressByArea,
  buildLifeAreaScores,
  type LifeAreaId,
} from '@/features/intent-profile/life-area-scores';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { resolveLifeAreaMotto } from '@/features/intent-profile/resolve-life-area-motto';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { buildLifeAreaShareSnapshot } from '@/features/share/build-life-area-share-snapshot';
import { buildLifeAreaShareUrl, createLifeAreaShare } from '@/features/share/life-area-share-api';
import { useDemoUserId } from '@/hooks/use-demo-user-id';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

const EMPTY_GOALS: LifeAreaUserGoal[] = [];

type LifeAreaGrowingPanelProps = {
  areaId: LifeAreaId;
  accentColor: string;
};

export function LifeAreaGrowingPanel({ areaId, accentColor }: LifeAreaGrowingPanelProps) {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const userId = useDemoUserId();
  const displayName = useCurrentUser((state) => state.user?.displayName ?? null);
  const goals = useLifeAreaGoals((state) => state.goalsByArea[areaId] ?? EMPTY_GOALS);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const content = useLifeAreas((state) => state.getContent(areaId));
  const { profile } = useIntentProfile();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'idle' | 'copied' | 'error'>('idle');
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) ?? null;
  const relatedAssets = selectedGoal
    ? assetsForGoal(content, selectedGoal.id)
    : { links: [], documents: [], images: [] };

  const signals = deriveProfileSignalsFromIntentProfile(profile);
  const professionalScore = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );
  const goalProgressByArea = buildGoalProgressByArea(goalsByArea);
  const score = buildLifeAreaScores(professionalScore, [areaId], goalProgressByArea)[0]?.score ?? 0;
  const detail = LIFE_AREA_DETAILS[areaId];
  const summary = content.summary.trim() || t(detail.summaryKey);
  const motto = resolveLifeAreaMotto(areaId, content.motivationalPhrase, t);

  async function handleShareProfile() {
    if (isSharing) return;
    setIsSharing(true);
    setShareFeedback('idle');
    try {
      const payload = buildLifeAreaShareSnapshot({
        areaId,
        areaLabel: t(`you.balanceRadar.areas.${areaId}`),
        summary,
        motto,
        score,
        displayName,
        content,
        goals,
      });
      const result = await createLifeAreaShare({ userId, areaId, payload });
      const url = buildLifeAreaShareUrl(result.share_token);
      await navigator.clipboard.writeText(url);
      setShareFeedback('copied');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setShareFeedback('error');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <section className="flex flex-col rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
      <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
        <Sprout className="size-4 text-success-deep" aria-hidden />
        {t('you.lifeArea.growingTitle')}
      </h2>

      {goals.length === 0 ? (
        <p className="mt-4 font-body text-sm text-ink-3">{t('you.lifeArea.growing.empty')}</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {goals.map((goal) => {
            const status = resolveGrowingGoalStatus(goal);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setSelectedGoalId(goal.id);
                }}
                title={t(`you.lifeArea.growing.status.${status}`)}
                aria-label={`${goal.title} — ${t(`you.lifeArea.growing.status.${status}`)}`}
                className={[
                  'rounded-full px-3 py-1 font-body text-xs font-semibold transition-colors',
                  GROWING_GOAL_STATUS_CLASS[status],
                ].join(' ')}
              >
                {goal.title}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void handleShareProfile();
            }}
            disabled={isSharing}
            className="rounded-full bg-blue px-4 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSharing ? t('you.lifeArea.shareProfilePending') : t('you.lifeArea.shareProfile')}
          </button>
          <button
            type="button"
            onClick={() => {
              hyperspaceNavigate('/guide');
            }}
            className="rounded-full border border-blue bg-white px-4 py-2.5 font-body text-sm font-semibold text-blue transition-colors hover:bg-blue-soft/50"
          >
            {t('you.lifeArea.talkToGuide')}
          </button>
        </div>
        {shareFeedback === 'copied' ? (
          <p className="font-body text-xs text-success-deep" role="status">
            {t('you.lifeArea.shareProfileCopied')}
          </p>
        ) : null}
        {shareFeedback === 'error' ? (
          <p className="font-body text-xs text-red" role="alert">
            {t('you.lifeArea.shareProfileError')}
          </p>
        ) : null}
      </div>

      <LifeAreaGoalInsightDialog
        open={selectedGoal !== null}
        goal={selectedGoal}
        relatedAssets={relatedAssets}
        accentColor={accentColor}
        onClose={() => {
          setSelectedGoalId(null);
        }}
      />
    </section>
  );
}
