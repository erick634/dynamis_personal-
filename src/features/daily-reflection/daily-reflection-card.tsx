import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function DailyReflectionCard() {
  const { t } = useTranslation();

  return (
    <Link
      to="/guide?mode=reflection"
      className="group flex items-start gap-4 rounded-[20px] border border-success/25 bg-gradient-to-r from-success/15 via-success/10 to-bg p-5 shadow-soft transition-shadow hover:shadow-card"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/20 text-success-deep">
        <FileText className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs font-semibold tracking-wide text-success-deep uppercase">
          {t('dailyReflection.card.eyebrow')}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ink group-hover:text-blue">
          {t('dailyReflection.card.title')}
        </p>
        <p className="mt-1 font-body text-sm text-ink-2">{t('dailyReflection.card.description')}</p>
      </div>
    </Link>
  );
}
