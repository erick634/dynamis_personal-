import { useTranslation } from 'react-i18next';

import type { ProfileSignals } from '@/features/discovery/discovery-types';
import type { ProfileDimension } from '@/types/intent-profile';

const DIMENSIONS: ProfileDimension[] = ['values', 'mission', 'strengths', 'constraints'];

type ProgressRingProps = {
  percent: number;
  label: string;
};

function ProgressRing({ percent, label }: ProgressRingProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative h-[88px] w-[88px]">
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
      <span className="font-body text-xs font-medium text-ink-2">{label}</span>
    </div>
  );
}

type DiscoverySidePanelProps = {
  profileSignals: ProfileSignals;
  insightQuote: string;
  isUpdating?: boolean;
};

export function DiscoverySidePanel({
  profileSignals,
  insightQuote,
  isUpdating = false,
}: DiscoverySidePanelProps) {
  const { t } = useTranslation();

  return (
    <aside className="flex h-full min-w-0 flex-col gap-6 overflow-y-auto rounded-[20px] border border-white/20 bg-white/95 p-4 shadow-soft backdrop-blur-sm sm:p-6">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold break-words text-ink">
          {t('discovery.sidePanel.profileTitle')}
        </h2>
        <p className="mt-1 font-body text-sm break-words text-ink-2">
          {t('discovery.sidePanel.profileHint')}
        </p>
      </div>

      <div
        className={[
          'grid grid-cols-2 gap-6 transition-opacity',
          isUpdating ? 'opacity-70' : '',
        ].join(' ')}
        aria-busy={isUpdating}
      >
        {DIMENSIONS.map((dimension) => (
          <ProgressRing
            key={dimension}
            percent={profileSignals[dimension]}
            label={t(`discovery.sidePanel.dimensions.${dimension}`)}
          />
        ))}
      </div>

      {isUpdating ? (
        <p className="font-body text-xs text-ink-3" role="status">
          {t('discovery.sidePanel.updating')}
        </p>
      ) : null}

      <div className="rounded-[16px] bg-bg-deep px-5 py-5 text-white">
        <p className="font-body text-xs font-semibold tracking-wide text-red-warm uppercase">
          {t('discovery.insight.title')}
        </p>
        <blockquote className="mt-3 font-display text-base leading-relaxed text-white/90 italic">
          {insightQuote}
        </blockquote>
      </div>
    </aside>
  );
}
