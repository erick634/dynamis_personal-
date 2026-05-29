import { useTranslation } from 'react-i18next';

import type { ReflectionSummary } from '@/features/discovery/reflection-summary-api';

type ReflectionSummaryViewProps = {
  summary: ReflectionSummary;
  onDone: () => void;
};

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="font-body text-sm text-ink-2 italic">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 font-body text-sm leading-relaxed text-ink">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReflectionSummaryView({ summary, onDone }: ReflectionSummaryViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t('dailyReflection.summary.title')}
      </h2>

      <section className="mt-8">
        <h3 className="font-body text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">
          {t('dailyReflection.summary.didToday')}
        </h3>
        <BulletList
          items={summary.did_today}
          emptyLabel={t('dailyReflection.summary.emptyDidToday')}
        />
      </section>

      <section className="mt-8">
        <h3 className="font-body text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">
          {t('dailyReflection.summary.planTomorrow')}
        </h3>
        <BulletList
          items={summary.plan_tomorrow}
          emptyLabel={t('dailyReflection.summary.emptyDidToday')}
        />
      </section>

      <div className="mt-8 rounded-[16px] bg-[#0a1733] px-5 py-5 text-white">
        <p className="font-body text-xs font-semibold tracking-wide text-red-warm uppercase">
          {t('discovery.insight.title')}
        </p>
        <blockquote className="mt-3 font-display text-base leading-relaxed text-white/90 italic">
          {summary.celebration}
        </blockquote>
      </div>

      <div className="mt-10">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-blue px-6 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-blue-accent"
        >
          {t('dailyReflection.summary.done')}
        </button>
      </div>
    </div>
  );
}
