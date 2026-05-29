import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import type { TodayNudge } from '@/features/today/today-dashboard';

type ProactiveNudgeCardProps = {
  nudge: TodayNudge;
  canMarkEnergeia?: boolean;
  onMarkEnergeia?: () => void;
};

export function ProactiveNudgeCard({
  nudge,
  canMarkEnergeia = false,
  onMarkEnergeia,
}: ProactiveNudgeCardProps) {
  const { t } = useTranslation();

  return (
    <article className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-bg-deep via-blue to-[#3d4f8c] p-8 text-white shadow-elevated">
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-red-warm/40 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-4 right-4 h-2 w-2 rounded-full bg-red-warm shadow-[0_0_16px_var(--red-warm)]"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-center gap-2">
        <p className="font-body text-xs font-semibold tracking-wide text-red-warm">
          {t('today.nudge.eyebrow')}
        </p>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[10px] font-semibold tracking-wide text-white/80 uppercase">
          {t(nudge.sourceLabelKey)}
        </span>
      </div>

      <h2 className="relative mt-3 max-w-xl font-display text-[clamp(1.5rem,2.5vw,2rem)] font-semibold leading-snug">
        {nudge.title}
      </h2>
      <p className="relative mt-3 max-w-lg font-body text-sm leading-relaxed text-white/80">
        {nudge.subtitle}
      </p>

      <div className="relative mt-6 flex flex-wrap gap-3">
        {canMarkEnergeia && onMarkEnergeia ? (
          <button
            type="button"
            onClick={onMarkEnergeia}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-success px-5 py-2.5 font-body text-sm font-semibold text-white shadow-soft transition-transform hover:scale-[1.02]"
          >
            <Check className="h-4 w-4" aria-hidden />
            {t('today.nudge.markEnergeia')}
          </button>
        ) : null}

        <Link
          to={nudge.primaryTo}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 font-body text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02]"
        >
          {t(nudge.primaryLabelKey)}
        </Link>
        <Link
          to={nudge.secondaryTo}
          className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-body text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          {t(nudge.secondaryLabelKey)}
        </Link>
      </div>
    </article>
  );
}
