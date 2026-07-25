import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { ComparisonStage } from '@/features/possibility-map/comparison-stage';
import { DimensionCard } from '@/features/possibility-map/dimension-card';
import { densityFromDimensions } from '@/features/possibility-map/constellation-density';
import { usePossibilityMap } from '@/features/possibility-map/use-possibility-map';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/possibility-map/possibility-map.css';

const DIMENSION_CARD_BASE_DELAY_MS = 1600;
const DIMENSION_CARD_STAGGER_MS = 100;

export function PossibilityMap() {
  const { t } = useTranslation();
  const userId = useCurrentUser((state) => state.user?.userId);
  const { map, isLoading, isGenerating, hasRealProfile, profileLoading, regenerate } =
    usePossibilityMap(userId);

  const density = useMemo(() => densityFromDimensions(map.dimensions), [map.dimensions]);

  const showProfileCta = !profileLoading && !hasRealProfile;
  const showGeneratingBanner = isGenerating;

  return (
    <div className="possibility-map relative min-h-dvh w-full min-w-0 overflow-x-hidden text-white">
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[1100px] px-4 pt-16 pb-24 sm:px-6 md:px-10 md:pt-20 md:pb-16">
        <header className="possibility-map__reveal-header w-full min-w-0 max-w-[720px]">
          <p className="font-body text-[11px] font-semibold tracking-[0.2em] text-red uppercase">
            {t('possibilityMap.eyebrow')}
          </p>
          <h1 className="mt-4 max-w-[720px] font-display text-[clamp(1.75rem,6vw,3.5rem)] leading-tight font-semibold break-words text-white">
            {t('possibilityMap.title')}
          </h1>
          <p className="mt-4 max-w-[560px] font-body text-base text-white/70 sm:text-lg">
            {t('possibilityMap.subtitle')}
          </p>

          {showProfileCta ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="font-body text-sm leading-relaxed text-white/80">
                {t('possibilityMap.noProfile.body')}
              </p>
              <Link
                to="/guide"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 font-body text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02]"
              >
                {t('possibilityMap.noProfile.cta')}
              </Link>
            </div>
          ) : null}

          {hasRealProfile ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {showGeneratingBanner ? (
                <UnlockLoadingIndicator variant="on-dark" label={t('possibilityMap.generating')} />
              ) : null}
              <button
                type="button"
                onClick={regenerate}
                disabled={isLoading}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 font-body text-xs font-semibold text-white/90 transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                {t('possibilityMap.regenerate')}
              </button>
            </div>
          ) : null}
        </header>

        <ComparisonStage density={density} />

        <div
          className={['possibility-map__dimension-grid', isLoading ? 'opacity-60' : ''].join(' ')}
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
