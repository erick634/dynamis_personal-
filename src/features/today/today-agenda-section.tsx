import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import type { TodayAgendaItem } from '@/features/today/today-dashboard';

type TodayAgendaSectionProps = {
  items: TodayAgendaItem[];
};

export function TodayAgendaSection({ items }: TodayAgendaSectionProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-[20px] border border-line-soft bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{t('today.agenda.title')}</h2>
          <p className="mt-1 font-body text-sm text-ink-2">{t('today.agenda.subtitle')}</p>
        </div>
        <Link
          to="/plan"
          className="font-body text-sm font-semibold text-blue transition-colors hover:text-blue-accent"
        >
          {t('today.agenda.viewPlan')}
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-line-soft px-4 py-3"
          >
            <span
              className={[
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                item.realized
                  ? 'border-success bg-success text-white'
                  : 'border-line bg-white text-transparent',
              ].join(' ')}
              aria-hidden
            >
              {item.realized ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={[
                  'font-body text-sm leading-relaxed',
                  item.realized ? 'text-ink-2 line-through' : 'text-ink',
                ].join(' ')}
              >
                {item.title}
              </p>
              {item.source === 'reflection' ? (
                <span className="mt-1 inline-block rounded-full bg-success/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-success-deep">
                  {t('today.agenda.fromReflection')}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
