import { ArrowDown, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import { DimensionCard } from '@/features/possibility-map/dimension-card';
import { DynamisConstellation } from '@/features/possibility-map/dynamis-constellation';
import { EnergeiaConstellation } from '@/features/possibility-map/energeia-constellation';
import { MOCK_POSSIBILITY_MAP } from '@/features/possibility-map/possibility-map-mock';
import { usePossibilityMap } from '@/hooks/use-possibility-map';

import '@/features/awakening/awakening.css';
import '@/features/possibility-map/possibility-map.css';

export function PossibilityMap() {
  const { t } = useTranslation();
  const { data: map = MOCK_POSSIBILITY_MAP } = usePossibilityMap();

  return (
    <div className="possibility-map relative min-h-dvh overflow-hidden text-white">
      <div className="awakening__stars" aria-hidden>
        <div className="awakening__stars-layer awakening__stars-layer--far" />
        <div className="awakening__stars-layer awakening__stars-layer--near" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
        <BrandMark variant="on-dark" className="mb-10" />

        <header className="max-w-3xl">
          <p className="font-body text-xs font-semibold tracking-[0.2em] text-red-warm uppercase">
            {t('possibilityMap.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.25rem)] leading-tight font-medium text-white">
            {t('possibilityMap.title')}
          </h1>
        </header>

        <div className="relative mt-12">
          <div className="possibility-map__stage-glow" aria-hidden />

          <div className="relative flex min-h-[480px] flex-col gap-8 md:grid md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-6">
            <section className="flex flex-col">
              <p className="font-display text-sm italic text-blue-soft">
                {t('possibilityMap.dynamis.label')}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
                {t('possibilityMap.dynamis.name')}
              </h2>
              <p className="mt-2 max-w-sm font-body text-sm text-white/65">
                {t('possibilityMap.dynamis.tagline')}
              </p>
              <div className="mt-6 flex flex-1 items-center justify-center md:min-h-[280px]">
                <DynamisConstellation />
              </div>
            </section>

            <div
              className="flex shrink-0 items-center justify-center text-red-warm"
              aria-label={t('possibilityMap.arrow.label')}
            >
              <ArrowDown className="h-10 w-10 md:hidden" aria-hidden />
              <ArrowRight className="hidden h-12 w-12 md:block" aria-hidden />
            </div>

            <section className="relative flex flex-col">
              <div className="possibility-map__energeia-glow" aria-hidden />
              <p className="relative font-display text-sm italic text-red-warm">
                {t('possibilityMap.energeia.label')}
              </p>
              <h2 className="relative mt-2 font-display text-3xl font-semibold text-white md:text-4xl">
                {t('possibilityMap.energeia.name')}
              </h2>
              <p className="relative mt-2 max-w-sm font-body text-sm text-white/65">
                {t('possibilityMap.energeia.tagline')}
              </p>
              <div className="relative mt-6 flex flex-1 items-center justify-center md:min-h-[280px]">
                <EnergeiaConstellation />
              </div>
            </section>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {map.dimensions.map((dimension) => (
            <DimensionCard key={dimension.id} dimension={dimension} />
          ))}
        </div>
      </div>
    </div>
  );
}
