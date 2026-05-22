import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { DailyReflectionCard } from '@/features/daily-reflection/daily-reflection-card';
import { CouncilSection } from '@/features/today/council-section';
import { MOCK_TODAY_COUNCIL } from '@/features/today/council-mock';
import { ProactiveNudgeCard } from '@/features/today/proactive-nudge-card';
import { StreakStatCard } from '@/features/today/streak-stat-card';
import { WeeklyStatCard } from '@/features/today/weekly-stat-card';
import { useDemoUserId } from '@/hooks/use-demo-user-id';
import { getTodayCouncil } from '@/services/council.service';

const STREAK_DAYS = 12;
const ENERGEIA_REALIZED = 3;
const ENERGEIA_TOTAL = 5;

export function TodayScreen() {
  const { t } = useTranslation();
  const userId = useDemoUserId();

  const { data: council = MOCK_TODAY_COUNCIL } = useQuery({
    queryKey: ['council-today', userId],
    queryFn: () => getTodayCouncil(userId),
  });

  return (
    <div className="px-4 py-8 md:px-8 md:py-10">
      <header className="max-w-4xl">
        <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
          {t('today.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-ink">
          {t('today.title')}
        </h1>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <ProactiveNudgeCard />
        <div className="flex flex-col gap-5">
          <StreakStatCard streakDays={STREAK_DAYS} />
          <WeeklyStatCard realized={ENERGEIA_REALIZED} total={ENERGEIA_TOTAL} />
        </div>
      </div>

      <div className="mt-6">
        <DailyReflectionCard />
      </div>

      <CouncilSection agents={council.agents} />
    </div>
  );
}
