import { useTranslation } from 'react-i18next';

import { DailyReflectionCard } from '@/features/daily-reflection/daily-reflection-card';
import { EndTheDayButton } from '@/features/daily-reflection/end-the-day-button';
import { CouncilSection } from '@/features/today/council-section';
import { ProactiveNudgeCard } from '@/features/today/proactive-nudge-card';
import { StreakStatCard } from '@/features/today/streak-stat-card';
import { TodayAgendaSection } from '@/features/today/today-agenda-section';
import { useTodayDashboard } from '@/features/today/use-today-dashboard';
import { WeeklyStatCard } from '@/features/today/weekly-stat-card';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

export function TodayScreen() {
  const { t } = useTranslation();
  const userId = useDemoUserId();
  const dashboard = useTodayDashboard(userId);

  return (
    <div className="px-4 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
            {t('today.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-ink">
            {t('today.title')}
          </h1>
          <p className="mt-2 font-body text-sm text-ink-2">{t('today.endTheDayHint')}</p>
        </div>
        <EndTheDayButton className="self-start" />
      </header>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
        <ProactiveNudgeCard
          nudge={dashboard.nudge}
          canMarkEnergeia={dashboard.canMarkNudgeEnergeia}
          onMarkEnergeia={dashboard.markNudgeGoalEnergeia}
        />
        <div className="flex flex-col gap-5">
          <StreakStatCard streakDays={dashboard.streakDays} />
          <WeeklyStatCard
            realized={dashboard.weeklyEnergeia.realized}
            total={dashboard.weeklyEnergeia.total}
          />
        </div>
      </div>

      <TodayAgendaSection items={dashboard.agendaItems} />

      <div className="mt-6">
        <DailyReflectionCard
          completedToday={dashboard.reflectionDoneToday}
          itemCount={dashboard.reflectionItemCount}
        />
      </div>

      <CouncilSection agents={dashboard.councilAgents} />
    </div>
  );
}
