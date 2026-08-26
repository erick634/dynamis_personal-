import { useTranslation } from 'react-i18next';

import type { ConstellationDensity } from '@/features/possibility-map/constellation-density';
import { DynamisConstellation } from '@/features/possibility-map/dynamis-constellation';
import { EnergeiaConstellation } from '@/features/possibility-map/energeia-constellation';

type ComparisonStageProps = {
  density: ConstellationDensity;
};

export function ComparisonStage({ density }: ComparisonStageProps) {
  const { t } = useTranslation();

  return (
    <div className="possibility-map__comparison relative">
      <div className="possibility-map__comparison-grid">
        <article className="possibility-map__pole-card possibility-map__pole-card--dynamis possibility-map__reveal-dynamis">
          <p className="possibility-map__pole-prelude font-display italic">
            {t('possibilityMap.dynamis.prelude')}
          </p>
          <h2 className="possibility-map__pole-title font-display">
            {t('possibilityMap.dynamis.name')}
          </h2>
          <div className="possibility-map__pole-visual">
            <DynamisConstellation visibleNodeCount={density.dynamisVisibleNodes} />
          </div>
          <p className="possibility-map__pole-tagline font-body italic">
            {t('possibilityMap.dynamis.tagline')}
          </p>
        </article>

        <div className="possibility-map__expansion-arrow possibility-map__reveal-arrow" aria-hidden>
          <span className="possibility-map__expansion-arrow-glyph">→</span>
        </div>

        <article className="possibility-map__pole-card possibility-map__pole-card--energeia possibility-map__reveal-energeia">
          <p className="possibility-map__pole-prelude font-display italic">
            {t('possibilityMap.energeia.prelude')}
          </p>
          <h2 className="possibility-map__pole-title possibility-map__pole-title--energeia font-display">
            {t('possibilityMap.energeia.name')}
          </h2>
          <div className="possibility-map__pole-visual possibility-map__pole-visual--energeia">
            <div className="possibility-map__energeia-column-glow" aria-hidden />
            <EnergeiaConstellation
              visibleNodeCount={density.energeiaVisibleNodes}
              accentNodeCount={density.energeiaAccentNodes}
            />
          </div>
          <p className="possibility-map__pole-tagline font-body italic">
            {t('possibilityMap.energeia.tagline')}
          </p>
        </article>
      </div>
    </div>
  );
}
