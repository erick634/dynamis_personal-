import { useTranslation } from 'react-i18next';

import { MissionCard } from '@/features/today/mission-card';
import { StatStrip } from '@/features/today/stat-strip';
import { TodayGreeting } from '@/features/today/today-greeting';
import { MOCK_TODAY_GAMIFICATION } from '@/features/today/today-gamification-mock';
import { TrailRow } from '@/features/today/trail-row';
import { useTodayDashboard } from '@/features/today/use-today-dashboard';
import { XpCard } from '@/features/today/xp-card';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

export function TodayScreen() {
  const { t } = useTranslation();
  const userId = useDemoUserId();
  const dashboard = useTodayDashboard(userId);
  const mock = MOCK_TODAY_GAMIFICATION;

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:px-6 md:max-w-2xl md:px-8 md:py-8">
      <TodayGreeting
        initial={mock.userInitial}
        title={t('today.greeting.title')}
        subtitle={t('today.greeting.subtitle')}
      />

      <div className="mt-5">
        <StatStrip streakDays={dashboard.streakDays} level={mock.level} />
      </div>

      <section className="mt-6" aria-labelledby="today-missions-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="today-missions-heading" className="font-display text-base font-semibold text-ink">
            {t('today.missionsHead')}
          </h2>
          <button type="button" className="font-body text-xs font-medium text-blue">
            {t('today.seeAll')}
          </button>
        </div>
        <ul className="flex flex-col gap-3">
          {mock.missions.map((mission, index) => (
            <li key={mission.id}>
              <MissionCard mission={mission} index={index} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5">
        <XpCard xpCurrent={mock.xpCurrent} xpToNext={mock.xpToNext} />
      </div>

      <section className="mt-6" aria-labelledby="today-trails-heading">
        <h2
          id="today-trails-heading"
          className="mb-3 font-display text-base font-semibold text-ink"
        >
          {t('today.trailsHead')}
        </h2>
        <ul className="flex flex-col gap-2.5">
          {mock.trails.map((trail) => (
            <li key={trail.id}>
              <TrailRow trail={trail} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
