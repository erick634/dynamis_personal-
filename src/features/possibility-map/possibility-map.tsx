import { useTranslation } from 'react-i18next';

import { DimensionCard } from '@/features/possibility-map/dimension-card';
import { DynamisConstellation } from '@/features/possibility-map/dynamis-constellation';
import { EnergeiaConstellation } from '@/features/possibility-map/energeia-constellation';
import { climateAdaptationMockMap } from '@/features/possibility-map/possibility-map-mock';
import { useDemoUserId } from '@/hooks/use-demo-user-id';
import { usePossibilityMap } from '@/hooks/use-possibility-map';

import '@/features/possibility-map/possibility-map.css';

const DIMENSION_CARD_BASE_DELAY_MS = 1600;
const DIMENSION_CARD_STAGGER_MS = 100;

function ExpansionArrow() {
  const { t } = useTranslation();

  return (
    <div className="possibility-map__arrow-column flex shrink-0 flex-col items-center justify-center">
      <svg
        className="possibility-map__arrow-svg h-20 w-20 md:h-[120px] md:w-20"
        aria-hidden
        viewBox="0 0 80 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="expansion-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="var(--blue-2)" />
            <stop offset="100%" stopColor="var(--red)" />
          </linearGradient>
          <marker
            id="expansion-arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="var(--red)" />
          </marker>
        </defs>
        <path
          className="possibility-map__reveal-arrow-draw"
          d="M 8 60 Q 40 18, 72 60"
          stroke="url(#expansion-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          pathLength="100"
        />
        <path
          className="possibility-map__reveal-arrow-flow"
          d="M 8 60 Q 40 18, 72 60"
          stroke="url(#expansion-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          markerEnd="url(#expansion-arrowhead)"
          pathLength="100"
          strokeDasharray="6 6"
        />
      </svg>
      <p className="mt-2 font-body text-[10px] font-semibold tracking-[0.2em] text-red uppercase md:mt-3">
        {t('possibilityMap.arrow.label')}
      </p>
    </div>
  );
}

export function PossibilityMap() {
  const { t } = useTranslation();
  const userId = useDemoUserId();
  const { data: map = climateAdaptationMockMap } = usePossibilityMap(userId);

  return (
    <div className="possibility-map relative min-h-dvh overflow-hidden text-white">
      <div className="relative z-10 mx-auto max-w-[1100px] px-6 pt-20 pb-12 md:px-10 md:pb-16">
        <header className="possibility-map__reveal-header max-w-[720px]">
          <p className="font-body text-[11px] font-semibold tracking-[0.2em] text-red uppercase">
            {t('possibilityMap.eyebrow')}
          </p>
          <h1 className="mt-4 max-w-[720px] font-display text-4xl leading-tight font-semibold text-white md:text-[56px]">
            {t('possibilityMap.title')}
          </h1>
          <p className="mt-4 max-w-[560px] font-body text-lg text-white/70">
            {t('possibilityMap.subtitle')}
          </p>
        </header>

        <div className="relative mt-12 md:mt-16">
          <div className="possibility-map__stage-glow" aria-hidden />

          <div className="relative flex min-h-[480px] flex-col items-center gap-8 md:grid md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-6">
            <section className="possibility-map__reveal-dynamis flex w-full flex-col items-center text-center md:items-start md:text-left">
              <h2 className="font-display text-sm italic tracking-[0.14em] text-blue-accent uppercase">
                {t('possibilityMap.dynamis.label')}
              </h2>
              <p className="mt-1 font-body text-[13px] text-white/60">
                {t('possibilityMap.dynamis.subLabel')}
              </p>
              <p className="mt-3 font-display text-[36px] leading-tight font-semibold text-white italic md:text-[48px]">
                {t('possibilityMap.dynamis.name')}
              </p>
              <div className="mt-4 flex items-center justify-center md:mt-6">
                <DynamisConstellation />
              </div>
              <p className="mt-4 max-w-xs font-body text-sm text-white/50 italic">
                {t('possibilityMap.dynamis.tagline')}
              </p>
            </section>

            <ExpansionArrow />

            <section className="possibility-map__reveal-energeia relative flex w-full flex-col items-center text-center md:items-start md:text-left">
              <div className="possibility-map__energeia-column-glow" aria-hidden />
              <h2 className="relative font-display text-sm italic tracking-[0.14em] text-red uppercase">
                {t('possibilityMap.energeia.label')}
              </h2>
              <p className="relative mt-1 font-body text-[13px] text-white/60">
                {t('possibilityMap.energeia.subLabel')}
              </p>
              <p className="relative mt-3 font-display text-[36px] leading-tight font-semibold text-white italic md:text-[48px]">
                {t('possibilityMap.energeia.name')}
              </p>
              <div className="relative mt-4 flex items-center justify-center md:mt-6">
                <EnergeiaConstellation />
              </div>
              <p className="relative mt-4 max-w-xs font-body text-sm text-white/50 italic">
                {t('possibilityMap.energeia.tagline')}
              </p>
            </section>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-4">
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
