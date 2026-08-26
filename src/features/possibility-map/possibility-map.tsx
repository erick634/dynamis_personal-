import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { deriveProfileSignalsFromIntentProfile } from '@/features/discovery/derive-profile-signals';
import {
  buildGoalProgressByArea,
  buildLifeAreaScores,
} from '@/features/intent-profile/life-area-scores';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { ComparisonStage } from '@/features/possibility-map/comparison-stage';
import { densityFromDimensions } from '@/features/possibility-map/constellation-density';
import { DimensionCard } from '@/features/possibility-map/dimension-card';
import { MapLifeAreaStrip } from '@/features/possibility-map/map-life-area-strip';
import { usePossibilityMap } from '@/features/possibility-map/use-possibility-map';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/possibility-map/possibility-map.css';

const DIMENSION_CARD_BASE_DELAY_MS = 900;
const DIMENSION_CARD_STAGGER_MS = 80;

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function PossibilityMap() {
  const { t } = useTranslation();
  const user = useCurrentUser((state) => state.user);
  const { profile } = useIntentProfile();
  const { map, isLoading, isGenerating, hasRealProfile, profileLoading, regenerate } =
    usePossibilityMap(user?.userId);

  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);

  const signals = deriveProfileSignalsFromIntentProfile(profile);
  const completenessPercent = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );

  const lifeAreaScores = useMemo(
    () =>
      buildLifeAreaScores(completenessPercent, activeAreaIds, buildGoalProgressByArea(goalsByArea)),
    [activeAreaIds, completenessPercent, goalsByArea],
  );

  const density = useMemo(() => densityFromDimensions(map.dimensions), [map.dimensions]);

  const profileLabel =
    firstNonEmpty(profile?.roleContext, profile?.displayName, user?.displayName) ??
    t('possibilityMap.profile.fallback');

  const motivation =
    firstNonEmpty(profile?.activeFocus, profile?.aspirations, profile?.longTermSummary) ??
    t('possibilityMap.motivation.fallback');

  const showProfileCta = !profileLoading && !hasRealProfile;
  const showGeneratingBanner = isGenerating;

  return (
    <div className="w-full min-w-0 bg-bg font-body text-ink">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 md:px-8 md:py-10">
        <header className="possibility-map__reveal-header w-full min-w-0 max-w-3xl">
          <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
            {t('possibilityMap.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold break-words text-ink">
            {t('possibilityMap.title')}
          </h1>

          <p className="mt-3 inline-flex max-w-full items-center rounded-full bg-blue-soft/70 px-3 py-1 font-body text-xs font-semibold text-blue">
            {t('possibilityMap.profile.belongsTo', { profile: profileLabel })}
          </p>

          <blockquote className="mt-4 border-l-2 border-blue/40 pl-4 font-display text-base text-ink-2 italic sm:text-lg">
            {motivation}
          </blockquote>

          <p className="mt-3 max-w-2xl font-body text-sm text-ink-2">
            {t('possibilityMap.subtitle')}
          </p>

          {showProfileCta ? (
            <div className="mt-6 rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft">
              <p className="font-body text-sm leading-relaxed text-ink-2">
                {t('possibilityMap.noProfile.body')}
              </p>
              <Link
                to="/guide"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue px-5 py-2.5 font-body text-sm font-semibold text-white shadow-soft transition-colors hover:bg-blue-accent"
              >
                {t('possibilityMap.noProfile.cta')}
              </Link>
            </div>
          ) : null}

          {hasRealProfile ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {showGeneratingBanner ? (
                <UnlockLoadingIndicator label={t('possibilityMap.generating')} />
              ) : null}
              <button
                type="button"
                onClick={regenerate}
                disabled={isLoading}
                className="rounded-xl border border-line bg-white px-4 py-2 font-body text-xs font-semibold text-blue transition-colors hover:bg-blue-soft/60 disabled:opacity-50"
              >
                {t('possibilityMap.regenerate')}
              </button>
            </div>
          ) : null}
        </header>

        <ComparisonStage density={density} />

        <MapLifeAreaStrip scores={lifeAreaScores} />

        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {t('possibilityMap.dimensionsTitle')}
          </h2>
          <p className="mt-1 font-body text-sm text-ink-3">
            {t('possibilityMap.dimensionsSubtitle')}
          </p>
        </div>

        <div
          className={[
            'mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
            isLoading ? 'opacity-60' : '',
          ].join(' ')}
          aria-busy={isLoading}
        >
          {map.dimensions.map((dimension, index) => (
            <DimensionCard
              key={dimension.id}
              dimension={dimension}
              animationDelayMs={DIMENSION_CARD_BASE_DELAY_MS + index * DIMENSION_CARD_STAGGER_MS}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
