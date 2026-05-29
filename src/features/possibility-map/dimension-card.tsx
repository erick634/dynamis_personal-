import { Briefcase, Compass, Heart, Zap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Dimension, DimensionIcon } from '@/types/possibility-map';

const ICON_MAP: Record<DimensionIcon, LucideIcon> = {
  brain: Zap,
  briefcase: Briefcase,
  heart: Heart,
  compass: Compass,
};

const ICON_GRADIENT: Record<DimensionIcon, string> = {
  brain: 'from-blue/40 to-blue-accent/30',
  briefcase: 'from-blue-accent/35 to-blue/25',
  heart: 'from-success/35 to-success-deep/25',
  compass: 'from-red-warm/35 to-red/25',
};

type DimensionCardProps = {
  dimension: Dimension;
  animationDelayMs?: number;
};

export function DimensionCard({ dimension, animationDelayMs = 0 }: DimensionCardProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[dimension.icon];
  const leverageValue = t('possibilityMap.leveragePercent', {
    percent: dimension.leveragePercent,
  });
  const leverageLabel = t('possibilityMap.leverageSuffix', { value: leverageValue });

  return (
    <article
      tabIndex={0}
      className="possibility-map__dimension-card possibility-map__reveal-card outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-blue-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
      style={{ animationDelay: `${String(animationDelayMs)}ms` }}
    >
      <span
        className={[
          'possibility-map__dimension-icon flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br',
          ICON_GRADIENT[dimension.icon],
        ].join(' ')}
        aria-hidden
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={2} />
      </span>

      <h3 className="possibility-map__dimension-title font-body font-semibold text-white">
        {dimension.name}
      </h3>

      <p
        className="possibility-map__dimension-leverage font-display font-semibold tabular-nums"
        aria-label={leverageLabel}
      >
        {leverageLabel}
      </p>

      <p className="possibility-map__dimension-description font-body leading-relaxed text-white/60">
        {dimension.description}
      </p>
    </article>
  );
}
