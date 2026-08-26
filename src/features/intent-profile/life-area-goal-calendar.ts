import { isTaskActiveToday, toDateKey } from '@/features/intent-profile/format-task-schedule';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

export type GoalCalendarOccurrence = {
  dateKey: string;
  taskId: string;
  title: string;
  time: string | null;
  durationMinutes: number | null;
  skipped: boolean;
  completed: boolean;
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekSunday(date: Date): Date {
  const start = startOfLocalDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function goalHorizonEndDate(goal: LifeAreaUserGoal): Date {
  const created = new Date(goal.createdAt);
  const start = Number.isNaN(created.getTime()) ? new Date() : created;
  return new Date(start.getFullYear(), start.getMonth() + goal.horizonMonths, start.getDate());
}

export function goalHorizonStartDate(goal: LifeAreaUserGoal): Date {
  const created = new Date(goal.createdAt);
  return startOfLocalDay(Number.isNaN(created.getTime()) ? new Date() : created);
}

export function isDateInGoalHorizon(goal: LifeAreaUserGoal, date: Date): boolean {
  const day = startOfLocalDay(date);
  const start = goalHorizonStartDate(goal);
  const end = startOfLocalDay(goalHorizonEndDate(goal));
  return day.getTime() >= start.getTime() && day.getTime() <= end.getTime();
}

export function listOccurrencesForRange(
  goal: LifeAreaUserGoal,
  rangeStart: Date,
  rangeEnd: Date,
): GoalCalendarOccurrence[] {
  const occurrences: GoalCalendarOccurrence[] = [];
  let cursor = startOfLocalDay(rangeStart);
  const end = startOfLocalDay(rangeEnd);

  while (cursor.getTime() <= end.getTime()) {
    if (isDateInGoalHorizon(goal, cursor)) {
      const dateKey = toDateKey(cursor);
      for (const task of goal.tasks) {
        if (!isTaskActiveToday(task.schedule, cursor)) continue;
        occurrences.push({
          dateKey,
          taskId: task.id,
          title: task.title,
          time: task.schedule.time,
          durationMinutes: task.durationMinutes,
          skipped: task.skippedDates.includes(dateKey),
          completed: task.completedDates.includes(dateKey),
        });
      }
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

/** All scheduled occurrences across the goal horizon (including skipped). */
export function listHorizonOccurrences(goal: LifeAreaUserGoal): GoalCalendarOccurrence[] {
  return listOccurrencesForRange(goal, goalHorizonStartDate(goal), goalHorizonEndDate(goal));
}

export function occurrencesByDate(
  occurrences: GoalCalendarOccurrence[],
): Map<string, GoalCalendarOccurrence[]> {
  const map = new Map<string, GoalCalendarOccurrence[]>();
  for (const item of occurrences) {
    const existing = map.get(item.dateKey) ?? [];
    existing.push(item);
    map.set(item.dateKey, existing);
  }
  return map;
}

export function buildWeekDays(anchor: Date): Date[] {
  const start = startOfWeekSunday(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function buildMonthGrid(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeekSunday(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
