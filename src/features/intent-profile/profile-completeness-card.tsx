import { useTranslation } from 'react-i18next';

import type { ProfileSignals } from '@/features/discovery/discovery-types';
import type { ProfileDimension } from '@/types/intent-profile';

const DIMENSIONS: ProfileDimension[] = ['values', 'mission', 'strengths', 'constraints'];

type ProfileCompletenessCardProps = {
  signals: ProfileSignals;
};

function OverallClarityRing({ percent, label }: { percent: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const percentLabel = `${String(percent)}%`;

  return (
    <div
      className="relative mx-auto h-[10.5rem] w-[10.5rem] shrink-0 sm:mx-0 sm:h-44 sm:w-44"
      role="img"
      aria-label={`${label}: ${percentLabel}`}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 132 132" aria-hidden>
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="var(--bg-deep-cream)"
          strokeWidth="12"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-body text-3xl font-bold tabular-nums tracking-tight text-ink sm:text-4xl">
          {percentLabel}
        </span>
        <span className="mt-1 max-w-[7rem] font-body text-xs leading-snug text-ink-3">{label}</span>
      </div>
    </div>
  );
}

export function ProfileCompletenessCard({ signals }: ProfileCompletenessCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en-US';
  const overall = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );

  return (
    <section className="flex h-full w-full min-w-0 flex-col rounded-3xl border border-line-soft/80 bg-paper p-5 shadow-soft sm:p-7 md:p-8">
      <header>
        <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink sm:text-2xl">
          {t('you.completeness.title')}
        </h2>
        <p className="mt-1.5 font-body text-sm text-ink-3">{t('you.completeness.subtitle')}</p>
      </header>

      <div className="mt-8 flex flex-col items-stretch gap-8 md:flex-row md:items-center md:gap-10 lg:gap-14">
        <OverallClarityRing percent={overall} label={t('you.completeness.overall')} />

        <ul className="min-w-0 flex-1 space-y-5">
          {DIMENSIONS.map((dimension) => {
            const percent = signals[dimension];
            const percentLabel = new Intl.NumberFormat(locale, {
              style: 'percent',
              maximumFractionDigits: 0,
            }).format(percent / 100);

            return (
              <li key={dimension} className="min-w-0">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-body text-sm font-semibold text-ink">
                    {t(`you.completeness.dimensions.${dimension}.label`)}
                  </span>
                  <span className="font-body text-xs text-ink-3 sm:text-sm">
                    {t(`you.completeness.dimensions.${dimension}.description`)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-deep-cream"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t(`you.completeness.dimensions.${dimension}.label`)}
                  >
                    <div
                      className="h-full rounded-full bg-ink transition-[width] duration-500"
                      style={{ width: `${String(percent)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-body text-sm font-semibold tabular-nums text-ink">
                    {percentLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
