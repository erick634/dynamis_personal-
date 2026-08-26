import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';

export const TASK_CADENCES = ['daily', 'weekly', 'monthly'] as const;

export type TaskCadence = (typeof TASK_CADENCES)[number];

/** 0 = Sunday … 6 = Saturday (JS Date convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const GOAL_HORIZON_MONTHS = [1, 3, 6, 12] as const;

export type GoalHorizonMonths = (typeof GOAL_HORIZON_MONTHS)[number];

export const GOAL_PRIORITIES = ['essential', 'moreImportant', 'lessImportant'] as const;

export type GoalPriority = (typeof GOAL_PRIORITIES)[number];

export const DEFAULT_GOAL_PRIORITY: GoalPriority = 'moreImportant';

export type DailySchedule = {
  cadence: 'daily';
  time: string | null;
  /** When false, Mon–Fri only. */
  includeWeekends: boolean;
};

export type WeeklySchedule = {
  cadence: 'weekly';
  weekday: Weekday;
  time: string | null;
};

export type MonthlySchedule = {
  cadence: 'monthly';
  dayOfMonth: number;
  time: string | null;
};

export type TaskSchedule = DailySchedule | WeeklySchedule | MonthlySchedule;

export type LifeAreaGoalTask = {
  id: string;
  title: string;
  schedule: TaskSchedule;
  /** How long one session lasts; null = not set. */
  durationMinutes: number | null;
  priority: GoalPriority;
  /** YYYY-MM-DD dates completed for this recurrence. */
  completedDates: string[];
  /** YYYY-MM-DD dates skipped for this recurrence (this day only). */
  skippedDates: string[];
};

export type LifeAreaUserGoal = {
  id: string;
  areaId: LifeAreaId;
  title: string;
  /** How long the goal runs — daily tasks repeat across this horizon. */
  horizonMonths: GoalHorizonMonths;
  priority: GoalPriority;
  tasks: LifeAreaGoalTask[];
  createdAt: string;
  /** ISO timestamp when the user marked the goal complete; null if still open. */
  completedAt: string | null;
};

export type GoalDraftTask = {
  localId: string;
  title: string;
  schedule: TaskSchedule;
  durationMinutes: number | null;
  priority: GoalPriority;
};

export type GoalTaskInput = {
  title: string;
  schedule: TaskSchedule;
  durationMinutes: number | null;
  priority: GoalPriority;
};
