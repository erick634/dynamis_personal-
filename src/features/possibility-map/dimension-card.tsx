import { Briefcase, Compass, Heart, Zap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Dimension, DimensionIcon } from '@/types/possibility-map';

const ICON_MAP: Record<DimensionIcon, LucideIcon> = {
  brain: Zap,
  briefcase: Briefcase,
  heart: Heart,
  compass: Compass,
};

const ICON_TONE: Record<DimensionIcon, string> = {
  brain: 'bg-blue-soft text-blue',
  briefcase: 'bg-blue-soft/70 text-blue',
  heart: 'bg-success/15 text-success',
  compass: 'bg-ember/15 text-ember',
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
      className="possibility-map__reveal-card flex min-h-full flex-col rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-blue-accent focus-visible:ring-offset-2"
      style={{ animationDelay: `${String(animationDelayMs)}ms` }}
    >
      <span
        className={[
          'flex size-10 items-center justify-center rounded-xl',
          ICON_TONE[dimension.icon],
        ].join(' ')}
        aria-hidden
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>

      <h3 className="mt-4 font-body text-sm font-semibold leading-snug text-ink sm:text-[0.9375rem]">
        {dimension.name}
      </h3>

      <p
        className="mt-2 font-display text-xl font-semibold tracking-tight text-ember tabular-nums sm:text-2xl"
        aria-label={leverageLabel}
      >
        {leverageLabel}
      </p>

      <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-ink-2">
        {dimension.description}
      </p>
    </article>
  );
}
