import { useTranslation } from 'react-i18next';

import type { ProfileSignals } from '@/features/discovery/discovery-types';
import type { ProfileDimension } from '@/types/intent-profile';

const DIMENSIONS: ProfileDimension[] = ['values', 'mission', 'strengths', 'constraints'];

type ProfileSignalRingProps = {
  percent: number;
  label: string;
};

function ProfileSignalRing({ percent, label }: ProfileSignalRingProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const percentLabel = new Intl.NumberFormat(undefined, { style: 'percent' }).format(percent / 100);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="relative h-[88px] w-[88px]" aria-label={`${label}: ${percentLabel}`}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88" aria-hidden>
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="var(--line-soft)"
            strokeWidth="7"
          />
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-body text-sm font-semibold tabular-nums text-ink">
          {percent}%
        </span>
      </div>
      <span className="font-body text-xs font-medium break-words text-ink-2">{label}</span>
    </div>
  );
}

type ProfileCompletenessCardProps = {
  signals: ProfileSignals;
};

export function ProfileCompletenessCard({ signals }: ProfileCompletenessCardProps) {
  const { t } = useTranslation();
  const overall = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );
  const overallLabel = new Intl.NumberFormat(undefined, { style: 'percent' }).format(overall / 100);

  return (
    <section className="w-full min-w-0 rounded-2xl border border-line-soft bg-white p-4 shadow-card sm:p-6 md:p-8">
      <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
        {t('you.completeness.title')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{t('you.completeness.subtitle')}</p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-body text-sm font-medium text-ink">{t('you.completeness.overall')}</p>
          <p className="font-body text-sm font-semibold tabular-nums text-blue">{overallLabel}</p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-bg-deep-cream"
          role="progressbar"
          aria-valuenow={overall}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('you.completeness.overall')}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue to-blue-accent transition-[width] duration-500"
            style={{ width: `${String(overall)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
        {DIMENSIONS.map((dimension) => (
          <ProfileSignalRing
            key={dimension}
            percent={signals[dimension]}
            label={t(`you.completeness.dimensions.${dimension}`)}
          />
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {DIMENSIONS.map((dimension) => {
          const percent = signals[dimension];
          return (
            <li key={`bar-${dimension}`} className="min-w-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="font-body text-xs font-medium text-ink-2">
                  {t(`you.completeness.dimensions.${dimension}`)}
                </span>
                <span className="font-body text-xs font-semibold tabular-nums text-ink">
                  {percent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-deep-cream">
                <div
                  className="h-full rounded-full bg-blue transition-[width] duration-500"
                  style={{ width: `${String(percent)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
