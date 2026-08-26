import type { TFunction } from 'i18next';

import {
  DEFAULT_GOAL_PRIORITY,
  GOAL_PRIORITIES,
  type GoalPriority,
} from '@/features/intent-profile/life-area-goals-types';

export function isGoalPriority(value: unknown): value is GoalPriority {
  return typeof value === 'string' && (GOAL_PRIORITIES as readonly string[]).includes(value);
}

export function parseGoalPriority(value: unknown): GoalPriority {
  return isGoalPriority(value) ? value : DEFAULT_GOAL_PRIORITY;
}

export function nextGoalPriority(current: GoalPriority): GoalPriority {
  const index = GOAL_PRIORITIES.indexOf(current);
  return GOAL_PRIORITIES[(index + 1) % GOAL_PRIORITIES.length] ?? DEFAULT_GOAL_PRIORITY;
}

export function goalPriorityLabel(priority: GoalPriority, t: TFunction): string {
  return t(`you.lifeArea.goals.priority.${priority}`);
}

export const GOAL_PRIORITY_CLASS: Record<GoalPriority, string> = {
  essential: 'bg-red/15 text-red',
  moreImportant: 'bg-blue-soft/80 text-blue',
  lessImportant: 'bg-bg-deep-cream text-ink-3',
};
