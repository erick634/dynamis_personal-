import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { markPlanGoalAsEnergeia } from '@/features/transformation-plan/mark-plan-goal-energeia';
import { buildTodayDashboard, type TodayDashboardSnapshot } from '@/features/today/today-dashboard';
import { MOCK_TODAY_COUNCIL } from '@/features/today/council-mock';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { getTodayCouncil } from '@/services/council.service';

const EMPTY_SNAPSHOT: TodayDashboardSnapshot = {
  streakDays: 0,
  weeklyEnergeia: { realized: 0, total: 1 },
  reflectionDoneToday: false,
  reflectionItemCount: 0,
  nudge: {
    kind: 'fallback',
    title: '',
    subtitle: '',
    primaryTo: '/plan',
    primaryLabelKey: 'today.nudge.fallback.primaryCta',
    secondaryTo: '/map',
    secondaryLabelKey: 'today.nudge.secondaryCta',
    sourceLabelKey: 'today.nudge.source.fallback',
  },
  agendaItems: [],
  councilHint: null,
};

export function useTodayDashboard(userId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { profile } = useIntentProfile();
  const [snapshot, setSnapshot] = useState<TodayDashboardSnapshot>(EMPTY_SNAPSHOT);

  const { data: council = MOCK_TODAY_COUNCIL } = useQuery({
    queryKey: ['council-today', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return getTodayCouncil(userId);
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const refresh = useCallback(() => {
    if (!userId) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }
    setSnapshot(
      buildTodayDashboard(userId, t, {
        profile,
        councilAgents: council.agents,
      }),
    );
  }, [userId, t, profile, council.agents]);

  useEffect(() => {
    refresh();
  }, [refresh, i18n.language]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const onFocus = () => {
      refresh();
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key?.startsWith('dynamis.plan.') ||
        event.key?.startsWith('dynamis.reflection.didToday.')
      ) {
        refresh();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [userId, refresh]);

  const markNudgeGoalEnergeia = useCallback(() => {
    const goalId = snapshot.nudge.focusGoalId;
    if (!userId || !goalId || snapshot.nudge.focusGoalRealized) {
      return false;
    }
    const ok = markPlanGoalAsEnergeia(userId, goalId);
    if (ok) {
      refresh();
    }
    return ok;
  }, [refresh, snapshot.nudge.focusGoalId, snapshot.nudge.focusGoalRealized, userId]);

  const canMarkNudgeEnergeia = Boolean(
    snapshot.nudge.focusGoalId && !snapshot.nudge.focusGoalRealized,
  );

  const councilAgents = useMemo(() => {
    if (!snapshot.councilHint) {
      return council.agents;
    }
    return council.agents.map((agent) =>
      agent.id === 'dynamis' ? { ...agent, hint: snapshot.councilHint ?? undefined } : agent,
    );
  }, [council.agents, snapshot.councilHint]);

  return {
    ...snapshot,
    councilAgents,
    refresh,
    markNudgeGoalEnergeia,
    canMarkNudgeEnergeia,
  };
}
