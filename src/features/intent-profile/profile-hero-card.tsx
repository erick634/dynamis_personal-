import { Clock3, MessageCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BrandIcon } from '@/components/ui/brand-icon';

import '@/features/intent-profile/profile-hero-card.css';

type ProfileHeroCardProps = {
  completenessPercent: number;
  updatedAtIso: string | null;
  messagesAnalyzed: number;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

function formatRelativeUpdatedAt(isoDate: string | null, locale: string): string | null {
  if (!isoDate) {
    return null;
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, 'second');
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute');
  }
  if (absSeconds < 86_400) {
    return formatter.format(Math.round(diffSeconds / 3600), 'hour');
  }
  return formatter.format(Math.round(diffSeconds / 86_400), 'day');
}

function CompletenessRing({ percent }: { percent: number }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="h-4 w-4 shrink-0 -rotate-90" viewBox="0 0 18 18" aria-hidden>
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <circle
        cx="9"
        cy="9"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function ProfileHeroCard({
  completenessPercent,
  updatedAtIso,
  messagesAnalyzed,
  onRefresh,
  isRefreshing = false,
}: ProfileHeroCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en-US';
  const relativeUpdated = formatRelativeUpdatedAt(updatedAtIso, locale);
  const percentLabel = new Intl.NumberFormat(locale, { style: 'percent' }).format(
    completenessPercent / 100,
  );
  const messagesLabel = new Intl.NumberFormat(locale).format(messagesAnalyzed);

  return (
    <header className="profile-hero">
      <div className="profile-hero__glow" aria-hidden />
      <div className="profile-hero__mark" aria-hidden>
        <BrandIcon className="h-14 w-14 text-ink sm:h-16 sm:w-16" />
      </div>

      <div className="profile-hero__body min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-xl">
            <h1 className="font-display text-[clamp(1.75rem,4vw,2.35rem)] font-semibold leading-tight tracking-tight text-ink">
              {t('you.hero.title')}
            </h1>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-2 sm:text-[15px]">
              {t('you.hero.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 font-body text-xs font-semibold text-ink transition-colors hover:bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={['h-3.5 w-3.5', isRefreshing ? 'animate-spin' : '']
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
            {t('you.hero.refreshAnalysis')}
          </button>
        </div>

        <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-xs font-semibold text-ink sm:text-sm">
          <li className="inline-flex items-center gap-1.5">
            <CompletenessRing percent={completenessPercent} />
            <span>{t('you.hero.completeness', { percent: percentLabel })}</span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {relativeUpdated
                ? t('you.hero.updatedRelative', { relative: relativeUpdated })
                : t('you.hero.updatedUnknown')}
            </span>
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{t('you.hero.messagesAnalyzed', { count: messagesLabel })}</span>
          </li>
        </ul>
      </div>
    </header>
  );
}
