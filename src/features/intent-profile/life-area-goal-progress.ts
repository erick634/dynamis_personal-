import { listHorizonOccurrences } from '@/features/intent-profile/life-area-goal-calendar';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

export type GoalOccurrenceProgress = {
  completed: number;
  total: number;
  percent: number;
};

/**
 * Progress over the goal horizon: completed sessions / required sessions.
 * Skipped days are excluded from both counts.
 */
export function getGoalOccurrenceProgress(goal: LifeAreaUserGoal): GoalOccurrenceProgress {
  const required = listHorizonOccurrences(goal).filter((item) => !item.skipped);
  const total = required.length;
  if (goal.completedAt) {
    const completed = required.filter((item) => item.completed).length;
    return {
      completed: total > 0 ? total : completed,
      total,
      percent: 100,
    };
  }
  if (total === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }
  const completed = required.filter((item) => item.completed).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function goalProgressPercent(goal: LifeAreaUserGoal): number {
  return getGoalOccurrenceProgress(goal).percent;
}

export function isGoalComplete(goal: LifeAreaUserGoal): boolean {
  if (goal.completedAt) return true;
  const { completed, total } = getGoalOccurrenceProgress(goal);
  return total > 0 && completed === total;
}

export function countCompletedOccurrences(goal: LifeAreaUserGoal): number {
  return getGoalOccurrenceProgress(goal).completed;
}

export function countRequiredOccurrences(goal: LifeAreaUserGoal): number {
  return getGoalOccurrenceProgress(goal).total;
}

/** Average occurrence progress across goals in one life area; null if none. */
export function averageAreaGoalProgress(goals: LifeAreaUserGoal[]): number | null {
  if (goals.length === 0) return null;
  const sum = goals.reduce((acc, goal) => acc + goalProgressPercent(goal), 0);
  return Math.round(sum / goals.length);
}

export type AreaScoreBreakdownItem = {
  goalId: string;
  title: string;
  percent: number;
  completed: number;
  total: number;
  /** Points this goal adds to the area average (percent / goal count). */
  contribution: number;
};

export type AreaScoreBreakdown = {
  areaPercent: number;
  items: AreaScoreBreakdownItem[];
};

/** How each goal feeds the area score (simple average of goal percents). */
export function buildAreaScoreBreakdown(goals: LifeAreaUserGoal[]): AreaScoreBreakdown | null {
  if (goals.length === 0) return null;
  const count = goals.length;
  const items = goals.map((goal) => {
    const progress = getGoalOccurrenceProgress(goal);
    return {
      goalId: goal.id,
      title: goal.title,
      percent: progress.percent,
      completed: progress.completed,
      total: progress.total,
      contribution: progress.percent / count,
    };
  });
  const areaPercent = Math.round(items.reduce((sum, item) => sum + item.contribution, 0));
  return { areaPercent, items };
}
