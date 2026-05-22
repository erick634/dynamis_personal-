import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ProactiveNudgeCard() {
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

      <p className="relative font-body text-xs font-semibold tracking-wide text-red-warm">
        {t('today.nudge.eyebrow')}
      </p>
      <h2 className="relative mt-3 max-w-xl font-display text-[clamp(1.5rem,2.5vw,2rem)] font-semibold leading-snug">
        {t('today.nudge.title')}
      </h2>
      <p className="relative mt-3 max-w-lg font-body text-sm leading-relaxed text-white/80">
        {t('today.nudge.subtitle')}
      </p>

      <div className="relative mt-6 flex flex-wrap gap-3">
        <Link
          to="/guide"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 font-body text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02]"
        >
          {t('today.nudge.primaryCta')}
        </Link>
        <Link
          to="/map"
          className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-body text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          {t('today.nudge.secondaryCta')}
        </Link>
      </div>
    </article>
  );
}
