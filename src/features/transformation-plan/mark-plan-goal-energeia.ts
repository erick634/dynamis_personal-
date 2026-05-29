import {
  applyStreakOnMark,
  getPlanForUser,
  savePlanForUser,
} from '@/features/transformation-plan/plan-storage';
import type { DynamisGoal } from '@/types/energeia';

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

/** Marks a plan goal as realized (Energeia) in localStorage. Returns false if plan or goal missing. */
export function markPlanGoalAsEnergeia(userId: string, goalId: string): boolean {
  const persisted = getPlanForUser(userId);
  if (!persisted) {
    return false;
  }

  if (persisted.realizedIds.includes(goalId)) {
    return true;
  }

  const nextRealizedIds = new Set(persisted.realizedIds);
  nextRealizedIds.add(goalId);
  const nextGoals = syncGoalsWithRealizedIds(persisted.goals, nextRealizedIds);
  const nextStreakData = applyStreakOnMark(persisted.streakData);

  savePlanForUser(userId, {
    ...persisted,
    goals: nextGoals,
    realizedIds: Array.from(nextRealizedIds),
    streakData: nextStreakData,
  });

  return true;
}
