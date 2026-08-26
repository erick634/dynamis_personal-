import { toDateKey } from '@/features/intent-profile/format-task-schedule';
import { listHorizonOccurrences } from '@/features/intent-profile/life-area-goal-calendar';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

export const GROWING_GOAL_STATUSES = ['new', 'behind', 'partial', 'onTrack'] as const;

export type GrowingGoalStatus = (typeof GROWING_GOAL_STATUSES)[number];

/**
 * Traffic-light status for "What's growing" pills.
 * - new: created today, or nothing was due before today
 * - behind: overdue past sessions, or no session completed yet
 * - partial: some progress, no past overdue, but today still open
 * - onTrack: all past (and today) required sessions done or skipped
 */
export function resolveGrowingGoalStatus(
  goal: LifeAreaUserGoal,
  now: Date = new Date(),
): GrowingGoalStatus {
  if (goal.completedAt) return 'onTrack';

  const todayKey = toDateKey(now);
  const createdKey = toDateKey(
    Number.isNaN(new Date(goal.createdAt).getTime()) ? now : new Date(goal.createdAt),
  );
  const occurrences = listHorizonOccurrences(goal).filter((item) => !item.skipped);
  const past = occurrences.filter((item) => item.dateKey < todayKey);
  const today = occurrences.filter((item) => item.dateKey === todayKey);
  const pastMissed = past.filter((item) => !item.completed);
  const todayMissed = today.filter((item) => !item.completed);
  const hasAnyCompletion = occurrences.some((item) => item.completed);
  const isNew = createdKey === todayKey || past.length === 0;

  if (isNew && pastMissed.length === 0 && !hasAnyCompletion) {
    return 'new';
  }

  if (pastMissed.length > 0 || !hasAnyCompletion) {
    return 'behind';
  }

  if (todayMissed.length > 0) {
    return 'partial';
  }

  return 'onTrack';
}

export const GROWING_GOAL_STATUS_CLASS: Record<GrowingGoalStatus, string> = {
  new: 'bg-blue-soft/80 text-blue hover:bg-blue-soft',
  behind: 'bg-red/15 text-red hover:bg-red/25',
  partial: 'bg-gold-soft text-gold hover:bg-gold-soft/80',
  onTrack: 'bg-moss-soft text-success-deep hover:bg-moss-soft/80',
};
