import { Check, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type DailyReflectionCardProps = {
  completedToday?: boolean;
  itemCount?: number;
};

export function DailyReflectionCard({
  completedToday = false,
  itemCount = 0,
}: DailyReflectionCardProps) {
  const { t } = useTranslation();

  return (
    <Link
      to="/guide?mode=reflection"
      className={[
        'group flex items-start gap-4 rounded-[20px] border p-5 shadow-soft transition-shadow hover:shadow-card',
        completedToday
          ? 'border-success/40 bg-gradient-to-r from-success/20 via-success/10 to-bg'
          : 'border-success/25 bg-gradient-to-r from-success/15 via-success/10 to-bg',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
          completedToday ? 'bg-success text-white' : 'bg-success/20 text-success-deep',
        ].join(' ')}
      >
        {completedToday ? (
          <Check className="h-6 w-6" aria-hidden />
        ) : (
          <FileText className="h-6 w-6" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs font-semibold tracking-wide text-success-deep uppercase">
          {t('dailyReflection.card.eyebrow')}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ink group-hover:text-blue">
          {completedToday
            ? t('dailyReflection.card.completedTitle')
            : t('dailyReflection.card.title')}
        </p>
        <p className="mt-1 font-body text-sm text-ink-2">
          {completedToday
            ? t('dailyReflection.card.completedDescription', { count: itemCount })
            : t('dailyReflection.card.description')}
        </p>
      </div>
    </Link>
  );
}
