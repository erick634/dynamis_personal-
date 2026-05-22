import { useTranslation } from 'react-i18next';

type WeeklyStatCardProps = {
  realized: number;
  total: number;
};

export function WeeklyStatCard({ realized, total }: WeeklyStatCardProps) {
  const { t } = useTranslation();

  return (
    <article className="rounded-[20px] border border-line-soft bg-white p-6 shadow-card">
      <p className="font-body text-xs font-semibold tracking-wide text-blue uppercase">
        {t('today.stats.energeiaEyebrow')}
      </p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums text-blue">
        {realized} / {total}
      </p>
      <p className="mt-2 font-body text-sm text-ink-2">{t('today.stats.energeiaSubtitle')}</p>
    </article>
  );
}
