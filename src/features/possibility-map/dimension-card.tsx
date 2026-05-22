import { Briefcase, Compass, Cpu, Heart, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Dimension, DimensionIcon } from '@/types/possibility-map';

const ICON_MAP: Record<DimensionIcon, LucideIcon> = {
  cpu: Cpu,
  briefcase: Briefcase,
  heart: Heart,
  compass: Compass,
};

type DimensionCardProps = {
  dimension: Dimension;
};

export function DimensionCard({ dimension }: DimensionCardProps) {
  const { t, i18n } = useTranslation();
  const Icon = ICON_MAP[dimension.icon];
  const nameKey = `possibilityMap.dimensions.${dimension.id}.name`;
  const descriptionKey = `possibilityMap.dimensions.${dimension.id}.description`;
  const leverageLabel = t('possibilityMap.leverage', {
    percent: dimension.leveragePercent,
  });

  return (
    <article className="rounded-[20px] border border-line/20 bg-white/5 p-5 shadow-card backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue/20 text-blue-soft">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span
          className="font-body text-lg font-bold tabular-nums text-red-warm"
          aria-label={leverageLabel}
        >
          {leverageLabel}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-white">{t(nameKey)}</h3>
      <p className="mt-2 font-body text-sm leading-relaxed text-white/70">{t(descriptionKey)}</p>
      <span className="sr-only" lang={i18n.language}>
        {dimension.leveragePercent}%
      </span>
    </article>
  );
}
