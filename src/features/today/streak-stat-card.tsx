import { useTranslation } from 'react-i18next';

type StreakStatCardProps = {
  streakDays: number;
};

export function StreakStatCard({ streakDays }: StreakStatCardProps) {
  const { t } = useTranslation();
  const subtitleKey = streakDays === 0 ? 'today.stats.streakZero' : 'today.stats.streakActive';

  return (
    <article className="rounded-[20px] border border-line-soft bg-white p-6 shadow-card">
      <p className="font-display text-4xl font-semibold tabular-nums text-red-deep">
        <span aria-hidden>🔥 </span>
        {streakDays}
      </p>
      <p className="mt-2 font-body text-sm text-ink-2">{t(subtitleKey)}</p>
    </article>
  );
}
