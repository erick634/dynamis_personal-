import {
  calculateDisplayStreak,
  createEmptyStreakData,
  getPlanForUser,
  getTodayKey,
  type StreakData,
} from '@/features/transformation-plan/plan-storage';
import { getReflectionDidToday } from '@/features/transformation-plan/reflection-today-storage';
import { MOCK_PLAN_GOALS } from '@/features/transformation-plan/transformation-plan-mock';
import type { IntentProfile } from '@/features/you/intent-profile-types';
import type { CouncilAgent } from '@/types/council';
import type { DynamisGoal } from '@/types/energeia';
import type { TFunction } from 'i18next';

export type TodayNudgeKind =
  | 'todayTask'
  | 'upcomingTask'
  | 'profileFocus'
  | 'council'
  | 'reflection'
  | 'fallback';

export type TodayNudge = {
  kind: TodayNudgeKind;
  title: string;
  subtitle: string;
  primaryTo: string;
  primaryLabelKey: string;
  secondaryTo: string;
  secondaryLabelKey: string;
  sourceLabelKey: string;
  focusGoalId?: string;
  focusGoalRealized?: boolean;
  councilAgentId?: CouncilAgent['id'];
};

export type TodayAgendaItem = {
  id: string;
  title: string;
  realized: boolean;
  source: 'plan' | 'reflection';
};

export type TodayDashboardSnapshot = {
  streakDays: number;
  weeklyEnergeia: { realized: number; total: number };
  reflectionDoneToday: boolean;
  reflectionItemCount: number;
  nudge: TodayNudge;
  agendaItems: TodayAgendaItem[];
  councilHint: string | null;
};

export type BuildTodayDashboardOptions = {
  profile?: IntentProfile | null;
  councilAgents?: CouncilAgent[];
};

function buildInitialRealizedIds(goals: DynamisGoal[]): Set<string> {
  return new Set(goals.filter((goal) => goal.realized).map((goal) => goal.id));
}

function syncGoalsWithRealizedIds(goals: DynamisGoal[], realizedIds: Set<string>): DynamisGoal[] {
  return goals.map((goal) => {
    const realized = realizedIds.has(goal.id);
    return {
      ...goal,
      realized,
      realizedAt: realized ? (goal.realizedAt ?? new Date().toISOString()) : null,
    };
  });
}

function loadPlanState(userId: string): {
  goals: DynamisGoal[];
  realizedIds: Set<string>;
  streakData: StreakData;
} {
  const persisted = getPlanForUser(userId);
  if (persisted) {
    const realizedIds = new Set(persisted.realizedIds);
    return {
      goals: syncGoalsWithRealizedIds(persisted.goals, realizedIds),
      realizedIds,
      streakData: persisted.streakData,
    };
  }

  const realizedIds = buildInitialRealizedIds(MOCK_PLAN_GOALS);
  return {
    goals: syncGoalsWithRealizedIds(MOCK_PLAN_GOALS, realizedIds),
    realizedIds,
    streakData: createEmptyStreakData(),
  };
}

export function resolveGoalTitle(goal: DynamisGoal, t: TFunction): string {
  if (goal.title?.trim()) {
    return goal.title.trim();
  }
  return t(`transformationPlan.items.${goal.id}.title`);
}

function getMondayOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isIsoInCurrentWeek(iso: string | null): boolean {
  if (!iso) {
    return false;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const weekStart = getMondayOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return parsed >= weekStart && parsed < weekEnd;
}

function countWeeklyEnergeia(
  goals: DynamisGoal[],
  realizedIds: Set<string>,
  reflectionCount: number,
): { realized: number; total: number } {
  const total = Math.max(goals.length, 1);
  let realized = reflectionCount;

  for (const goal of goals) {
    if (!realizedIds.has(goal.id)) {
      continue;
    }
    if (isIsoInCurrentWeek(goal.realizedAt)) {
      realized += 1;
    }
  }

  return { realized: Math.min(realized, total), total };
}

function pickTodayFocusGoal(goals: DynamisGoal[], realizedIds: Set<string>): DynamisGoal | null {
  const todayGoals = goals.filter((goal) => goal.dueLabelKey === 'todayAt');
  const open = todayGoals.filter((goal) => !realizedIds.has(goal.id));
  if (open.length === 0) {
    return null;
  }
  return open.find((goal) => goal.priority === 'high') ?? open[0] ?? null;
}

function pickUpcomingFocusGoal(goals: DynamisGoal[], realizedIds: Set<string>): DynamisGoal | null {
  const upcoming = goals.filter(
    (goal) =>
      goal.dueLabelKey != null && goal.dueLabelKey !== 'todayAt' && !realizedIds.has(goal.id),
  );
  if (upcoming.length === 0) {
    return null;
  }
  return upcoming.find((goal) => goal.priority === 'high') ?? upcoming[0] ?? null;
}

function pickCouncilLeadAgent(agents: CouncilAgent[] | undefined): CouncilAgent | null {
  if (!agents?.length) {
    return null;
  }
  return agents.find((agent) => agent.id === 'dynamis') ?? agents[0] ?? null;
}

function scheduleLabel(goal: DynamisGoal, t: TFunction): string | null {
  if (!goal.dueLabelKey) {
    return null;
  }
  return t(`transformationPlan.schedule.${goal.dueLabelKey}`);
}

function buildNudgeForGoal(
  t: TFunction,
  goal: DynamisGoal,
  realizedIds: Set<string>,
  kind: 'todayTask' | 'upcomingTask',
): TodayNudge {
  const taskTitle = resolveGoalTitle(goal, t);
  const realized = realizedIds.has(goal.id);
  const schedule = scheduleLabel(goal, t);
  const isResearch = goal.tag === 'research';

  const titleKey =
    kind === 'todayTask' ? 'today.nudge.todayTask.title' : 'today.nudge.upcomingTask.title';
  const subtitleKey =
    kind === 'todayTask' ? 'today.nudge.todayTask.subtitle' : 'today.nudge.upcomingTask.subtitle';

  return {
    kind,
    title: t(titleKey, { taskTitle }),
    subtitle: t(subtitleKey, { schedule: schedule ?? t('transformationPlan.schedule.tomorrow') }),
    primaryTo: '/plan?filter=today',
    primaryLabelKey: 'today.nudge.todayTask.primaryCta',
    secondaryTo: isResearch ? '/guide' : '/map',
    secondaryLabelKey: isResearch
      ? 'today.nudge.todayTask.secondaryDiscovery'
      : 'today.nudge.secondaryCta',
    sourceLabelKey: 'today.nudge.source.plan',
    focusGoalId: goal.id,
    focusGoalRealized: realized,
  };
}

function buildNudge(
  t: TFunction,
  focusGoal: DynamisGoal | null,
  upcomingGoal: DynamisGoal | null,
  realizedIds: Set<string>,
  reflectionDoneToday: boolean,
  profile: IntentProfile | null | undefined,
  councilAgent: CouncilAgent | null,
): TodayNudge {
  if (focusGoal) {
    return buildNudgeForGoal(t, focusGoal, realizedIds, 'todayTask');
  }

  if (upcomingGoal) {
    return buildNudgeForGoal(t, upcomingGoal, realizedIds, 'upcomingTask');
  }

  const activeFocus = profile?.activeFocus?.trim();
  if (activeFocus) {
    const snippet = activeFocus.length > 100 ? `${activeFocus.slice(0, 99)}…` : activeFocus;
    return {
      kind: 'profileFocus',
      title: t('today.nudge.profileFocus.title'),
      subtitle: t('today.nudge.profileFocus.subtitle', { focus: snippet }),
      primaryTo: '/guide',
      primaryLabelKey: 'today.nudge.profileFocus.primaryCta',
      secondaryTo: '/plan',
      secondaryLabelKey: 'today.nudge.profileFocus.secondaryCta',
      sourceLabelKey: 'today.nudge.source.profile',
    };
  }

  if (councilAgent) {
    const hint = councilAgent.hint?.trim() || t(`council.agents.${councilAgent.id}.status`);
    const agentName = t(`council.agents.${councilAgent.id}.name`);
    return {
      kind: 'council',
      title: t('today.nudge.council.title', { agentName }),
      subtitle: hint,
      primaryTo: '/guide',
      primaryLabelKey: 'today.nudge.council.primaryCta',
      secondaryTo: '/plan',
      secondaryLabelKey: 'today.nudge.council.secondaryCta',
      sourceLabelKey: 'today.nudge.source.council',
      councilAgentId: councilAgent.id,
    };
  }

  if (!reflectionDoneToday) {
    return {
      kind: 'reflection',
      title: t('today.nudge.reflection.title'),
      subtitle: t('today.nudge.reflection.subtitle'),
      primaryTo: '/guide?mode=reflection',
      primaryLabelKey: 'today.nudge.reflection.primaryCta',
      secondaryTo: '/plan',
      secondaryLabelKey: 'today.nudge.reflection.secondaryCta',
      sourceLabelKey: 'today.nudge.source.reflection',
    };
  }

  return {
    kind: 'fallback',
    title: t('today.nudge.fallback.title'),
    subtitle: t('today.nudge.fallback.subtitle'),
    primaryTo: '/plan',
    primaryLabelKey: 'today.nudge.fallback.primaryCta',
    secondaryTo: '/map',
    secondaryLabelKey: 'today.nudge.secondaryCta',
    sourceLabelKey: 'today.nudge.source.fallback',
  };
}

function buildAgendaItems(
  goals: DynamisGoal[],
  realizedIds: Set<string>,
  reflectionItems: string[],
  t: TFunction,
): TodayAgendaItem[] {
  const reflectionEntries: TodayAgendaItem[] = reflectionItems.map((title, index) => ({
    id: `reflection-${getTodayKey()}-${String(index)}`,
    title,
    realized: true,
    source: 'reflection',
  }));

  const planToday = goals
    .filter((goal) => goal.dueLabelKey === 'todayAt')
    .map((goal) => ({
      id: goal.id,
      title: resolveGoalTitle(goal, t),
      realized: realizedIds.has(goal.id),
      source: 'plan' as const,
    }));

  return [...reflectionEntries, ...planToday];
}

export function buildTodayDashboard(
  userId: string,
  t: TFunction,
  options: BuildTodayDashboardOptions = {},
): TodayDashboardSnapshot {
  const { profile = null, councilAgents = [] } = options;
  const { goals, realizedIds, streakData } = loadPlanState(userId);
  const reflectionItems = getReflectionDidToday(userId);
  const reflectionDoneToday = reflectionItems.length > 0;
  const focusGoal = pickTodayFocusGoal(goals, realizedIds);
  const upcomingGoal = pickUpcomingFocusGoal(goals, realizedIds);
  const councilAgent = pickCouncilLeadAgent(councilAgents);

  const nudge = buildNudge(
    t,
    focusGoal,
    upcomingGoal,
    realizedIds,
    reflectionDoneToday,
    profile,
    councilAgent,
  );

  const councilHint =
    focusGoal != null
      ? t('today.council.hints.todayTask', { taskTitle: resolveGoalTitle(focusGoal, t) })
      : nudge.kind === 'council' && councilAgent
        ? (councilAgent.hint ?? t(`council.agents.${councilAgent.id}.status`))
        : reflectionDoneToday
          ? t('today.council.hints.reflectionDone')
          : null;

  return {
    streakDays: calculateDisplayStreak(streakData),
    weeklyEnergeia: countWeeklyEnergeia(goals, realizedIds, reflectionItems.length),
    reflectionDoneToday,
    reflectionItemCount: reflectionItems.length,
    nudge,
    agendaItems: buildAgendaItems(goals, realizedIds, reflectionItems, t),
    councilHint,
  };
}
