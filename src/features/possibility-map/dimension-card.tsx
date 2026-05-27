import { Brain, Briefcase, Compass, Heart, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Dimension, DimensionIcon } from '@/types/possibility-map';

const ICON_MAP: Record<DimensionIcon, LucideIcon> = {
  brain: Brain,
  briefcase: Briefcase,
  heart: Heart,
  compass: Compass,
};

type DimensionCardProps = {
  dimension: Dimension;
  animationDelayMs?: number;
};

export function DimensionCard({ dimension, animationDelayMs = 0 }: DimensionCardProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[dimension.icon];
  const nameKey = `possibilityMap.dimensions.${dimension.id}.name`;
  const descriptionKey = `possibilityMap.dimensions.${dimension.id}.description`;
  const leverageLabel = t('possibilityMap.leveragePercent', {
    percent: dimension.leveragePercent,
  });

  return (
    <article
      tabIndex={0}
      className="possibility-map__reveal-card rounded-2xl border border-white/10 bg-white/5 p-6 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-blue-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
      style={{ animationDelay: `${String(animationDelayMs)}ms` }}
    >
      <Icon className="h-6 w-6 text-blue-accent" aria-hidden />
      <p
        className="mt-4 font-display text-4xl font-semibold tabular-nums bg-gradient-to-r from-red to-red-warm bg-clip-text text-transparent"
        aria-label={leverageLabel}
      >
        {leverageLabel}
      </p>
      <h3 className="mt-3 font-body text-base font-semibold text-white">{t(nameKey)}</h3>
      <p className="mt-2 font-body text-[13px] leading-relaxed text-white/60">
        {t(descriptionKey)}
      </p>
    </article>
  );
}
